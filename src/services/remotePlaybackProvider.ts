// RemotePlaybackProvider: resolves a playable stream for a track.
//
// Mirrors Android `player/RemotePlaybackProvider.kt` +
// `data/remote/YtMusicPlaybackProvider.kt`. Order is identical in spirit:
//
//  1. Local yt-dlp bridge (main process) — the Windows analog of Android's
//     on-device NewPipe extraction: resolution happens on the user's own
//     network, dodging datacenter bot-mitigation.
//  2. Cloud fallback `GET /api/playback/{id}` (yt-dlp on Vercel).
//  3. Browser-preview fallback: direct `/api/stream/{id}` URL.
//
// Per-track in-flight dedupe (mirrors Android's per-track Mutex map) so
// rapid taps never spawn duplicate extractions for the same track.

import { MediaTrack } from '../types';
import { isValidHttpsUrl, parseExpiryFromUrl, PlaybackSource } from './playbackSource';
import { jioSaavnService } from './jiosaavn';

const CLOUD_BASE = 'https://freq-api.vercel.app';
const SAAVN_PREFIX = 'saavn:';

export interface RemotePlaybackProvider {
  resolvePlaybackSource(track: MediaTrack): Promise<PlaybackSource>;
}

class YtMusicRemoteProvider implements RemotePlaybackProvider {
  private inflight = new Map<string, Promise<PlaybackSource>>();

  resolvePlaybackSource(track: MediaTrack): Promise<PlaybackSource> {
    if (!track?.id) return Promise.resolve({ kind: 'unavailable' });
    const existing = this.inflight.get(track.id);
    if (existing) return existing;
    const job = this.resolveInternal(track).finally(() => {
      if (this.inflight.get(track.id) === job) this.inflight.delete(track.id);
    });
    this.inflight.set(track.id, job);
    return job;
  }

  private async resolveInternal(track: MediaTrack): Promise<PlaybackSource> {
    // 0. Tracks that came from JioSaavn already carry a direct stream. Only a
    //    missing downloadUrl needs a lookup by id.
    if (track.id.startsWith(SAAVN_PREFIX)) {
      try {
        const url = await jioSaavnService.streamForId(track.id.slice(SAAVN_PREFIX.length));
        if (url && isValidHttpsUrl(url)) {
          return { kind: 'remote', url, mimeType: 'audio/mpeg', expiresAtMs: null };
        }
      } catch {
        // Fall through to the generic chain.
      }
    }

    // 1. Local yt-dlp bridge (own network first).
    try {
      if (window.electronAPI?.getStreamUrl) {
        const s = await window.electronAPI.getStreamUrl(track.id);
        if (s?.streamUrl && isValidHttpsUrl(s.streamUrl)) {
          return {
            kind: 'remote',
            url: s.streamUrl,
            expiresAtMs: s.expiresAtMs ?? parseExpiryFromUrl(s.streamUrl),
          };
        }
      }
    } catch {
      // Fall through to cloud.
    }

    // Browser preview has no bridge — stream straight from the cloud endpoint.
    if (!window.electronAPI) {
      return { kind: 'remote', url: `${CLOUD_BASE}/api/stream/${encodeURIComponent(track.id)}` };
    }

    // 2. Cloud yt-dlp fallback.
    try {
      const res = await fetch(`${CLOUD_BASE}/api/playback/${encodeURIComponent(track.id)}`);
      if (!res.ok) return { kind: 'unavailable' };
      const data: any = await res.json();
      const url = data?.streamUrl;
      if (data?.available && typeof url === 'string' && isValidHttpsUrl(url)) {
        const expiresIn = typeof data.expiresIn === 'number' && data.expiresIn > 0
          ? Date.now() + data.expiresIn * 1000
          : null;
        return {
          kind: 'remote',
          url,
          mimeType: data.mimeType || 'audio/webm',
          expiresAtMs: expiresIn ?? parseExpiryFromUrl(url),
        };
      }
    } catch {
      // Unavailable below.
    }

    // 3. JioSaavn by title — an independent catalog/stream when YouTube
    //    extraction is blocked or the cloud extractor is down.
    try {
      const url = await jioSaavnService.resolveStreamByTitle(track.title, track.artist);
      if (url && isValidHttpsUrl(url)) {
        return { kind: 'remote', url, mimeType: 'audio/mpeg', expiresAtMs: null };
      }
    } catch {
      // Unavailable below.
    }
    return { kind: 'unavailable' };
  }
}

export const ytMusicRemoteProvider = new YtMusicRemoteProvider();
