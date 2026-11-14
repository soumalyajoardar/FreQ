// Pure queue-state math for the playback manager.
//
// Direct port of Android `player/PlaybackQueueLogic.kt` (M13 test seams),
// adapted to the Windows `RepeatMode` domain ('OFF' | 'ALL' | 'ONE').
// Every function is pure: same inputs → same outputs, no player access.

import { RepeatMode } from '../types';

/** Windows repeat cycle: OFF → ALL → ONE → OFF. */
export function cycleRepeatMode(current: RepeatMode): RepeatMode {
  if (current === 'OFF') return 'ALL';
  if (current === 'ALL') return 'ONE';
  return 'OFF';
}

/** Clamps a restored queue index into [0, size - 1]; 0 for an empty queue. */
export function clampQueueIndex(index: number, queueSize: number): number {
  if (queueSize <= 0) return 0;
  return Math.min(Math.max(index, 0), queueSize - 1);
}

export interface QueueRemovePlan {
  /** Index of the current track in the post-removal queue. */
  newIndex: number;
  /** True when the removed item was the current track. */
  trackChanged: boolean;
}

/** Index math for removing `removedIndex` from a queue. Null when invalid. */
export function planQueueRemove(
  queueSize: number,
  removedIndex: number,
  currentIndex: number,
): QueueRemovePlan | null {
  if (queueSize <= 0 || removedIndex < 0 || removedIndex >= queueSize) return null;
  const newSize = queueSize - 1;
  let newIndex: number;
  if (removedIndex < currentIndex) newIndex = currentIndex - 1;
  else if (removedIndex === currentIndex) newIndex = Math.min(currentIndex, Math.max(newSize - 1, 0));
  else newIndex = currentIndex;
  return { newIndex, trackChanged: removedIndex === currentIndex };
}

/** Current-track index after a move edit: position of the current id, else fallback. */
export function resolveCurrentIndexAfterMove(
  newQueueIds: string[],
  currentTrackId: string | null | undefined,
  fallbackIndex: number,
): number {
  if (!currentTrackId) return fallbackIndex;
  const found = newQueueIds.indexOf(currentTrackId);
  return found !== -1 ? found : fallbackIndex;
}

export interface PlayNextPlan<T> {
  queue: T[];
  insertPos: number;
  currentIndex: number;
}

/**
 * "Play next" edit: de-dupes the item when it already appears later in the
 * queue (a current-track duplicate is kept in place), then inserts directly
 * after the current track.
 */
export function planPlayNext<T>(
  queue: T[],
  idOf: (t: T) => string,
  currentIndex: number,
  newItem: T,
): PlayNextPlan<T> {
  const newId = idOf(newItem);
  if (queue[currentIndex] && idOf(queue[currentIndex]) === newId) {
    return { queue, insertPos: currentIndex, currentIndex };
  }
  const next = [...queue];
  const existingIndex = next.findIndex(t => idOf(t) === newId);
  if (existingIndex !== -1 && existingIndex !== currentIndex) next.splice(existingIndex, 1);
  const current = queue[currentIndex];
  const adjustedCurrentIndex = current
    ? Math.max(next.findIndex(t => idOf(t) === idOf(current)), 0)
    : currentIndex;
  const insertPos = Math.min(adjustedCurrentIndex + 1, next.length);
  next.splice(insertPos, 0, newItem);
  return { queue: next, insertPos, currentIndex: adjustedCurrentIndex };
}

/** "Clear Up Next" has work when the queue is non-empty and current isn't last. */
export function shouldClearUpNext(queueSize: number, currentIndex: number): boolean {
  return queueSize > 0 && currentIndex < queueSize - 1;
}

/** Stale when a newer load token was issued or the current track changed. */
export function isRecoveryStale(
  requestToken: number,
  activeToken: number,
  requestTrackId: string | null | undefined,
  currentTrackId: string | null | undefined,
): boolean {
  return requestToken !== activeToken || requestTrackId !== currentTrackId;
}

/** Stale when a newer load token was issued after the work started. */
export function isSyncStale(requestToken: number, activeToken: number): boolean {
  return requestToken !== activeToken;
}

/**
 * Seamless-transition prefetch gate: resolve the next item once the current
 * track is within `thresholdSeconds` of its end, so the boundary never
 * waits on network extraction.
 */
export function shouldPrefetchNext(
  durationSeconds: number,
  progressSeconds: number,
  hasNext: boolean,
  thresholdSeconds: number = NEXT_PREFETCH_THRESHOLD_SEC,
): boolean {
  if (!hasNext || durationSeconds <= 0) return false;
  const remaining = durationSeconds - progressSeconds;
  return remaining <= thresholdSeconds && remaining > 0;
}

/** Prefetch window before track end, in seconds. */
export const NEXT_PREFETCH_THRESHOLD_SEC = 30;
