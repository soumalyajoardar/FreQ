import { AlbumDetails, ArtistDetails, CatalogItem, CatalogSection, MediaTrack } from '../types';
import { regionDef } from './regions';
import { jioSaavnService } from './jiosaavn';

const BASE_URL = 'https://freq-api.vercel.app';

// Upgrades YouTube / Google thumbnails to 544x544 or maxres
export function upgradeArtworkUrl(url: string | null | undefined, videoId?: string): string | null {
  if (!url || url === 'null') {
    if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      // mqdefault is bar-less 16:9 (hqdefault bakes black bars for widescreen).
      return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
    }
    return null;
  }

  try {
    if (url.includes('googleusercontent.com') || url.includes('ggpht.com')) {
      const sizeRegex = /=(?:w\d+-h\d+|s\d+)(-[^=]+)?$/;
      if (sizeRegex.test(url)) {
        return url.replace(sizeRegex, '=w544-h544-l90-rj');
      } else if (!url.includes('=')) {
        return `${url}=w544-h544-l90-rj`;
      }
    }
    // NOTE: i.ytimg.com URLs are left untouched — rewriting hqdefault to
    // hq720 breaks videos without an HD thumbnail (blank artwork).
  } catch (_e) {
    // Keep original
  }
  return url;
}

// Picks the most reliable thumbnail from a raw list: largest width when
// known, otherwise the last entry (YTM orders smallest-first).
export function pickBestThumbnail(list: any): string | null {
  if (!Array.isArray(list) || list.length === 0) return null;
  const withUrl = list.filter((t: any) => t && typeof t.url === 'string' && t.url);
  if (withUrl.length === 0) return null;
  const withWidth = withUrl.filter((t: any) => typeof t.width === 'number');
  if (withWidth.length > 0) {
    return withWidth.reduce((a: any, b: any) => (b.width > a.width ? b : a)).url;
  }
  return withUrl[withUrl.length - 1].url;
}

export function parseDurationToSeconds(val: any): number {
  if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
    if (val > 10000 && val % 1000 === 0) return Math.round(val / 1000);
    return Math.round(val);
  }
  if (typeof val === 'string') {
    const s = val.trim();
    if (!s) return 0;
    // Format "PT3M14S" or "PT4M30S" (ISO 8601)
    if (s.startsWith('PT') || s.startsWith('pt')) {
      const m = s.match(/(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
      if (m) {
        const h = parseInt(m[1] || '0', 10);
        const min = parseInt(m[2] || '0', 10);
        const sec = parseInt(m[3] || '0', 10);
        const total = h * 3600 + min * 60 + sec;
        if (total > 0) return total;
      }
    }
    // Format "HH:MM:SS" or "MM:SS"
    if (s.includes(':')) {
      const parts = s.split(':').map(p => parseInt(p.trim(), 10));
      if (parts.every(p => !isNaN(p))) {
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
    }
    const parsed = parseFloat(s);
    if (!isNaN(parsed) && Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed);
    }
  }
  return 0;
}

export function normalizeTrack(raw: any): MediaTrack {
  const id = raw.id || raw.videoId || '';
  const rawTitle = raw.title ?? raw.name ?? '';
  const title = typeof rawTitle === 'string' && rawTitle.trim() && rawTitle !== 'null'
    ? rawTitle
    : 'Unknown Title';
  let artist = 'Unknown Artist';

  if (typeof raw.artist === 'string' && raw.artist !== 'null') {
    artist = raw.artist;
  } else if (raw.artist && raw.artist.name) {
    artist = raw.artist.name;
  } else if (Array.isArray(raw.artists) && raw.artists.length > 0) {
    artist = raw.artists
      .map((a: any) => (typeof a === 'string' ? a : a.name || ''))
      .filter(Boolean)
      .join(', ');
  }

  let album = 'Single';
  if (typeof raw.album === 'string' && raw.album !== 'null') {
    album = raw.album;
  } else if (raw.album && raw.album.name) {
    album = raw.album.name;
  }

  // Robust multi-source duration extraction (seconds, ms, timestamp strings)
  const parsedDur =
    parseDurationToSeconds(raw.durationSeconds) ||
    parseDurationToSeconds(raw.duration_seconds) ||
    parseDurationToSeconds(raw.durationMs ? Math.round(raw.durationMs / 1000) : null) ||
    parseDurationToSeconds(raw.duration_ms ? Math.round(raw.duration_ms / 1000) : null) ||
    parseDurationToSeconds(raw.duration) ||
    parseDurationToSeconds(raw.duration_string) ||
    parseDurationToSeconds(raw.lengthSeconds) ||
    parseDurationToSeconds(raw.length_seconds) ||
    parseDurationToSeconds(raw.approxDurationMs ? Math.round(raw.approxDurationMs / 1000) : null);

  const durationSeconds = parsedDur > 0 ? parsedDur : 194;

  const artworkUrl = upgradeArtworkUrl(
    raw.artworkUrl || raw.thumbnail || pickBestThumbnail(raw.thumbnails),
    id
  );

  return {
    id,
    title,
    artist,
    album,
    durationSeconds,
    artworkUrl,
    provider: 'youtube_music',
  };
}

class YtMusicService {
  async search(query: string): Promise<MediaTrack[]> {
    if (!query || query.trim().length < 2) return [];
    const trimmed = query.trim();

    try {
      const res = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        const rawList: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.tracks)
          ? data.tracks
          : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.songs)
          ? data.songs
          : [];
        if (rawList.length > 0) {
          return rawList.map(normalizeTrack);
        }
      }
    } catch (err) {
      console.warn('Cloud search error, falling back to local extractor:', err);
    }

    // Fallback: local yt-dlp search bridge
    if (window.electronAPI?.searchTracks) {
      try {
        const fallbackResults = await window.electronAPI.searchTracks(trimmed);
        if (Array.isArray(fallbackResults) && fallbackResults.length > 0) {
          return fallbackResults.map(normalizeTrack);
        }
      } catch (fbErr) {
        console.error('Local yt-dlp search fallback failed:', fbErr);
      }
    }

    // Last fallback: JioSaavn (independent catalog + direct streams).
    try {
      const saavnResults = await jioSaavnService.search(trimmed, 24);
      if (saavnResults.length > 0) return saavnResults;
    } catch (saavnErr) {
      console.warn('JioSaavn search fallback failed:', saavnErr);
    }

    return [];
  }

  async getHome(): Promise<{ sections: CatalogSection[] }> {
    try {
      const res = await fetch(`${BASE_URL}/api/home`);
      if (!res.ok) throw new Error(`Home failed: ${res.statusText}`);
      const data = await res.json();
      if (!data || !Array.isArray(data.sections)) return { sections: [] };

      const sections: CatalogSection[] = data.sections.map((sec: any) => ({
        title: sec.title || 'Featured',
        items: (sec.items || []).map((item: any) => {
          const type = (item.type || 'song').toLowerCase() as any;
          const id = item.id || item.videoId || item.albumId || item.playlistId || '';
          return {
            type,
            id,
            title: item.title || item.name || 'Untitled',
            artist: item.artist || undefined,
            artistId: item.artistId || null,
            album: item.album || null,
            year: item.year || null,
            durationSeconds: parseDurationToSeconds(item.durationSeconds ?? item.durationMs ?? item.duration) || 194,
            artworkUrl: upgradeArtworkUrl(item.artworkUrl, id),
          };
        }),
      }));

      return { sections };
    } catch (err) {
      console.error('YtMusic getHome error:', err);
      return { sections: [] };
    }
  }

  async getArtist(artistId: string): Promise<ArtistDetails | null> {
    if (!artistId) return null;
    try {
      const res = await fetch(`${BASE_URL}/api/artists/${artistId}`);
      if (!res.ok) throw new Error(`Artist failed: ${res.statusText}`);
      const data = await res.json();
      return {
        id: data.id || artistId,
        name: data.name || 'Unknown Artist',
        description: data.description,
        artworkUrl: upgradeArtworkUrl(data.artworkUrl),
        topSongs: (data.topSongs || []).map(normalizeTrack),
        albums: (data.albums || []).map((alb: any) => ({
          type: 'album',
          id: alb.id,
          title: alb.title || 'Untitled Album',
          artist: alb.artist || data.name,
          year: alb.year,
          artworkUrl: upgradeArtworkUrl(alb.artworkUrl),
        })),
      };
    } catch (err) {
      console.error('YtMusic getArtist error:', err);
      return null;
    }
  }

  async getAlbum(albumId: string): Promise<AlbumDetails | null> {
    if (!albumId) return null;
    try {
      const res = await fetch(`${BASE_URL}/api/albums/${albumId}`);
      if (!res.ok) throw new Error(`Album failed: ${res.statusText}`);
      const data = await res.json();
      return {
        id: data.id || albumId,
        title: data.title || 'Untitled Album',
        artist: data.artist || 'Unknown Artist',
        artistId: data.artistId,
        year: data.year,
        artworkUrl: upgradeArtworkUrl(data.artworkUrl),
        tracks: (data.tracks || []).map(normalizeTrack),
      };
    } catch (err) {
      console.error('YtMusic getAlbum error:', err);
      return null;
    }
  }
  // Regional home: curated rails per listening country (India default).
  // Cached 10 min per region. Each rail holds songs.
  private regionalHomeCache: { at: number; region: string; sections: CatalogSection[] } = { at: 0, region: '', sections: [] };

  async getRegionalHome(regionCode: string): Promise<{ sections: CatalogSection[] }> {
    const def = regionDef(regionCode);
    if (
      Date.now() - this.regionalHomeCache.at < 10 * 60 * 1000 &&
      this.regionalHomeCache.region === def.code &&
      this.regionalHomeCache.sections.length > 0
    ) {
      return { sections: this.regionalHomeCache.sections };
    }
    const results: (CatalogSection | null)[] = await Promise.all(
      def.rails.map(async rail => {
        try {
          const tracks = (await this.search(rail.query)).slice(0, 12);
          if (tracks.length === 0) return null;
          return {
            title: rail.title,
            items: tracks.map(t => ({
              type: 'song' as const,
              id: t.id,
              title: t.title,
              artist: t.artist,
              artistId: null as string | null,
              album: t.album,
              year: null as string | null,
              durationSeconds: t.durationSeconds,
              artworkUrl: t.artworkUrl,
            })),
          };
        } catch {
          return null;
        }
      })
    );
    const sections = results.filter((s): s is CatalogSection => s !== null);
    if (sections.length > 0) this.regionalHomeCache = { at: Date.now(), region: def.code, sections };
    return { sections };
  }

  async getWatch(trackId: string, limit = 25): Promise<MediaTrack[]> {
    if (!trackId) return [];
    try {
      const res = await fetch(`${BASE_URL}/api/watch/${encodeURIComponent(trackId)}?limit=${Math.min(Math.max(limit, 1), 50)}`);
      if (!res.ok) return [];
      const data = await res.json();
      const rawList: any[] = Array.isArray(data?.tracks) ? data.tracks : [];
      return rawList.map(normalizeTrack).filter(t => t.id);
    } catch (err) {
      console.warn('getWatch failed, falling back to local autoplay:', err);
      return [];
    }
  }

  // Playlist link import: scrape a YouTube / YT Music playlist URL
  // into a titled track list (metadata only, capped at 200).
  async importPlaylistLink(url: string): Promise<{ title: string; tracks: MediaTrack[] } | null> {
    if (!window.electronAPI?.importPlaylistLink) return null;
    const data = await window.electronAPI.importPlaylistLink(url);
    if (!data) return null;
    const tracks = (data.tracks || [])
      .map((raw: any) => normalizeTrack({
        id: raw.id,
        title: raw.title,
        artist: raw.artist,
        duration: raw.durationSeconds,
        thumbnails: raw.thumbnails,
      }))
      .filter(t => t.id);
    if (tracks.length === 0) return null;
    const title = typeof data.title === 'string' && data.title.trim()
      ? data.title.trim()
      : 'Imported Playlist';
    return { title, tracks };
  }
}

export const ytMusicService = new YtMusicService();
