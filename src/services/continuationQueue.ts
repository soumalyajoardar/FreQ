import { MediaTrack } from '../types';
import { isSameSong, isVibeMatch } from './vibeMatch';

// Port of Android ContinuationQueueLogic.kt
export const CONTINUATION_LIMIT = 25;
export const MIN_BACKEND_MATCHES = 5;

export function shouldFetchContinuation(isExplicitQueue: boolean): boolean {
  return !isExplicitQueue;
}

export function buildContinuationQueue(
  currentTrackId: string,
  watchTracks: MediaTrack[],
  existingQueueIds: Set<string> = new Set(),
  seed: MediaTrack | null = null,
  libraryTracks: MediaTrack[] = [],
  artistPool: MediaTrack[] = [],
  limit: number = CONTINUATION_LIMIT,
): MediaTrack[] {
  if (watchTracks.length === 0) return [];
  const capped = Math.max(0, limit);
  if (capped === 0) return [];
  const seen = new Set<string>();
  const eligible: MediaTrack[] = [];
  for (const track of watchTracks) {
    if (!track.id) continue;
    if (track.id === currentTrackId) continue;
    if (existingQueueIds.has(track.id)) continue;
    if (seen.has(track.id)) continue;
    if (seed && isSameSong(seed, track)) continue;
    seen.add(track.id);
    eligible.push(track);
  }
  if (!seed) return eligible.slice(0, capped);
  const matches: MediaTrack[] = [];
  const rest: MediaTrack[] = [];
  for (const track of eligible) {
    if (isVibeMatch(seed, track, libraryTracks)) matches.push(track);
    else rest.push(track);
  }
  if (artistPool.length === 0 || matches.length >= MIN_BACKEND_MATCHES) {
    return [...matches, ...rest].slice(0, capped);
  }
  const taken = new Set<string>([currentTrackId, ...existingQueueIds, ...eligible.map(t => t.id)]);
  const fill: MediaTrack[] = [];
  for (const track of artistPool) {
    if (fill.length + matches.length >= capped) break;
    if (!track.id) continue;
    if (taken.has(track.id)) continue;
    if (seed && isSameSong(seed, track)) continue;
    taken.add(track.id);
    fill.push(track);
  }
  return [...matches, ...fill, ...rest].slice(0, capped);
}
