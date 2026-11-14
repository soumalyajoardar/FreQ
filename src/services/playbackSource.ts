// PlaybackSource: what the player can actually load.
//
// Mirrors Android `player/PlaybackSource.kt`: a track is only *potentially*
// playable by id — true playability is decided by the resolver chain
// (local uri → remote provider → unavailable).

export type PlaybackSource =
  | { kind: 'local'; url: string }
  | { kind: 'remote'; url: string; mimeType?: string; expiresAtMs?: number | null }
  | { kind: 'unavailable' };

export const isPlayableSource = (s: PlaybackSource): boolean => s.kind !== 'unavailable';

export const sourceUrlOf = (s: PlaybackSource): string | null =>
  s.kind === 'unavailable' ? null : s.url;

/** googlevideo URLs carry `?expire=<unix-sec>` — the true stream expiry. */
export function parseExpiryFromUrl(url: string | null | undefined): number | null {
  if (!url) return null;
  try {
    const exp = new URL(url).searchParams.get('expire');
    if (!exp) return null;
    const sec = parseInt(exp, 10);
    return Number.isFinite(sec) && sec > 0 ? sec * 1000 : null;
  } catch {
    return null;
  }
}

/** Only HTTPS URLs with a real host are accepted as streams. */
export function isValidHttpsUrl(url: string | null | undefined): boolean {
  if (!url || !url.startsWith('https://')) return false;
  try {
    return !!new URL(url).host;
  } catch {
    return false;
  }
}
