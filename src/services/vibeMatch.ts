import { MediaTrack } from '../types';

// Port of Android VibeMatch.kt — script-aware vibe scoring.
// Same bonuses: artist 50, album 30, script 25, token 4x3, sections 12/10/8/4.
export type TrackScript =
  | 'NONE' | 'BENGALI' | 'DEVANAGARI' | 'TAMIL' | 'TELUGU'
  | 'KANNADA' | 'MALAYALAM' | 'GURMUKHI' | 'GUJARATI'
  | 'ARABIC' | 'CJK' | 'LATIN' | 'OTHER';

export const SAME_ARTIST_BONUS = 50;
export const SAME_ALBUM_BONUS = 30;
export const SAME_SCRIPT_BONUS = 25;
export const TOKEN_BONUS = 4;
export const MAX_TOKEN_HITS = 3;
export const SECTION_TRENDING_BONUS = 12;
export const SECTION_TOP_BONUS = 10;
export const SECTION_HITS_BONUS = 8;
export const SECTION_NEW_BONUS = 4;

export function sectionPopularityBonus(sectionTitle: string): number {
  const t = (sectionTitle || '').toLowerCase();
  let best = 0;
  if (t.includes('trend') || t.includes('chart')) best = Math.max(best, SECTION_TRENDING_BONUS);
  if (/\btop\b/.test(t) || t.includes('viral') || t.includes('popular')) best = Math.max(best, SECTION_TOP_BONUS);
  if (t.includes('hits') || /\bhot\b/.test(t)) best = Math.max(best, SECTION_HITS_BONUS);
  if (t.includes('new')) best = Math.max(best, SECTION_NEW_BONUS);
  return best;
}

function codeIn(code: number, lo: number, hi: number): boolean {
  return code >= lo && code <= hi;
}

export function dominantScript(text: string): TrackScript {
  let latin = 0, bengali = 0, devanagari = 0, tamil = 0, telugu = 0,
    kannada = 0, malayalam = 0, gurmukhi = 0, gujarati = 0,
    arabic = 0, cjk = 0, other = 0;
  for (const ch of text || '') {
    const code = ch.codePointAt(0) || 0;
    if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 192 && code <= 591)) latin++;
    else if (codeIn(code, 0x0980, 0x09FF)) bengali++;
    else if (codeIn(code, 0x0900, 0x097F)) devanagari++;
    else if (codeIn(code, 0x0B80, 0x0BFF)) tamil++;
    else if (codeIn(code, 0x0C00, 0x0C7F)) telugu++;
    else if (codeIn(code, 0x0C80, 0x0CFF)) kannada++;
    else if (codeIn(code, 0x0D00, 0x0D7F)) malayalam++;
    else if (codeIn(code, 0x0A00, 0x0A7F)) gurmukhi++;
    else if (codeIn(code, 0x0A80, 0x0AFF)) gujarati++;
    else if (codeIn(code, 0x0600, 0x06FF)) arabic++;
    else if (codeIn(code, 0x3040, 0x30FF) || codeIn(code, 0x4E00, 0x9FFF) || codeIn(code, 0xAC00, 0xD7AF)) cjk++;
    else if (/\p{L}/u.test(ch)) other++;
  }
  const ranked: Array<[TrackScript, number]> = [
    ['BENGALI', bengali], ['DEVANAGARI', devanagari], ['TAMIL', tamil],
    ['TELUGU', telugu], ['KANNADA', kannada], ['MALAYALAM', malayalam],
    ['GURMUKHI', gurmukhi], ['GUJARATI', gujarati], ['ARABIC', arabic],
    ['CJK', cjk], ['LATIN', latin], ['OTHER', other],
  ];
  let best: TrackScript = 'NONE';
  let bestCount = 0;
  for (const [s, c] of ranked) {
    if (c > bestCount) { bestCount = c; best = s; }
  }
  return bestCount === 0 ? 'NONE' : best;
}

export function trackScriptOf(track: MediaTrack): TrackScript {
  const titleScript = dominantScript(track.title || '');
  if (titleScript !== 'NONE' && titleScript !== 'LATIN') return titleScript;
  return dominantScript(`${track.title || ''} ${track.artist || ''} ${track.album || ''}`);
}

function pickDominant(counts: Map<TrackScript, number>, nativeFirstOnTie: boolean): TrackScript {
  if (counts.size === 0) return 'NONE';
  if (!nativeFirstOnTie) {
    let best: TrackScript = 'NONE';
    let bestN = -1;
    counts.forEach((n, s) => { if (n > bestN) { bestN = n; best = s; } });
    return best;
  }
  const rank = (s: TrackScript) => (s === 'LATIN' ? 1 : s === 'OTHER' ? 2 : s === 'NONE' ? 3 : 0);
  const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || rank(a[0]) - rank(b[0]));
  return entries[0]?.[0] || 'NONE';
}

export function dominantScriptOfTracks(tracks: MediaTrack[], nativeFirstOnTie = false): TrackScript {
  const counts = new Map<TrackScript, number>();
  for (const t of tracks) {
    const s = trackScriptOf(t);
    if (s === 'NONE') continue;
    counts.set(s, (counts.get(s) || 0) + 1);
  }
  return pickDominant(counts, nativeFirstOnTie);
}

export function dominantTitleScript(tracks: MediaTrack[], nativeFirstOnTie = false): TrackScript {
  const counts = new Map<TrackScript, number>();
  for (const t of tracks) {
    const s = dominantScript(t.title || '');
    if (s === 'NONE') continue;
    counts.set(s, (counts.get(s) || 0) + 1);
  }
  return pickDominant(counts, nativeFirstOnTie);
}

export function resolveSeedScript(seed: MediaTrack, libraryTracks: MediaTrack[] = []): TrackScript {
  const own = trackScriptOf(seed);
  if (own !== 'LATIN' && own !== 'NONE') return own;
  if (libraryTracks.length > 0) {
    const byArtist = libraryTracks.filter(t => isSameArtist(seed, t));
    if (byArtist.length > 0) {
      const artistScript = dominantTitleScript(byArtist, true);
      if (artistScript !== 'NONE') return artistScript;
    }
    if (own !== 'LATIN') {
      const libScript = dominantScriptOfTracks(libraryTracks);
      if (libScript !== 'NONE') return libScript;
    }
  }
  return own;
}

export function isSameArtist(a: MediaTrack, b: MediaTrack): boolean {
  const ka = (a.artist || '').trim().toLowerCase();
  const kb = (b.artist || '').trim().toLowerCase();
  return ka !== '' && ka === kb;
}

export function isSameAlbum(a: MediaTrack, b: MediaTrack): boolean {
  const ka = (a.album || '').trim().toLowerCase();
  const kb = (b.album || '').trim().toLowerCase();
  if (!ka || !kb) return false;
  if (ka === 'single' || kb === 'single') return false;
  return ka === kb;
}

// Normalized title for duplicate detection: lowercase, bracket content
// dropped ("Kaahe Mose (Lyrical)" → "kaahe mose"), punctuation dropped.
export function normTitle(title: string): string {
  return (title || '')
    .toLowerCase()
    .replace(/[([][^()\][\]]*[)\]]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Same song under a different upload (different videoId, same title +
// overlapping artist). Such dupes must never fill Up Next — the queue
// should vibe-match, not echo the current song.
export function isSameSong(a: MediaTrack, b: MediaTrack): boolean {
  const ta = normTitle(a.title || '');
  const tb = normTitle(b.title || '');
  if (!ta || ta !== tb) return false;
  const aa = (a.artist || '').trim().toLowerCase();
  const bb = (b.artist || '').trim().toLowerCase();
  if (!aa || !bb) return false;
  return aa === bb || aa.includes(bb) || bb.includes(aa);
}

function cleanTitleForAlternateMatch(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[\[\(][^\]\)]*[\]\)]/g, ' ')
    .replace(/\b(official|music|video|full video|lyrical video|audio|lyric|lyrics|full|song|hd|4k|remastered|version|visualizer|feat|ft)\b/gi, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function foldVowels(s: string): string {
  return (s || '').replace(/aa+/g, 'a').replace(/ee+/g, 'i').replace(/oo+/g, 'u');
}

/**
 * Alternate-upload matcher for dead-stream fallbacks.
 * Matches official music videos, lyrical uploads, and video variants of the same track
 * while rejecting remixes, lo-fi flips, and unrelated songs.
 */
export function isAlternateUploadMatch(seed: MediaTrack, cand: MediaTrack): boolean {
  if (!cand || !cand.id || cand.id === seed.id) return false;

  const rawSeed = (seed.title || '').toLowerCase();
  const rawCand = (cand.title || '').toLowerCase();

  // If seed is not a special variant, exclude variant keywords in candidate
  const variantKeywords = ['remix', 'mashup', 'cover', 'lofi', 'lo-fi', 'slowed', 'reverb', 'reprise', 'acoustic', 'karaoke', 'instrumental'];
  for (const kw of variantKeywords) {
    if (!rawSeed.includes(kw) && rawCand.includes(kw)) {
      return false;
    }
  }

  const cleanSeed = cleanTitleForAlternateMatch(seed.title);
  const cleanCand = cleanTitleForAlternateMatch(cand.title);

  const foldedSeed = foldVowels(cleanSeed);
  const foldedCand = foldVowels(cleanCand);

  const seedTokens = foldedSeed.split(' ').filter(w => w.length >= 3);
  if (seedTokens.length === 0) return false;

  const matchedTokens = seedTokens.filter(t => foldedCand.includes(t));
  const tokenMatchRatio = matchedTokens.length / seedTokens.length;

  if (tokenMatchRatio < 0.6) return false;

  const seedArtists = (seed.artist || '')
    .toLowerCase()
    .split(/[,&]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 3);

  const candFullText = foldVowels((cand.title + ' ' + (cand.artist || '')).toLowerCase());
  const artistMatches = seedArtists.length === 0 || seedArtists.some(a => candFullText.includes(foldVowels(a)));

  const durMatches = seed.durationSeconds && cand.durationSeconds
    ? Math.abs(seed.durationSeconds - cand.durationSeconds) <= 60
    : true;

  return (artistMatches && tokenMatchRatio >= 0.6) || (durMatches && tokenMatchRatio >= 0.75) || tokenMatchRatio === 1.0;
}

function titleTokens(title: string): Set<string> {
  return new Set(
    (title || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 4),
  );
}

export function sharedTitleTokens(a: MediaTrack, b: MediaTrack): number {
  const ta = titleTokens(a.title || '');
  if (ta.size === 0) return 0;
  const tb = titleTokens(b.title || '');
  if (tb.size === 0) return 0;
  let n = 0;
  ta.forEach(w => { if (tb.has(w)) n++; });
  return n;
}

export function scriptScore(seed: MediaTrack, candidate: MediaTrack, libraryTracks: MediaTrack[] = []): number {
  const resolved = resolveSeedScript(seed, libraryTracks);
  if (resolved === 'NONE') return 0;
  return trackScriptOf(candidate) === resolved ? SAME_SCRIPT_BONUS : 0;
}

export function vibeScore(seed: MediaTrack, candidate: MediaTrack, libraryTracks: MediaTrack[] = []): number {
  let score = 0;
  if (isSameArtist(seed, candidate)) score += SAME_ARTIST_BONUS;
  if (isSameAlbum(seed, candidate)) score += SAME_ALBUM_BONUS;
  score += scriptScore(seed, candidate, libraryTracks);
  score += Math.min(sharedTitleTokens(seed, candidate), MAX_TOKEN_HITS) * TOKEN_BONUS;
  return score;
}

export function isVibeMatch(seed: MediaTrack, candidate: MediaTrack, libraryTracks: MediaTrack[] = []): boolean {
  return isSameArtist(seed, candidate) || isSameAlbum(seed, candidate) || scriptScore(seed, candidate, libraryTracks) > 0;
}

export function countVibeMatches(seed: MediaTrack, tracks: MediaTrack[], libraryTracks: MediaTrack[] = []): number {
  return tracks.filter(t => isVibeMatch(seed, t, libraryTracks)).length;
}

export function shouldUseContinuation(seed: MediaTrack, watchTracks: MediaTrack[], libraryTracks: MediaTrack[] = []): boolean {
  if (watchTracks.length === 0) return false;
  if (countVibeMatches(seed, watchTracks, libraryTracks) > 0) return true;
  const resolved = resolveSeedScript(seed, libraryTracks);
  return resolved === 'LATIN' || resolved === 'NONE';
}
