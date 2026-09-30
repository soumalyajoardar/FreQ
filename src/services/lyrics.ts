import { SyncedLyricLine, TrackLyrics } from '../types';

const LRCLIB_BASE = 'https://lrclib.net/api/get';
const LRC_LINE_REGEX = /^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/;

const lyricsCache = new Map<string, TrackLyrics | null>();

export function parseLrc(lrcText: string): SyncedLyricLine[] {
  if (!lrcText || typeof lrcText !== 'string') return [];
  const lines = lrcText.split('\n');
  const result: SyncedLyricLine[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    const match = LRC_LINE_REGEX.exec(trimmed);
    if (!match) continue;

    const minutes = parseInt(match[1], 10);
    const seconds = parseFloat(match[2]);
    const text = match[3].trim();

    if (isNaN(minutes) || isNaN(seconds)) continue;
    const timeMs = Math.round((minutes * 60 + seconds) * 1000);

    result.push({ timeMs, text });
  }

  return result.sort((a, b) => a.timeMs - b.timeMs);
}

function extractFirstArtist(artist: string): string {
  return artist
    .split(/\s+(?:feat\.?|ft\.?)\s+|,|&/i)[0]
    .trim();
}

export async function fetchLyrics(
  trackId: string,
  title: string,
  artist: string,
  album?: string,
  durationSeconds?: number
): Promise<TrackLyrics | null> {
  if (lyricsCache.has(trackId)) {
    return lyricsCache.get(trackId) || null;
  }

  const cleanTitle = title.replace(/\([^)]*\)|\[[^\]]*\]/g, '').trim() || title.trim();
  const cleanArtist = artist.trim();

  // 1. Try exact search
  let result = await queryLrcLib(cleanTitle, cleanArtist, album, durationSeconds);

  // 2. Fallback: Try with primary artist only
  if (!result) {
    const firstArt = extractFirstArtist(cleanArtist);
    if (firstArt && firstArt.toLowerCase() !== cleanArtist.toLowerCase()) {
      result = await queryLrcLib(cleanTitle, firstArt, album, durationSeconds);
    }
  }

  lyricsCache.set(trackId, result);
  return result;
}

async function queryLrcLib(
  title: string,
  artist: string,
  album?: string,
  durationSeconds?: number
): Promise<TrackLyrics | null> {
  try {
    const params = new URLSearchParams({
      track_name: title,
      artist_name: artist,
    });

    if (album && album !== 'Single' && album !== 'null') {
      params.append('album_name', album);
    }
    if (durationSeconds && durationSeconds > 0) {
      params.append('duration', durationSeconds.toString());
    }

    const res = await fetch(`${LRCLIB_BASE}?${params.toString()}`, {
      headers: {
        'User-Agent': 'FreQ-Desktop/1.0 (https://github.com/soumalyajoardar/FreQ)',
      },
    });

    if (res.status === 404 || !res.ok) {
      return null;
    }

    const data = await res.json();
    const plainLyrics = (data.plainLyrics || '')
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    const syncedLyrics = parseLrc(data.syncedLyrics || '');

    if (plainLyrics.length === 0 && syncedLyrics.length === 0) {
      return null;
    }

    return {
      lines: plainLyrics.length > 0 ? plainLyrics : syncedLyrics.map(s => s.text),
      synced: syncedLyrics,
    };
  } catch (e) {
    console.warn('[LrcLib] failed lookup:', e);
    return null;
  }
}
