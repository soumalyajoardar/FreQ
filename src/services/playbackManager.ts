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

class PlaybackManager {
  private readonly sourceCache = new Map<string, PlaybackSource>();
  private prefetchKey: string | null = null;

  constructor(private readonly resolver: PlaybackSourceResolver) {}

  /** Cached source when fresh, else resolved + cached when playable. */
  async resolveSource(track: MediaTrack): Promise<PlaybackSource> {
    const hit = this.sourceCache.get(track.id);
    if (hit) {
      if (hit.kind === 'local') return hit;
      if (hit.kind === 'remote') {
        const exp = hit.expiresAtMs;
        if (exp == null || exp > Date.now() + EXPIRY_SAFETY_MARGIN_MS) return hit;
      }
      // Expired remote or poisoned entry — drop and re-resolve.
      this.sourceCache.delete(track.id);
    }
    const resolved = await this.resolver.resolve(track);
    if (resolved.kind !== 'unavailable') this.sourceCache.set(track.id, resolved);
    return resolved;
  }

  /** Evicts a poisoned URL (expired/blocked) so the next attempt re-extracts. */
  invalidateCachedSource(trackId: string): void {
    if (!trackId) return;
    this.sourceCache.delete(trackId);
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
