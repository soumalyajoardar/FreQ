import { AudioMode, MediaTrack, UserPlaylist } from '../types';

interface StoredLibrary {
  likedTracks: MediaTrack[];
  userPlaylists: UserPlaylist[];
  recentlyPlayed: MediaTrack[];
  searchHistory: string[];
  discordClientId?: string;
  audioMode?: AudioMode;
  snrRate?: number;
  snrReverb?: number;
  nightcoreRate?: number;
  bassBoost?: number;
}

type Listener = () => void;

class LibraryStore {
  private likedTracks: MediaTrack[] = [];
  private userPlaylists: UserPlaylist[] = [];
  private recentlyPlayed: MediaTrack[] = [];
  private searchHistory: string[] = [];
  private discordClientId: string = '';
  private audioMode: AudioMode = 'SNR';
  private snrRate: number = 0.8;
  private snrReverb: number = 0.55;
  private nightcoreRate: number = 1.2;
  private bassBoost: number = 0;

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
          this.discordClientId = data.discordClientId || '';
          if (data.audioMode === 'SNR' || data.audioMode === 'NIGHTCORE' || data.audioMode === 'NORMAL') {
            this.audioMode = data.audioMode;
          }
          if (typeof data.snrRate === 'number') this.snrRate = Math.min(1, Math.max(0.5, data.snrRate));
          if (typeof data.snrReverb === 'number') this.snrReverb = Math.min(1, Math.max(0, data.snrReverb));
          if (typeof data.nightcoreRate === 'number') this.nightcoreRate = Math.min(1.5, Math.max(1.0, data.nightcoreRate));
          if (typeof data.bassBoost === 'number') this.bassBoost = Math.min(1, Math.max(0, data.bassBoost));
          if (this.discordClientId && window.electronAPI.setDiscordClientId) {
            window.electronAPI.setDiscordClientId(this.discordClientId);
          }
        }
      } else {
        const raw = localStorage.getItem('freq_library_data');
        if (raw) {
          const parsed = JSON.parse(raw);
          this.likedTracks = parsed.likedTracks || [];
          this.userPlaylists = parsed.userPlaylists || [];
          this.recentlyPlayed = parsed.recentlyPlayed || [];
          this.searchHistory = parsed.searchHistory || [];
          this.discordClientId = parsed.discordClientId || '';
          if (parsed.audioMode === 'SNR' || parsed.audioMode === 'NIGHTCORE' || parsed.audioMode === 'NORMAL') {
            this.audioMode = parsed.audioMode;
          }
          if (typeof parsed.snrRate === 'number') this.snrRate = Math.min(1, Math.max(0.5, parsed.snrRate));
          if (typeof parsed.snrReverb === 'number') this.snrReverb = Math.min(1, Math.max(0, parsed.snrReverb));
          if (typeof parsed.nightcoreRate === 'number') this.nightcoreRate = Math.min(1.5, Math.max(1.0, parsed.nightcoreRate));
          if (typeof parsed.bassBoost === 'number') this.bassBoost = Math.min(1, Math.max(0, parsed.bassBoost));
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
      discordClientId: this.discordClientId,
      audioMode: this.audioMode,
      snrRate: this.snrRate,
      snrReverb: this.snrReverb,
      nightcoreRate: this.nightcoreRate,
      bassBoost: this.bassBoost,
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

  public renamePlaylist(playlistId: string, newTitle: string, newDescription?: string) {
    const pl = this.userPlaylists.find(p => p.id === playlistId);
    if (pl) {
      const t = newTitle.trim();
      if (t) pl.title = t;
      if (newDescription !== undefined) pl.description = newDescription.trim();
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
      // Parity with Android derivePlaylistArtworkAfterRemove: first non-blank artwork
      const nextArt = pl.tracks.find(t => t.artworkUrl && t.artworkUrl.trim())?.artworkUrl || null;
      pl.artworkUrl = nextArt;
      this.persist();
      this.notify();
    }
  }

  public clearRecentlyPlayed() {
    this.recentlyPlayed = [];
    this.persist();
    this.notify();
  }

  public moveTrackInPlaylist(playlistId: string, fromIndex: number, toIndex: number): boolean {
    const pl = this.userPlaylists.find(p => p.id === playlistId);
    if (!pl) return false;
    if (fromIndex < 0 || fromIndex >= pl.tracks.length || toIndex < 0 || toIndex >= pl.tracks.length) return false;
    if (fromIndex === toIndex) return false;
    const updated = [...pl.tracks];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    pl.tracks = updated;
    this.persist();
    this.notify();
    return true;
  }

  // --- Recently Played ---
  public getRecentlyPlayed(): MediaTrack[] {
    return [...this.recentlyPlayed];
  }

  public recordPlayed(track: MediaTrack) {
    if (!track?.id) return;
    this.recentlyPlayed = [
      track,
      ...this.recentlyPlayed.filter(t => t.id !== track.id),
    ].slice(0, 50);
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
    // Parity with Android: case-insensitive dedup, max 20, front-move
    this.searchHistory = [q, ...this.searchHistory.filter(item => item.toLowerCase() !== q.toLowerCase())].slice(0, 20);
    this.persist();
    this.notify();
  }

  public clearSearchHistory() {
    this.searchHistory = [];
    this.persist();
    this.notify();
  }

  // --- Discord Client ID ---
  public getDiscordClientId(): string {
    return this.discordClientId;
  }

  public setDiscordClientId(id: string) {
    this.discordClientId = id.trim();
    this.persist();
    if (window.electronAPI?.setDiscordClientId) {
      window.electronAPI.setDiscordClientId(this.discordClientId || '1555196374067322940');
    }
    this.notify();
  }

  // --- Custom Audio Flavors (SnR tempo/reverb, Nightcore speed) ---
  public getAudioMode(): AudioMode {
    return this.audioMode;
  }

  public setAudioMode(mode: AudioMode) {
    if (mode !== 'SNR' && mode !== 'NIGHTCORE' && mode !== 'NORMAL') return;
    this.audioMode = mode;
    this.persist();
    this.notify();
  }

  public getSnrRate(): number {
    return this.snrRate;
  }

  public setSnrRate(rate: number) {
    this.snrRate = Math.min(1, Math.max(0.5, rate));
    this.persist();
    this.notify();
  }

  public getSnrReverb(): number {
    return this.snrReverb;
  }

  public setSnrReverb(amount: number) {
    this.snrReverb = Math.min(1, Math.max(0, amount));
    this.persist();
    this.notify();
  }

  public getNightcoreRate(): number {
    return this.nightcoreRate;
  }

  public setNightcoreRate(rate: number) {
    this.nightcoreRate = Math.min(1.5, Math.max(1.0, rate));
    this.persist();
    this.notify();
  }

  public getBassBoost(): number {
    return this.bassBoost;
  }

  public setBassBoost(amount: number) {
    this.bassBoost = Math.min(1, Math.max(0, amount));
    this.persist();
    this.notify();
  }
}

export const libraryStore = new LibraryStore();
