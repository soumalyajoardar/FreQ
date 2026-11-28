import { SyncedLyricLine, SyncedLyricWord, TrackLyrics } from '../types';

const LRCLIB_GET = 'https://lrclib.net/api/get';
const LRCLIB_SEARCH = 'https://lrclib.net/api/search';
const LRCMUX_GET = 'https://api.lrcmux.dev/get';
const USER_AGENT = 'FreQ-Desktop/1.0 (https://github.com/soumalyajoardar/FreQ)';

const TIME_TAG_GLOBAL = /\[(\d+):(\d+(?:\.\d+)?)\]/g;
const WORD_TAG_GLOBAL = /<(\d+):(\d+(?:\.\d+)?)>/g;
const OFFSET_STORAGE_KEY = 'freq_lyrics_offsets_v1';

const lyricsCache = new Map<string, TrackLyrics | null>();

function toMs(minStr: string, secStr: string): number {
  const m = parseInt(minStr, 10);
  const s = parseFloat(secStr);
  if (isNaN(m) || isNaN(s)) return 0;
  return Math.round((m * 60 + s) * 1000);
}

/**
 * Distribute a line's duration proportionally across its words when true
 * enhanced `<mm:ss.xx>` word tags are absent.
 */
function estimateLineWords(text: string, startMs: number, nextStartMs: number): SyncedLyricWord[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const gap = Math.max(450, nextStartMs - startMs);
  const estSpan = Math.min(gap * 0.94, Math.max(700, tokens.length * 360));
  const weights = tokens.map(t => Math.max(2, t.replace(/[^\p{L}\p{N}]/gu, '').length || t.length));
  const total = weights.reduce((a, b) => a + b, 0) || 1;

  let cursor = startMs;
  let depth = 0;
  return tokens.map((tok, i) => {
    const dur = (weights[i] / total) * estSpan;
    const wordStart = Math.round(cursor);
    cursor += dur;
    const wordEnd = Math.round(cursor);
    if (tok.includes('(')) depth++;
    const backing = depth > 0;
    if (tok.includes(')')) depth = Math.max(0, depth - 1);
    return { text: tok, startMs: wordStart, endMs: Math.max(wordStart + 80, wordEnd), backing };
  });
}

/**
 * Parse standard `[mm:ss.xx]` or enhanced `<mm:ss.xx>` word-level LRC text
 * into sorted synced lines with per-word timing ranges.
 */
export function parseLrc(lrcText: string, durationSeconds?: number): SyncedLyricLine[] {
  if (!lrcText || typeof lrcText !== 'string') return [];

  let globalOffsetMs = 0;
  const raw: { timeMs: number; text: string; wordStarts?: { startMs: number; text: string }[] }[] = [];

  for (const rawLine of lrcText.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const offsetMatch = /^\[offset:\s*([+-]?\d+)\]/i.exec(trimmed);
    if (offsetMatch) {
      globalOffsetMs = parseInt(offsetMatch[1], 10) || 0;
      continue;
    }

    const times = [...trimmed.matchAll(TIME_TAG_GLOBAL)];
    if (times.length === 0) continue;

    const body = trimmed.replace(TIME_TAG_GLOBAL, '').trim();
    let wordStarts: { startMs: number; text: string }[] | undefined;

    if (WORD_TAG_GLOBAL.test(body)) {
      WORD_TAG_GLOBAL.lastIndex = 0;
      wordStarts = [];
      const parts = body.split(WORD_TAG_GLOBAL);
      for (let i = 1; i + 2 < parts.length; i += 3) {
        const wText = (parts[i + 2] || '').trim();
        if (wText) {
          wordStarts.push({
            startMs: Math.max(0, toMs(parts[i], parts[i + 1]) - globalOffsetMs),
            text: wText,
          });
        }
      }
      if (wordStarts.length === 0) wordStarts = undefined;
    }

    const cleanText = body.replace(WORD_TAG_GLOBAL, '').replace(/\s+/g, ' ').trim();
    if (!cleanText) continue;

    for (const t of times) {
      raw.push({
        timeMs: Math.max(0, toMs(t[1], t[2]) - globalOffsetMs),
        text: cleanText,
        wordStarts,
      });
    }
  }

  raw.sort((a, b) => a.timeMs - b.timeMs);
  const fallbackEndMs =
    durationSeconds && durationSeconds > 0
      ? Math.round(durationSeconds * 1000)
      : (raw[raw.length - 1]?.timeMs ?? 0) + 4500;

  return raw.map((line, i) => {
    const nextMs = i + 1 < raw.length ? raw[i + 1].timeMs : Math.max(line.timeMs + 3500, fallbackEndMs);
    let words: SyncedLyricWord[];

    if (line.wordStarts && line.wordStarts.length > 0) {
      const timed = line.wordStarts;
      let depth = 0;
      words = timed.map((w, wIdx) => {
        const nextWordMs = wIdx + 1 < timed.length ? timed[wIdx + 1].startMs : Math.min(nextMs, w.startMs + 1400);
        const endMs = Math.max(w.startMs + 80, nextWordMs);
        if (w.text.includes('(')) depth++;
        const backing = depth > 0;
        if (w.text.includes(')')) depth = Math.max(0, depth - 1);
        return { text: w.text, startMs: w.startMs, endMs, backing };
      });
      const meanDur = words.reduce((acc, w) => acc + (w.endMs - w.startMs), 0) / words.length;
      for (const w of words) {
        if (words.length >= 3 && w.endMs - w.startMs > meanDur * 1.7) {
          w.emphasis = true;
        }
      }
    } else {
      words = estimateLineWords(line.text, line.timeMs, nextMs);
    }

    return {
      timeMs: line.timeMs,
      endMs: nextMs,
      text: line.text,
      words,
    };
  });
}

function extractFirstArtist(artist: string): string {
  return artist
    .split(/\s+(?:feat\.?|ft\.?|with|vs\.?)\s+|,|&|×|x(?=\s)/i)[0]
    .trim();
}

// --- Devanagari → Latin (ITRANS-style) transliteration ---
const DEV_CONS: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 'T', 'ठ': 'Th', 'ड': 'D', 'ढ': 'Dh', 'ण': 'N',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
  'ष': 'sh', 'स': 's', 'ह': 'h', 'ळ': 'l',
  'क्ष': 'ksh', 'ज्ञ': 'gy', 'त्र': 'tr', 'श्र': 'shr',
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
      out += DEV_MATRA[ch];
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
      out += ch;
      continue;
    }
    const next = chars[i + 1] || '';
    const nextPair = next + (chars[i + 2] || '');
    if (next === HALANT) {
      out += base;
      i++;
      continue;
    }
    if (DEV_CONS[nextPair]) {
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
  if (!/[\u0900-\u097F]/.test(line)) return line;
  return transliterateDevanagari(line);
}

function lyricLanguage(text: string): 0 | 1 | 2 {
  if (!text) return 2;
  if (/[\u0900-\u097F]/.test(text)) return 1;
  if (/[A-Za-z]/.test(text)) return 0;
  return 2;
}

function toTrackLyrics(data: any, durationSeconds?: number): TrackLyrics | null {
  const plainLyrics = (data.plainLyrics || '')
    .split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0);

  const rawSynced = data.syncedLyrics || '';
  const syncedLyrics = parseLrc(rawSynced, durationSeconds);

  if (plainLyrics.length === 0 && syncedLyrics.length === 0) {
    return null;
  }

  return {
    lines: plainLyrics.length > 0 ? plainLyrics : syncedLyrics.map(s => s.text),
    synced: syncedLyrics,
    wordSynced: WORD_TAG_GLOBAL.test(rawSynced),
    source: 'LRCLIB',
  };
}

function pickBest(candidates: any[], durationSeconds?: number): TrackLyrics | null {
  let best: TrackLyrics | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const c of candidates) {
    const parsed = toTrackLyrics(c, durationSeconds);
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

/** Verify word-synced lrcmux lines match LRCLIB's line timestamps closely. */
function timingAgrees(candidate: SyncedLyricLine[], reference: SyncedLyricLine[]): boolean {
  if (candidate.length === 0 || reference.length === 0) return false;
  if (Math.abs(candidate.length - reference.length) > Math.max(2, reference.length * 0.2)) return false;
  if (Math.abs(candidate[0].timeMs - reference[0].timeMs) > 2000) return false;
  const matched = reference.filter(ref =>
    candidate.some(cand => Math.abs(cand.timeMs - ref.timeMs) <= 1500)
  ).length;
  return matched / reference.length >= 0.85;
}

async function fetchLrcmuxWordSynced(
  title: string,
  artist: string,
  album?: string,
  durationSeconds?: number
): Promise<TrackLyrics | null> {
  try {
    const params = new URLSearchParams({
      artist,
      title,
      format: 'lrc',
    });
    if (album && album !== 'Single' && album !== 'null') {
      params.set('album', album);
    }
    if (durationSeconds && durationSeconds > 0) {
      params.set('duration', String(Math.round(durationSeconds)));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(`${LRCMUX_GET}?${params.toString()}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!res.ok) return null;
    const raw = (await res.text()).trim();
    WORD_TAG_GLOBAL.lastIndex = 0;
    const isWordTimed =
      res.headers.get('x-sync-level') === 'word' || WORD_TAG_GLOBAL.test(raw);
    if (!raw || !isWordTimed) return null;

    const synced = parseLrc(raw, durationSeconds);
    if (synced.length === 0) return null;

    const provider = res.headers.get('x-source');
    const source = provider
      ? `${provider.charAt(0).toUpperCase()}${provider.slice(1)} (Word-synced)`
      : 'lrcmux (Word-synced)';

    return {
      lines: synced.map(s => s.text),
      synced,
      wordSynced: true,
      source,
    };
  } catch {
    return null;
  }
}

function romanizeTrackLyrics(lyrics: TrackLyrics): TrackLyrics {
  return {
    ...lyrics,
    lines: lyrics.lines.map(romanizeLine),
    synced: lyrics.synced.map(line => ({
      ...line,
      text: romanizeLine(line.text),
      words: line.words?.map(w => ({ ...w, text: romanizeLine(w.text) })),
    })),
  };
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
  const primaryArtist = extractFirstArtist(cleanArtist) || cleanArtist;

  // Query LRCLIB and lrcmux (word-by-word) in parallel.
  const lrcLibPromise = (async () => {
    let res = await searchLrcLib(cleanTitle, cleanArtist, album, durationSeconds);
    if (!res && primaryArtist.toLowerCase() !== cleanArtist.toLowerCase()) {
      res = await searchLrcLib(cleanTitle, primaryArtist, album, durationSeconds);
    }
    if (!res) {
      res = await getLrcLib(cleanTitle, cleanArtist, album, durationSeconds);
    }
    return res;
  })();

  const lrcmuxPromise = fetchLrcmuxWordSynced(cleanTitle, primaryArtist, album, durationSeconds);

  const [lrclibResult, lrcmuxResult] = await Promise.all([lrcLibPromise, lrcmuxPromise]);

  let chosen: TrackLyrics | null = null;
  if (
    lrcmuxResult &&
    (!lrclibResult?.synced.length || timingAgrees(lrcmuxResult.synced, lrclibResult.synced))
  ) {
    chosen = lrcmuxResult;
  } else if (lrclibResult) {
    chosen = lrclibResult;
  }

  if (chosen) {
    chosen = romanizeTrackLyrics(chosen);
  }

  lyricsCache.set(trackId, chosen);
  return chosen;
}

export function getLyricsOffsetMs(trackId: string): number {
  try {
    const raw = localStorage.getItem(OFFSET_STORAGE_KEY);
    if (!raw) return 0;
    const map = JSON.parse(raw);
    const val = map?.[trackId];
    return typeof val === 'number' && Number.isFinite(val) ? val : 0;
  } catch {
    return 0;
  }
}

export function setLyricsOffsetMs(trackId: string, offsetMs: number): void {
  try {
    const raw = localStorage.getItem(OFFSET_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    if (offsetMs === 0) {
      delete map[trackId];
    } else {
      map[trackId] = offsetMs;
    }
    localStorage.setItem(OFFSET_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors.
  }
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
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
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
      headers: { 'User-Agent': USER_AGENT },
    });
    if (res.status === 404 || !res.ok) return null;
    const data = await res.json();
    return toTrackLyrics(data, durationSeconds);
  } catch (e) {
    console.warn('[LrcLib] failed lookup:', e);
    return null;
  }
}
