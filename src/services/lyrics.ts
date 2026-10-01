import { SyncedLyricLine, TrackLyrics } from '../types';

const LRCLIB_GET = 'https://lrclib.net/api/get';
const LRCLIB_SEARCH = 'https://lrclib.net/api/search';
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
    if (!text) continue;
    const timeMs = Math.round((minutes * 60 + seconds) * 1000);

    result.push({ timeMs, text });
  }

  return result.sort((a, b) => a.timeMs - b.timeMs);
}

function extractFirstArtist(artist: string): string {
  return artist
    .split(/\s+(?:feat\.?|ft\.?|with|vs\.?)\s+|,|&|×|x(?=\s)/i)[0]
    .trim();
}

// --- Devanagari → Latin (ITRANS-style) transliteration ---
// Hindi lyrics render in English letters: "मैं तान" → "main taan".
// Latin text passes through untouched, so mixed lines just work.
const DEV_CONS: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 'T', 'ठ': 'Th', 'ड': 'D', 'ढ': 'Dh', 'ण': 'N',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
  'ष': 'sh', 'स': 's', 'ह': 'h', 'ळ': 'l',
  'क्ष': 'ksh', 'ज्ञ': 'gy', 'त्र': 'tr', 'श्र': 'shr',
  // Nukta variants
  'क़': 'q', 'ख़': 'kh', 'ग़': 'gh', 'ज़': 'z', 'ड़': 'r',
  'ढ़': 'rh', 'फ़': 'f', 'य़': 'y', 'ऱ': 'r', 'ऴ': 'l',
};
const DEV_VOWEL: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
  'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
  'ऑ': 'o', 'ऒ': 'o',
};
const DEV_MATRA: Record<string, string> = {
  'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
  'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
  'ॉ': 'o', 'ॆ': 'e', 'ॊ': 'o',
};
const DEV_DIGIT: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};
const HALANT = '्';
const NUKTA = '़';

export function transliterateDevanagari(text: string): string {
  const chars = Array.from(text);
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    // Two-char nukta / conjunct clusters first
    const pair = ch + (chars[i + 1] || '');
    if (DEV_CONS[pair]) {
      out += DEV_CONS[pair] + 'a';
      i++;
      continue;
    }
    if (DEV_VOWEL[ch]) {
      out += DEV_VOWEL[ch];
      continue;
    }
    if (DEV_MATRA[ch] !== undefined) {
      out += DEV_MATRA[ch]; // stray matra
      continue;
    }
    if (ch === HALANT || ch === NUKTA) continue;
    if (ch === 'ं' || ch === 'ँ') {
      out += 'n';
      continue;
    }
    if (ch === 'ः') {
      out += 'h';
      continue;
    }
    if (DEV_DIGIT[ch]) {
      out += DEV_DIGIT[ch];
      continue;
    }
    const base = DEV_CONS[ch];
    if (base === undefined) {
      out += ch; // Latin, punctuation, spaces pass through
      continue;
    }
    const next = chars[i + 1] || '';
    const nextPair = next + (chars[i + 2] || '');
    if (next === HALANT) {
      out += base; // conjunct: drop inherent 'a', virama consumed
      i++;
      continue;
    }
    if (DEV_CONS[nextPair]) {
      // consonant cluster without explicit halant (rare) — join bare
      out += base;
      continue;
    }
    if (DEV_MATRA[next] !== undefined) {
      out += base + DEV_MATRA[next];
      i++;
      continue;
    }
    if (next === 'ं' || next === 'ँ') {
      out += base + 'an';
      i++;
      continue;
    }
    if (next === 'ः') {
      out += base + 'ah';
      i++;
      continue;
    }
    out += base + 'a';
  }
  return out;
}

export function romanizeLine(line: string): string {
  // Only touch lines carrying Devanagari; pure English stays verbatim.
  if (!/[\u0900-\u097F]/.test(line)) return line;
  return transliterateDevanagari(line);
}

// Language bucket for lyric priority: English (Latin script) first,
// then Hindi (Devanagari script), then anything else.
function lyricLanguage(text: string): 0 | 1 | 2 {
  if (!text) return 2;
  if (/[\u0900-\u097F]/.test(text)) return 1;
  if (/[A-Za-z]/.test(text)) return 0;
  return 2;
}

function toTrackLyrics(data: any): TrackLyrics | null {
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
}

// Rank candidates: English first, Hindi second, rest last; closer
// duration breaks ties so live/remix dupes lose to the studio cut.
function pickBest(candidates: any[], durationSeconds?: number): TrackLyrics | null {
  let best: TrackLyrics | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const c of candidates) {
    const parsed = toTrackLyrics(c);
    if (!parsed) continue;
    const sample = parsed.synced.length > 0
      ? parsed.synced.slice(0, 8).map(s => s.text).join('\n')
      : parsed.lines.slice(0, 8).join('\n');
    const lang = lyricLanguage(sample);
    let score = (2 - lang) * 1000;
    if (durationSeconds && durationSeconds > 0 && typeof c.duration === 'number') {
      score -= Math.min(Math.abs(c.duration - durationSeconds), 120);
    }
    if (parsed.synced.length > 0) score += 5;
    if (score > bestScore) {
      bestScore = score;
      best = parsed;
    }
  }
  return best;
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

  // 1. Ranked multi-result search (English → Hindi → anything)
  let result = await searchLrcLib(cleanTitle, cleanArtist, album, durationSeconds);

  // 2. Fallback: Try with primary artist only
  if (!result) {
    const firstArt = extractFirstArtist(cleanArtist);
    if (firstArt && firstArt.toLowerCase() !== cleanArtist.toLowerCase()) {
      result = await searchLrcLib(cleanTitle, firstArt, album, durationSeconds);
    }
  }

  // 3. Last resort: exact single-result endpoint
  if (!result) {
    result = await getLrcLib(cleanTitle, cleanArtist, album, durationSeconds);
  }

  // Hindi-in-Devanagari renders in English letters (romanized).
  if (result) {
    result = {
      lines: result.lines.map(romanizeLine),
      synced: result.synced.map(s => ({ ...s, text: romanizeLine(s.text) })),
    };
  }

  lyricsCache.set(trackId, result);
  return result;
}

function buildParams(
  title: string,
  artist: string,
  album?: string,
  durationSeconds?: number
): URLSearchParams {
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
  return params;
}

async function searchLrcLib(
  title: string,
  artist: string,
  album?: string,
  durationSeconds?: number
): Promise<TrackLyrics | null> {
  try {
    const res = await fetch(`${LRCLIB_SEARCH}?${buildParams(title, artist, album).toString()}`, {
      headers: {
        'User-Agent': 'FreQ-Desktop/1.0 (https://github.com/soumalyajoardar/FreQ)',
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    return pickBest(data, durationSeconds);
  } catch (e) {
    console.warn('[LrcLib] failed search lookup:', e);
    return null;
  }
}

async function getLrcLib(
  title: string,
  artist: string,
  album?: string,
  durationSeconds?: number
): Promise<TrackLyrics | null> {
  try {
    const res = await fetch(`${LRCLIB_GET}?${buildParams(title, artist, album, durationSeconds).toString()}`, {
      headers: {
        'User-Agent': 'FreQ-Desktop/1.0 (https://github.com/soumalyajoardar/FreQ)',
      },
    });

    if (res.status === 404 || !res.ok) {
      return null;
    }

    const data = await res.json();
    return toTrackLyrics(data);
  } catch (e) {
    console.warn('[LrcLib] failed lookup:', e);
    return null;
  }
}
