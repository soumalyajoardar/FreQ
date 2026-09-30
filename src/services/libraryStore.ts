import { MediaTrack, UserPlaylist } from '../types';

interface StoredLibrary {
  likedTracks: MediaTrack[];
  userPlaylists: UserPlaylist[];
  recentlyPlayed: MediaTrack[];
  searchHistory: string[];
}

type Listener = () => void;

class LibraryStore {
  private likedTracks: MediaTrack[] = [];
  private userPlaylists: UserPlaylist[] = [];
  private recentlyPlayed: MediaTrack[] = [];
  private searchHistory: string[] = [];

  private listeners: Set<Listener> = new Set();
  private isLoaded = false;

  constructor() {
    this.init();
  }

  private async init() {
    if (this.isLoaded) return;
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.getLibraryData();
        if (data) {
          this.likedTracks = data.likedTracks || [];
          this.userPlaylists = data.userPlaylists || [];
          this.recentlyPlayed = data.recentlyPlayed || [];
          this.searchHistory = data.searchHistory || [];
        }
      } else {
        const raw = localStorage.getItem('freq_library_data');
        if (raw) {
          const parsed = JSON.parse(raw);
          this.likedTracks = parsed.likedTracks || [];
          this.userPlaylists = parsed.userPlaylists || [];
          this.recentlyPlayed = parsed.recentlyPlayed || [];
          this.searchHistory = parsed.searchHistory || [];
        }
      }
    } catch (e) {
      console.error('Failed to load library:', e);
    } finally {
      this.isLoaded = true;
      this.notify();
    }
  }

  private async persist() {
    const payload: StoredLibrary = {
      likedTracks: this.likedTracks,
      userPlaylists: this.userPlaylists,
      recentlyPlayed: this.recentlyPlayed,
      searchHistory: this.searchHistory,
    };

    try {
      if (window.electronAPI) {
        await window.electronAPI.saveLibraryData(payload);
      } else {
        localStorage.setItem('freq_library_data', JSON.stringify(payload));
      }
    } catch (e) {
      console.error('Failed to persist library:', e);
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  // --- Liked Tracks ---
  public getLikedTracks(): MediaTrack[] {
    return [...this.likedTracks];
  }

  public isLiked(trackId: string): boolean {
    return this.likedTracks.some(t => t.id === trackId);
  }

  public toggleLike(track: MediaTrack): boolean {
    const index = this.likedTracks.findIndex(t => t.id === track.id);
    let nowLiked = false;
    if (index >= 0) {
      this.likedTracks.splice(index, 1);
    } else {
      this.likedTracks.unshift(track);
      nowLiked = true;
    }
    this.persist();
    this.notify();
    return nowLiked;
  }

  // --- User Playlists ---
  public getUserPlaylists(): UserPlaylist[] {
    return [...this.userPlaylists];
  }

  public createPlaylist(title: string, description: string = ''): UserPlaylist {
    const newPlaylist: UserPlaylist = {
      id: `playlist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim() || 'My Playlist',
      description: description.trim(),
      createdAt: Date.now(),
      tracks: [],
      artworkUrl: null,
    };
    this.userPlaylists.unshift(newPlaylist);
    this.persist();
    this.notify();
    return newPlaylist;
  }

  public deletePlaylist(playlistId: string) {
    this.userPlaylists = this.userPlaylists.filter(p => p.id !== playlistId);
    this.persist();
    this.notify();
  }

  public renamePlaylist(playlistId: string, newTitle: string) {
    const pl = this.userPlaylists.find(p => p.id === playlistId);
    if (pl) {
      pl.title = newTitle.trim() || pl.title;
      this.persist();
      this.notify();
    }
  }

  public addTrackToPlaylist(playlistId: string, track: MediaTrack) {
    const pl = this.userPlaylists.find(p => p.id === playlistId);
    if (pl && !pl.tracks.some(t => t.id === track.id)) {
      pl.tracks.push(track);
      if (!pl.artworkUrl && track.artworkUrl) {
        pl.artworkUrl = track.artworkUrl;
      }
      this.persist();
      this.notify();
    }
  }

  public removeTrackFromPlaylist(playlistId: string, trackId: string) {
    const pl = this.userPlaylists.find(p => p.id === playlistId);
    if (pl) {
      pl.tracks = pl.tracks.filter(t => t.id !== trackId);
      if (pl.tracks.length > 0) {
        pl.artworkUrl = pl.tracks[0].artworkUrl || null;
      } else {
        pl.artworkUrl = null;
      }
      this.persist();
      this.notify();
    }
  }

  // --- Recently Played ---
  public getRecentlyPlayed(): MediaTrack[] {
    return [...this.recentlyPlayed];
  }

  public recordPlayed(track: MediaTrack) {
    this.recentlyPlayed = [
      track,
      ...this.recentlyPlayed.filter(t => t.id !== track.id),
    ].slice(0, 30);
    this.persist();
    this.notify();
  }

  // --- Search History ---
  public getSearchHistory(): string[] {
    return [...this.searchHistory];
  }

  public addSearchQuery(query: string) {
    const q = query.trim();
    if (!q) return;
    this.searchHistory = [q, ...this.searchHistory.filter(item => item !== q)].slice(0, 10);
    this.persist();
    this.notify();
  }

  public clearSearchHistory() {
    this.searchHistory = [];
    this.persist();
    this.notify();
  }
}

export const libraryStore = new LibraryStore();
