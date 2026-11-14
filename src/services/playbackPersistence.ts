// Playback session persistence: queue + position survive restarts.
//
// Mirrors Android `data/playback/PlaybackPersistence.kt`: the session is
// restored *paused* — the user presses play to resume exactly where they
// left off. Queue is capped so localStorage stays small.

import { MediaTrack, RepeatMode } from '../types';
import { clampQueueIndex } from './playbackQueueLogic';

export interface PlaybackSessionSnapshot {
  queue: MediaTrack[];
  queueIndex: number;
  trackId: string | null;
  positionMs: number;
  shuffle: boolean;
  repeatMode: RepeatMode;
}

const KEY = 'freq_playback_session';
const MAX_PERSISTED_QUEUE = 50;

export function savePlaybackSession(s: PlaybackSessionSnapshot): void {
  try {
    const payload = {
      queue: (s.queue || []).slice(0, MAX_PERSISTED_QUEUE),
      queueIndex: s.queueIndex || 0,
      trackId: s.trackId || null,
      positionMs: Math.max(0, Math.round(s.positionMs || 0)),
      shuffle: !!s.shuffle,
      repeatMode: s.repeatMode || 'OFF',
      savedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // Storage full / unavailable — playback continues without persistence.
  }
}

export function loadPlaybackSession(): PlaybackSessionSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const queue: MediaTrack[] = Array.isArray(data?.queue)
      ? data.queue.filter((t: any) => t && typeof t.id === 'string' && t.id)
      : [];
    if (queue.length === 0) return null;
    const queueIndex = clampQueueIndex(
      typeof data?.queueIndex === 'number' ? data.queueIndex : 0,
      queue.length,
    );
    const track = queue[queueIndex];
    return {
      queue,
      queueIndex,
      trackId: track?.id || null,
      positionMs: typeof data?.positionMs === 'number' ? Math.max(0, data.positionMs) : 0,
      shuffle: !!data?.shuffle,
      repeatMode: data?.repeatMode === 'ALL' || data?.repeatMode === 'ONE' ? data.repeatMode : 'OFF',
    };
  } catch {
    return null;
  }
}

export function clearPlaybackSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Ignored.
  }
}
