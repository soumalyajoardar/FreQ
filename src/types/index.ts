export interface MediaTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSeconds: number;
  artworkUrl: string | null;
  mediaUri?: string | null;
  provider?: string;
}

export type AudioMode = 'NORMAL' | 'SNR' | 'NIGHTCORE';

export type RepeatMode = 'OFF' | 'ALL' | 'ONE';

export interface SyncedLyricLine {
  timeMs: number;
  text: string;
}

export interface TrackLyrics {
  lines: string[];
  synced: SyncedLyricLine[];
}

export interface UserPlaylist {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  tracks: MediaTrack[];
  artworkUrl?: string | null;
  /** User-uploaded cover (compressed data URL). Takes priority over artworkUrl. */
  coverUrl?: string | null;
}

export interface SmartMix {
  id: string;
  title: string;
  description: string;
  tracks: MediaTrack[];
}

export interface DuplicateGroup {
  key: string;
  title: string;
  artist: string;
  copies: number;
}

export interface CatalogItem {
  type: 'song' | 'album' | 'playlist' | 'artist';
  id: string;
  title: string;
  artist?: string;
  artistId?: string | null;
  album?: string | null;
  year?: string | null;
  durationMs?: number;
  durationSeconds?: number;
  artworkUrl: string | null;
}

export interface CatalogSection {
  title: string;
  items: CatalogItem[];
}

export interface ArtistDetails {
  id: string;
  name: string;
  description?: string | null;
  artworkUrl?: string | null;
  topSongs: MediaTrack[];
  albums: CatalogItem[];
}

export interface AlbumDetails {
  id: string;
  title: string;
  artist: string;
  artistId?: string | null;
  year?: string | null;
  artworkUrl: string | null;
  tracks: MediaTrack[];
}

