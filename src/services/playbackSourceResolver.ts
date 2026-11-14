// PlaybackSourceResolver: ordered source chain for a track.
//
// Mirrors Android `player/PlaybackSourceResolver.kt`:
//   1. Local mediaUri (downloaded / file track) — never touches network.
//   2. Remote provider (yt-dlp bridge → cloud fallback).
//   3. Unavailable. Never throws.

import { MediaTrack } from '../types';
import { PlaybackSource } from './playbackSource';
import { RemotePlaybackProvider } from './remotePlaybackProvider';

export class PlaybackSourceResolver {
  constructor(private readonly remoteProvider?: RemotePlaybackProvider | null) {}

  async resolve(track: MediaTrack | null | undefined): Promise<PlaybackSource> {
    if (!track) return { kind: 'unavailable' };

    const raw = track.mediaUri;
    if (raw && raw.trim()) return { kind: 'local', url: raw };

    if (this.remoteProvider) {
      try {
        return await this.remoteProvider.resolvePlaybackSource(track);
      } catch {
        return { kind: 'unavailable' };
      }
    }
    return { kind: 'unavailable' };
  }
}
