import { MediaTrack } from '../types';
import { libraryStore } from './libraryStore';

// Offline-file helpers. Downloaded tracks carry a `mediaUri` file URL so
// the normal resolver chain plays them locally (never touches network).

/** Absolute Windows path → loadable file:// URL. */
export function toFileUrl(absPath: string): string {
  const fwd = absPath.replace(/\\/g, '/');
  const noSlash = fwd.replace(/^\//, '');
  return encodeURI(`file:///${noSlash}`);
}

/**
 * Returns the track with its downloaded file attached when present and
 * intact. Drops stale records (file deleted outside the app) so a dead
 * path never reaches the player.
 */
export async function withLocalFile(track: MediaTrack): Promise<MediaTrack> {
  if (!track?.id || track.mediaUri) return track;
  const rec = libraryStore.getDownloaded().find(d => d.track.id === track.id);
  if (!rec) return track;
  try {
    if (window.electronAPI?.fileExists) {
      const ok = await window.electronAPI.fileExists(rec.path);
      if (!ok) {
        libraryStore.removeDownloaded(track.id);
        return track;
      }
    }
  } catch {
    return track;
  }
  return { ...track, mediaUri: toFileUrl(rec.path) };
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
