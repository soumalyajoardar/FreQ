// JioSaavn fallback provider (secondary catalog + direct high-bitrate stream).
//
// FreQ's primary catalog is the FreQ cloud API (YouTube Music). When that is
// down, rate-limited, or simply cannot resolve a track, this module talks to
// JioSaavn instead — the service behind `sumitkolhe/jiosaavn-api`.
//
// Two layers, reliable first:
//   1. JioSaavn's own endpoint through the main process (`saavn-search` /
//      `saavn-stream`). Main-process fetch skips CORS and Node's crypto
//      decrypts the DES-encoded media URL, so this works with no third party.
//   2. Public deployments of `sumitkolhe/jiosaavn-api`, which return already
//      decrypted `downloadUrl` links. Community instances come and go, so they
//      are the backup rather than the backbone.
//
// Nothing here throws: a failed lookup returns null/[] and the caller keeps its
// existing "unavailable" behaviour.

import { MediaTrack } from '../types';

/** Public deployments of sumitkolhe/jiosaavn-api, tried in order. */
const INSTANCES = ['https://saavn.sumit.co', 'https://saavn.dev'];

/** A dead mirror must never delay playback. */
const TIMEOUT_MS = 3500;
let preferredIndex = 0;

async function fetchJson(path: string): Promise<any | null> {
  const order = [preferredIndex];
  for (let i = 0; i < INSTANCES.length; i++) {
    if (i !== preferredIndex) order.push(i);
  }

  for (const index of order) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${INSTANCES[index]}${path}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json();
      if (!data) continue;
      preferredIndex = index;
      return data;
    } catch {
      clearTimeout(timer);
    }
  }
  return null;
}

interface SaavnLink {
  quality?: string;
  link?: string;
}

function qualityValue(quality: string | undefined): number {
  const parsed = parseInt(String(quality || '').replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Highest-bitrate `downloadUrl` entry (320 kbps on most songs). */
function bestAudioLink(list: unknown): string | null {
  if (!Array.isArray(list)) return null;
  const usable = (list as SaavnLink[])
    .filter(entry => entry && typeof entry.link === 'string' && entry.link.startsWith('https://'))
    .map(entry => ({ link: entry.link as string, q: qualityValue(entry.quality) }))
    .sort((a, b) => b.q - a.q);
  return usable[0]?.link ?? null;
}

function bestImageLink(list: unknown): string | null {
  if (!Array.isArray(list)) return null;
  const usable = (list as SaavnLink[])
    .filter(entry => entry && typeof entry.link === 'string' && entry.link.startsWith('https://'))
    .map(entry => ({ link: entry.link as string, size: qualityValue(entry.quality) }))
    .sort((a, b) => b.size - a.size);
  return usable[0]?.link ?? null;
}

function artistNames(value: any): string {
  const primary = value?.artists?.primary;
  if (Array.isArray(primary) && primary.length > 0) {
    return primary
      .map((a: any) => (typeof a?.name === 'string' ? a.name : ''))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof value?.primaryArtists === 'string' && value.primaryArtists.trim()) {
    return value.primaryArtists.replace(/\s*,\s*/g, ', ');
  }
  return 'Unknown artist';
}

function decodeEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/** Normalises the hosted API shape (`name`/`album`/`downloadUrl`). */
function toTrack(raw: any): MediaTrack | null {
  if (!raw) return null;
  const id = typeof raw.id === 'string' ? raw.id : '';
  const title = decodeEntities(typeof raw.name === 'string' ? raw.name : raw.title || '');
  if (!id || !title) return null;

  const album = raw.album;
  const albumName = typeof album === 'string'
    ? decodeEntities(album)
    : typeof album?.name === 'string'
      ? decodeEntities(album.name)
      : '';

  const duration = Number(raw.duration) || 0;

  return {
    id: `saavn:${id}`,
    title,
    artist: decodeEntities(artistNames(raw)),
    album: albumName,
    durationSeconds: duration > 0 ? Math.round(duration) : 0,
    artworkUrl: bestImageLink(raw.image) || (typeof raw.image === 'string' ? raw.image : null),
    // Direct, no-expiry stream: the resolver treats this as an immediate source.
    mediaUri: bestAudioLink(raw.downloadUrl) || (typeof raw.downloadUrl === 'string' ? raw.downloadUrl : null),
    provider: 'jiosaavn',
  };
}

function fromHostedSearch(data: any): MediaTrack[] {
  const results = data?.data?.results ?? data?.results ?? data?.data ?? [];
  if (!Array.isArray(results)) return [];
  return results.map(toTrack).filter((t): t is MediaTrack => !!t);
}

/** Shape returned by the main-process bridge (`saavn-search`). */
function fromDirect(raw: any): MediaTrack | null {
  if (!raw || typeof raw.id !== 'string' || typeof raw.title !== 'string') return null;
  const mediaUri =
    typeof raw.mediaUri === 'string' && raw.mediaUri.startsWith('https://') ? raw.mediaUri : null;
  return {
    id: `saavn:${raw.id}`,
    title: decodeEntities(raw.title),
    artist: decodeEntities(typeof raw.artist === 'string' && raw.artist.trim() ? raw.artist : 'Unknown artist'),
    album: decodeEntities(typeof raw.album === 'string' ? raw.album : ''),
    durationSeconds: Number(raw.durationSeconds) || 0,
    artworkUrl: typeof raw.artworkUrl === 'string' ? raw.artworkUrl : null,
    mediaUri,
    provider: 'jiosaavn',
  };
}

class JioSaavnService {
  /** Search songs. Returns [] when every layer is unreachable. */
  async search(query: string, limit = 20): Promise<MediaTrack[]> {
    const trimmed = (query || '').trim();
    if (trimmed.length < 2) return [];
    const capped = Math.min(Math.max(limit, 1), 50);

    // 1. Direct endpoint (main process) — fastest and never third-party.
    try {
      const direct = await window.electronAPI?.saavnSearch?.(trimmed, capped);
      if (Array.isArray(direct) && direct.length > 0) {
        return direct.map(fromDirect).filter((t): t is MediaTrack => !!t);
      }
    } catch {
      // Fall through to the hosted mirrors.
    }

    // 2. Public deployments of jiosaavn-api.
    const hosted = await fetchJson(`/api/search/songs?query=${encodeURIComponent(trimmed)}&limit=${capped}`);
    return hosted ? fromHostedSearch(hosted) : [];
  }

  /** Direct stream for one Saavn song id (the part after `saavn:`). */
  async streamForId(songId: string): Promise<string | null> {
    if (!songId) return null;

    try {
      const direct = await window.electronAPI?.saavnStream?.(songId);
      if (typeof direct === 'string' && direct.startsWith('https://')) return direct;
    } catch {
      // Fall through to the hosted mirrors.
    }

    const hosted = await fetchJson(`/api/songs/${encodeURIComponent(songId)}`);
    const list = hosted?.data?.songs ?? hosted?.data ?? hosted?.songs ?? hosted;
    const song = Array.isArray(list) ? list[0] : list;
    return bestAudioLink(song?.downloadUrl) || (typeof song?.downloadUrl === 'string' ? song.downloadUrl : null);
  }

  /** Last-resort stream lookup by title/artist (used when yt-dlp fails). */
  async resolveStreamByTitle(title: string, artist?: string): Promise<string | null> {
    const cleanTitle = (title || '').split('(')[0].split('[')[0].trim();
    if (cleanTitle.length < 2) return null;
    const query = artist ? `${cleanTitle} ${artist.split(',')[0]}` : cleanTitle;
    const songs = await this.search(query, 5);
    const match = songs.find(song => song.mediaUri) ?? songs[0];
    if (!match) return null;
    if (match.mediaUri) return match.mediaUri;
    // A hosted result may omit the link; ask for it by id.
    return this.streamForId(match.id.replace(/^saavn:/, ''));
  }

  /** Which layer answered last — handy for diagnostics. */
  get instance(): string {
    return preferredIndex >= 0 ? INSTANCES[preferredIndex] : 'direct:jiosaavn.com';
  }
}

export const jioSaavnService = new JioSaavnService();
