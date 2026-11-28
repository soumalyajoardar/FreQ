// PlaybackManager: the single owner of *how* a track becomes playable.
//
// Mirrors Android `player/PlaybackManager.kt` responsibilities, adapted to
// Electron: the renderer owns an HTMLAudioElement (audioEngine) instead of a
// MediaController, and the main process owns extraction. React state
// (currentTrack, queue, …) stays in App.tsx; this module owns everything
// stateless around it:
//
//  - source cache with 60s expiry margin (no re-extract on seek/pause/skip)
//  - ordered resolution via PlaybackSourceResolver (local → bridge → cloud)
//  - seamless-transition prefetch (warm next URL in the last 30s)
//  - session save/restore (paused)

import { MediaTrack } from '../types';
import { PlaybackSource } from './playbackSource';
import { PlaybackSourceResolver } from './playbackSourceResolver';
import { ytMusicRemoteProvider } from './remotePlaybackProvider';
import { shouldPrefetchNext } from './playbackQueueLogic';
import { loadPlaybackSession, PlaybackSessionSnapshot, savePlaybackSession } from './playbackPersistence';

// Streams expiring within this margin are refreshed instead of reused.
const EXPIRY_SAFETY_MARGIN_MS = 60_000;
const MAX_SOURCE_CACHE = 120;
const HOVER_DEBOUNCE_MS = 180;
const HOVER_COOLDOWN_MS = 450;

class PlaybackManager {
  private readonly sourceCache = new Map<string, PlaybackSource>();
  private prefetchKey: string | null = null;
  private hoverTimer: ReturnType<typeof setTimeout> | null = null;
  private hoverTargetId: string | null = null;
  private hoverInflightId: string | null = null;
  private lastHoverPrefetchAt = 0;

  constructor(private readonly resolver: PlaybackSourceResolver) {}

  private isSourceFresh(hit: PlaybackSource | undefined): boolean {
    if (!hit) return false;
    if (hit.kind === 'local') return true;
    if (hit.kind === 'remote') {
      const exp = hit.expiresAtMs;
      return exp == null || exp > Date.now() + EXPIRY_SAFETY_MARGIN_MS;
    }
    return false;
  }

  private writeCache(trackId: string, source: PlaybackSource): void {
    if (this.sourceCache.has(trackId)) this.sourceCache.delete(trackId);
    this.sourceCache.set(trackId, source);
    while (this.sourceCache.size > MAX_SOURCE_CACHE) {
      const oldest = this.sourceCache.keys().next().value;
      if (!oldest) break;
      this.sourceCache.delete(oldest);
    }
  }

  /** Cached source when fresh, else resolved + cached when playable. */
  async resolveSource(track: MediaTrack): Promise<PlaybackSource> {
    const hit = this.sourceCache.get(track.id);
    if (hit) {
      if (this.isSourceFresh(hit)) {
        // Refresh LRU order on hit.
        this.sourceCache.delete(track.id);
        this.sourceCache.set(track.id, hit);
        return hit;
      }
      // Expired remote or poisoned entry — drop and re-resolve.
      this.sourceCache.delete(track.id);
    }
    const resolved = await this.resolver.resolve(track);
    if (resolved.kind !== 'unavailable') this.writeCache(track.id, resolved);
    return resolved;
  }

  /** Evicts a poisoned URL (expired/blocked) so the next attempt re-extracts. */
  invalidateCachedSource(trackId: string): void {
    if (!trackId) return;
    this.sourceCache.delete(trackId);
  }

  /** Debounced single-slot hover warmup so rapid mouse sweeps cost zero requests. */
  scheduleHoverPrefetch(track: MediaTrack | null | undefined): void {
    if (!track?.id || track.mediaUri) return;
    if (this.isSourceFresh(this.sourceCache.get(track.id))) return;
    if (this.hoverInflightId) return;

    this.cancelHoverPrefetch();
    const targetId = track.id;
    this.hoverTargetId = targetId;
    this.hoverTimer = setTimeout(() => {
      this.hoverTimer = null;
      if (this.hoverTargetId !== targetId || this.hoverInflightId) return;
      if (this.isSourceFresh(this.sourceCache.get(targetId))) return;
      const now = Date.now();
      if (now - this.lastHoverPrefetchAt < HOVER_COOLDOWN_MS) return;

      this.hoverInflightId = targetId;
      this.lastHoverPrefetchAt = now;
      this.resolveSource(track)
        .catch(() => {})
        .finally(() => {
          if (this.hoverInflightId === targetId) this.hoverInflightId = null;
        });
    }, HOVER_DEBOUNCE_MS);
  }

  /** Cancels a pending debounced hover prefetch on pointer exit. */
  cancelHoverPrefetch(trackId?: string): void {
    if (trackId && this.hoverTargetId !== trackId) return;
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
    this.hoverTargetId = null;
  }

  /** Call when the current track changes — each boundary prefetches once. */
  resetPrefetch(): void {
    this.prefetchKey = null;
  }

  /**
   * Warms the next track's source in the background when the current track
   * is near its end. Fire-and-forget: never touches the player or UI.
   * Returns true when a warm-up was started.
   */
  maybePrefetchNext(
    current: MediaTrack | null,
    next: MediaTrack | null | undefined,
    durationSeconds: number,
    progressSeconds: number,
  ): boolean {
    if (!current || !next) return false;
    if (!shouldPrefetchNext(durationSeconds, progressSeconds, true)) return false;
    const key = `${current.id}->${next.id}`;
    if (this.prefetchKey === key) return false;
    this.prefetchKey = key;
    // Best-effort: failures simply mean no warm cache at the boundary.
    this.resolveSource(next).catch(() => {});
    return true;
  }

  saveSession(s: PlaybackSessionSnapshot): void {
    savePlaybackSession(s);
  }

  loadSession(): PlaybackSessionSnapshot | null {
    return loadPlaybackSession();
  }
}

export const playbackManager = new PlaybackManager(
  new PlaybackSourceResolver(ytMusicRemoteProvider),
);
