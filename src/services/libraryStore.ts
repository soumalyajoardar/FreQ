import { AudioMode, MediaTrack, UserPlaylist } from '../types';

export type ShortcutAction = 'playPause' | 'next' | 'prev' | 'seekForward' | 'seekBack' | 'mute';

export interface ShortcutBinding {
  code: string;
  ctrl: boolean;
}

export const SHORTCUT_ACTIONS: { id: ShortcutAction; label: string }[] = [
  { id: 'playPause', label: 'Play / Pause' },
  { id: 'next', label: 'Next track' },
  { id: 'prev', label: 'Previous track' },
  { id: 'seekForward', label: 'Forward 5s' },
  { id: 'seekBack', label: 'Back 5s' },
  { id: 'mute', label: 'Mute' },
];

const DEFAULT_SHORTCUTS: Record<ShortcutAction, ShortcutBinding> = {
  playPause: { code: 'Space', ctrl: false },
  next: { code: 'ArrowRight', ctrl: true },
  prev: { code: 'ArrowLeft', ctrl: true },
  seekForward: { code: 'ArrowRight', ctrl: false },
  seekBack: { code: 'ArrowLeft', ctrl: false },
  mute: { code: 'KeyM', ctrl: false },
};

export function prettyShortcut(b: ShortcutBinding): string {
  const key = b.code === 'Space' ? 'Space'
    : b.code === 'ArrowRight' ? '→'
    : b.code === 'ArrowLeft' ? '←'
    : b.code === 'ArrowUp' ? '↑'
    : b.code === 'ArrowDown' ? '↓'
    : b.code.startsWith('Key') ? b.code.slice(3)
    : b.code.startsWith('Digit') ? b.code.slice(5)
    : b.code;
  return (b.ctrl ? 'Ctrl + ' : '') + key;
}

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
  stereoWidth?: number;
  hdClarity?: number;
  spatialEnabled?: boolean;
  spatialAngle?: number;
  spatialIntensity?: number;
  playStats?: PlayStatEntry[];
  eqGains?: number[];
  balance?: number;
  autoLevel?: boolean;
  trackTrims?: Record<string, number>;
  downloaded?: DownloadedTrack[];
  region?: string;
  regionPicked?: boolean;
  privateMode?: boolean;
  shortcuts?: Record<ShortcutAction, ShortcutBinding>;
}

export interface PlayStatEntry {
  track: MediaTrack;
  count: number;
  totalMs: number;
  lastPlayedAt: number;
  byDay: Record<string, number>;
}

export interface DownloadedTrack {
  track: MediaTrack;
  path: string;
  sizeBytes: number;
  downloadedAt: number;
}

const MAX_STAT_ENTRIES = 500;
const MAX_DAY_KEYS = 30;

function dayKey(ts: number = Date.now()): string {
  const d = new Date(ts);
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

type Listener = () => void;

export class LibraryStore {
  private likedTracks: MediaTrack[] = [];
  private userPlaylists: UserPlaylist[] = [];
  private recentlyPlayed: MediaTrack[] = [];
  private searchHistory: string[] = [];
  private discordClientId: string = '';
  private playStats: PlayStatEntry[] = [];
  private audioMode: AudioMode = 'SNR';
  private snrRate: number = 0.8;
  private snrReverb: number = 0.55;
  private nightcoreRate: number = 1.2;
  private bassBoost: number = 0.4;
  private stereoWidth: number = 0.35;
  private hdClarity: number = 0.45;
  private spatialEnabled: boolean = false;
  private spatialAngle: number = 0;
  private spatialIntensity: number = 0.65;
  private eqGains: number[] = [0, 0, 0, 0, 0];
  private balance: number = 0;
  private autoLevel: boolean = false;
  private trackTrims: Record<string, number> = {};
  private downloaded: DownloadedTrack[] = [];
  private region: string = 'IN';
  private regionPicked: boolean = false;
  private privateMode: boolean = false;
  private shortcuts: Record<ShortcutAction, ShortcutBinding> = { ...DEFAULT_SHORTCUTS };

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
          if (typeof data.bassBoost === 'number') {
            this.bassBoost = Math.min(1, Math.max(0, data.bassBoost));
          } else {
            this.bassBoost = 0.4;
          }
          if (typeof (data as any).stereoWidth === 'number') {
            this.stereoWidth = Math.min(1, Math.max(0, (data as any).stereoWidth));
          }
          if (typeof (data as any).hdClarity === 'number') {
            this.hdClarity = Math.min(1, Math.max(0, (data as any).hdClarity));
          }
          if (typeof (data as any).spatialEnabled === 'boolean') this.spatialEnabled = (data as any).spatialEnabled;
          if (typeof (data as any).spatialAngle === 'number') this.spatialAngle = Math.min(180, Math.max(-180, (data as any).spatialAngle));
          if (typeof (data as any).spatialIntensity === 'number') this.spatialIntensity = Math.min(1, Math.max(0, (data as any).spatialIntensity));
          if (Array.isArray((data as any).eqGains)) this.eqGains = [0, 1, 2, 3, 4].map(i => Number.isFinite((data as any).eqGains[i]) ? Math.min(12, Math.max(-12, (data as any).eqGains[i])) : 0);
          if (typeof (data as any).balance === 'number') this.balance = Math.min(1, Math.max(-1, (data as any).balance));
          if (typeof (data as any).autoLevel === 'boolean') this.autoLevel = (data as any).autoLevel;
          if ((data as any).trackTrims && typeof (data as any).trackTrims === 'object') this.trackTrims = { ...(data as any).trackTrims };
          if (typeof (data as any).region === 'string' && (data as any).region) this.region = (data as any).region;
          if (typeof (data as any).regionPicked === 'boolean') this.regionPicked = (data as any).regionPicked;
          if (typeof (data as any).privateMode === 'boolean') this.privateMode = (data as any).privateMode;
          if ((data as any).shortcuts && typeof (data as any).shortcuts === 'object') {
            for (const a of Object.keys(DEFAULT_SHORTCUTS) as ShortcutAction[]) {
              const b = (data as any).shortcuts[a];
              if (b && typeof b.code === 'string' && b.code) {
                this.shortcuts[a] = { code: b.code, ctrl: !!b.ctrl };
              }
            }
          }
          if (Array.isArray((data as any).downloaded)) this.downloaded = (data as any).downloaded.filter((d: any) => d && d.track && d.track.id && d.path).slice(0, 1000);
          if (Array.isArray((data as any).playStats)) this.playStats = (data as any).playStats.filter((s: any) => s && s.track && s.track.id).slice(0, MAX_STAT_ENTRIES);
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
          if (typeof parsed.bassBoost === 'number') {
            this.bassBoost = Math.min(1, Math.max(0, parsed.bassBoost));
          } else {
            this.bassBoost = 0.4;
          }
          if (typeof (parsed as any).stereoWidth === 'number') {
            this.stereoWidth = Math.min(1, Math.max(0, (parsed as any).stereoWidth));
          }
          if (typeof (parsed as any).hdClarity === 'number') {
            this.hdClarity = Math.min(1, Math.max(0, (parsed as any).hdClarity));
          }
          if (typeof (parsed as any).spatialEnabled === 'boolean') this.spatialEnabled = (parsed as any).spatialEnabled;
          if (typeof (parsed as any).spatialAngle === 'number') this.spatialAngle = Math.min(180, Math.max(-180, (parsed as any).spatialAngle));
          if (typeof (parsed as any).spatialIntensity === 'number') this.spatialIntensity = Math.min(1, Math.max(0, (parsed as any).spatialIntensity));
          if (Array.isArray(parsed.eqGains)) this.eqGains = [0, 1, 2, 3, 4].map(i => Number.isFinite(parsed.eqGains[i]) ? Math.min(12, Math.max(-12, parsed.eqGains[i])) : 0);
          if (typeof parsed.balance === 'number') this.balance = Math.min(1, Math.max(-1, parsed.balance));
          if (typeof parsed.autoLevel === 'boolean') this.autoLevel = parsed.autoLevel;
          if (parsed.trackTrims && typeof parsed.trackTrims === 'object') this.trackTrims = { ...parsed.trackTrims };
          if (typeof (parsed as any).region === 'string' && (parsed as any).region) this.region = (parsed as any).region;
          if (typeof (parsed as any).regionPicked === 'boolean') this.regionPicked = (parsed as any).regionPicked;
          if (typeof (parsed as any).privateMode === 'boolean') this.privateMode = (parsed as any).privateMode;
          if ((parsed as any).shortcuts && typeof (parsed as any).shortcuts === 'object') {
            for (const a of Object.keys(DEFAULT_SHORTCUTS) as ShortcutAction[]) {
              const b = (parsed as any).shortcuts[a];
              if (b && typeof b.code === 'string' && b.code) {
                this.shortcuts[a] = { code: b.code, ctrl: !!b.ctrl };
              }
            }
          }
          if (Array.isArray((parsed as any).downloaded)) this.downloaded = (parsed as any).downloaded.filter((d: any) => d && d.track && d.track.id && d.path).slice(0, 1000);
          if (Array.isArray(parsed.playStats)) this.playStats = parsed.playStats.filter((s: any) => s && s.track && s.track.id).slice(0, MAX_STAT_ENTRIES);
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
      stereoWidth: this.stereoWidth,
      hdClarity: this.hdClarity,
      spatialEnabled: this.spatialEnabled,
      spatialAngle: this.spatialAngle,
      spatialIntensity: this.spatialIntensity,
      playStats: this.playStats,
      eqGains: this.eqGains,
      balance: this.balance,
      autoLevel: this.autoLevel,
      trackTrims: this.trackTrims,
      downloaded: this.downloaded,
      region: this.region,
      regionPicked: this.regionPicked,
      privateMode: this.privateMode,
      shortcuts: this.shortcuts,
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
      coverUrl: null,
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

  /** Set or clear a user-uploaded playlist cover. Pass null to fall back to track artwork. */
  public setPlaylistCover(playlistId: string, coverUrl: string | null) {
    const pl = this.userPlaylists.find(p => p.id === playlistId);
    if (!pl) return;
    pl.coverUrl = coverUrl || null;
    this.persist();
    this.notify();
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

  /** Bulk add (single persist/notify): returns number actually added. */
  public addTracksToPlaylist(playlistId: string, tracks: MediaTrack[]): number {
    const pl = this.userPlaylists.find(p => p.id === playlistId);
    if (!pl) return 0;
    let added = 0;
    for (const track of tracks) {
      if (track?.id && !pl.tracks.some(t => t.id === track.id)) {
        pl.tracks.push(track);
        added += 1;
      }
    }
    if (added > 0) {
      if (!pl.artworkUrl) {
        pl.artworkUrl = pl.tracks.find(t => t.artworkUrl)?.artworkUrl || null;
      }
      this.persist();
      this.notify();
    }
    return added;
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

  // --- Play Stats (listening counts + minutes, powers Stats + Smart Mixes) ---
  public getPlayStats(): PlayStatEntry[] {
    return [...this.playStats].sort((a, b) => b.count - a.count);
  }

  public getTotalListenMs(): number {
    return this.playStats.reduce((sum, s) => sum + (s.totalMs || 0), 0);
  }

  /** A new track started rendering: count one play, refresh metadata. */
  public recordTrackStart(track: MediaTrack) {
    if (!track?.id || this.privateMode) return;
    const now = Date.now();
    const existing = this.playStats.find(s => s.track.id === track.id);
    if (existing) {
      existing.count += 1;
      existing.lastPlayedAt = now;
      existing.track = track;
    } else {
      this.playStats.unshift({ track, count: 1, totalMs: 0, lastPlayedAt: now, byDay: {} });
      if (this.playStats.length > MAX_STAT_ENTRIES) {
        this.playStats.sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
        this.playStats = this.playStats.slice(0, MAX_STAT_ENTRIES);
      }
    }
    this.persist();
    this.notify();
  }

  /** Bank listened milliseconds (called on skip / pause / track end). */
  public recordListenMs(trackId: string, ms: number) {
    if (this.privateMode) return;
    if (!trackId || !Number.isFinite(ms) || ms <= 0) return;
    const entry = this.playStats.find(s => s.track.id === trackId);
    if (!entry) return;
    const add = Math.round(ms);
    entry.totalMs += add;
    const key = dayKey();
    entry.byDay[key] = (entry.byDay[key] || 0) + add;
    const keys = Object.keys(entry.byDay).sort();
    while (keys.length > MAX_DAY_KEYS) {
      const oldest = keys.shift();
      if (oldest) delete entry.byDay[oldest];
    }
    this.persist();
    this.notify();
  }

  public clearPlayStats() {
    this.playStats = [];
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
    if (!track?.id || this.privateMode) return;
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

  public getStereoWidth(): number {
    return this.stereoWidth;
  }

  public setStereoWidth(amount: number) {
    this.stereoWidth = Math.min(1, Math.max(0, amount));
    this.persist();
    this.notify();
  }

  public getHdClarity(): number {
    return this.hdClarity;
  }

  public setHdClarity(amount: number) {
    this.hdClarity = Math.min(1, Math.max(0, amount));
    this.persist();
    this.notify();
  }

  public getSpatialEnabled(): boolean {
    return this.spatialEnabled;
  }

  public getSpatialAngle(): number {
    return this.spatialAngle;
  }

  public getSpatialIntensity(): number {
    return this.spatialIntensity;
  }

  public setSpatial(enabled: boolean, angle?: number, intensity?: number) {
    this.spatialEnabled = !!enabled;
    if (typeof angle === 'number' && Number.isFinite(angle)) {
      this.spatialAngle = Math.min(180, Math.max(-180, angle));
    }
    if (typeof intensity === 'number' && Number.isFinite(intensity)) {
      this.spatialIntensity = Math.min(1, Math.max(0, intensity));
    }
    this.persist();
    this.notify();
  }

  // --- Tone stack: 5-band EQ, balance, auto-level, per-track trims ---
  public getEqGains(): number[] {
    return [...this.eqGains];
  }

  public setEqGains(gains: number[]) {
    this.eqGains = [0, 1, 2, 3, 4].map(i =>
      Number.isFinite(gains[i]) ? Math.min(12, Math.max(-12, gains[i])) : 0,
    );
    this.persist();
    this.notify();
  }

  public getBalance(): number {
    return this.balance;
  }

  public setBalance(pan: number) {
    this.balance = Number.isFinite(pan) ? Math.min(1, Math.max(-1, pan)) : 0;
    this.persist();
    this.notify();
  }

  public getAutoLevel(): boolean {
    return this.autoLevel;
  }

  public setAutoLevel(on: boolean) {
    this.autoLevel = !!on;
    this.persist();
    this.notify();
  }

  public getTrackTrims(): Record<string, number> {
    return { ...this.trackTrims };
  }

  public getTrackTrim(trackId: string): number {
    return this.trackTrims[trackId] || 0;
  }

  public adjustTrackTrim(trackId: string, deltaDb: number) {
    if (!trackId) return 0;
    const next = Math.min(12, Math.max(-12, (this.trackTrims[trackId] || 0) + deltaDb));
    if (next === 0) delete this.trackTrims[trackId];
    else this.trackTrims[trackId] = Math.round(next * 10) / 10;
    this.persist();
    this.notify();
    return this.trackTrims[trackId] || 0;
  }

  public resetTrackTrim(trackId: string) {
    if (!trackId) return;
    delete this.trackTrims[trackId];
    this.persist();
    this.notify();
  }

  // --- Listening region (first-launch onboarding, drives Home rails) ---
  public getRegion(): string {
    return this.region || 'IN';
  }

  public isRegionPicked(): boolean {
    return this.regionPicked;
  }

  public setRegion(code: string) {
    if (!code) return;
    this.region = code;
    this.regionPicked = true;
    this.persist();
    this.notify();
  }

  // --- Private mode: nothing recorded, Discord shows browsing ---
  public isPrivateMode(): boolean {
    return this.privateMode;
  }

  public setPrivateMode(on: boolean) {
    this.privateMode = !!on;
    this.persist();
    this.notify();
  }

  // --- Custom keyboard shortcuts (swap on conflict, reset to defaults) ---
  public getShortcuts(): Record<ShortcutAction, ShortcutBinding> {
    return { ...this.shortcuts };
  }

  public setShortcut(action: ShortcutAction, binding: ShortcutBinding) {
    const clean: ShortcutBinding = {
      code: typeof binding.code === 'string' && binding.code ? binding.code : 'Space',
      ctrl: !!binding.ctrl,
    };
    // Swap with whoever holds this combo so no two actions collide.
    for (const id of Object.keys(this.shortcuts) as ShortcutAction[]) {
      if (id !== action) {
        const cur = this.shortcuts[id];
        if (cur.code === clean.code && cur.ctrl === clean.ctrl) {
          this.shortcuts[id] = { ...this.shortcuts[action] };
        }
      }
    }
    this.shortcuts[action] = clean;
    this.persist();
    this.notify();
  }

  public resetShortcuts() {
    this.shortcuts = { ...DEFAULT_SHORTCUTS };
    this.persist();
    this.notify();
  }

  /** Normalized identity for duplicate detection (title + artist). */
  public static duplicateKey(t: MediaTrack): string {
    const norm = (s: string) =>
      (s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
    return `${norm(t.title)}|${norm(t.artist)}`;
  }

  /** Removes duplicate copies across liked + playlists, keeping the first. */
  public removeDuplicateTracks(): number {
    const seen = new Set<string>();
    let removed = 0;
    const keep = (t: MediaTrack): boolean => {
      const k = LibraryStore.duplicateKey(t);
      if (seen.has(k)) {
        removed += 1;
        return false;
      }
      seen.add(k);
      return true;
    };
    this.likedTracks = this.likedTracks.filter(keep);
    for (const pl of this.userPlaylists) {
      pl.tracks = pl.tracks.filter(keep);
    }
    this.persist();
    this.notify();
    return removed;
  }

  // --- Offline Downloads (file records; binaries live in userData/downloads) ---
  public getDownloaded(): DownloadedTrack[] {
    return [...this.downloaded];
  }

  public isDownloaded(trackId: string): boolean {
    return this.downloaded.some(d => d.track.id === trackId);
  }

  public getDownloadedBytes(): number {
    return this.downloaded.reduce((sum, d) => sum + (d.sizeBytes || 0), 0);
  }

  public recordDownloaded(track: MediaTrack, filePath: string, sizeBytes: number) {
    if (!track?.id || !filePath) return;
    this.downloaded = [
      { track, path: filePath, sizeBytes: sizeBytes || 0, downloadedAt: Date.now() },
      ...this.downloaded.filter(d => d.track.id !== track.id),
    ].slice(0, 1000);
    this.persist();
    this.notify();
  }

  /** Drops the record; returns the file path so the caller can delete it. */
  public removeDownloaded(trackId: string): string | null {
    const found = this.downloaded.find(d => d.track.id === trackId);
    if (!found) return null;
    this.downloaded = this.downloaded.filter(d => d.track.id !== trackId);
    this.persist();
    this.notify();
    return found.path;
  }

  // --- Import / Export (JSON full-fidelity, M3U portable) ---
  public exportLibraryJSON(): string {
    return JSON.stringify(
      {
        app: 'freq',
        version: 1,
        exportedAt: Date.now(),
        likedTracks: this.likedTracks,
        userPlaylists: this.userPlaylists,
      },
      null,
      2,
    );
  }

  public exportLibraryM3U(): string {
    const lines = ['#EXTM3U'];
    const push = (t: MediaTrack) => {
      lines.push(`#EXTINF:-1,${t.artist || 'Unknown Artist'} - ${t.title || 'Untitled'}`);
      lines.push(
        t.id && /^[A-Za-z0-9_-]{11}$/.test(t.id)
          ? `https://music.youtube.com/watch?v=${t.id}`
          : t.title || 'unknown',
      );
    };
    if (this.likedTracks.length > 0) {
      lines.push('', '#PLAYLIST:Liked Songs');
      this.likedTracks.forEach(push);
    }
    for (const pl of this.userPlaylists) {
      lines.push('', `#PLAYLIST:${pl.title}`);
      pl.tracks.forEach(push);
    }
    return lines.join('\n');
  }

  /** Imports a FreQ JSON export. Returns counts for the toast. */
  public importLibraryJSON(raw: string): { playlists: number; tracks: number; skipped: number } {
    const data = JSON.parse(raw);
    const lists: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.userPlaylists)
        ? data.userPlaylists
        : Array.isArray(data?.playlists)
          ? data.playlists
          : [];
    let playlists = 0;
    let tracks = 0;
    let skipped = 0;
    const validTrack = (t: any): MediaTrack | null => {
      if (!t || typeof t.id !== 'string' || !t.id) {
        skipped += 1;
        return null;
      }
      return {
        id: t.id,
        title: typeof t.title === 'string' && t.title ? t.title : 'Unknown Title',
        artist: typeof t.artist === 'string' && t.artist ? t.artist : 'Unknown Artist',
        album: typeof t.album === 'string' && t.album ? t.album : 'Single',
        durationSeconds: typeof t.durationSeconds === 'number' && t.durationSeconds > 0 ? t.durationSeconds : 194,
        artworkUrl: typeof t.artworkUrl === 'string' ? t.artworkUrl : null,
        provider: 'youtube_music',
      };
    };
    if (Array.isArray(data?.likedTracks)) {
      for (const t of data.likedTracks) {
        const vt = validTrack(t);
        if (vt && !this.likedTracks.some(x => x.id === vt.id)) {
          this.likedTracks.unshift(vt);
          tracks += 1;
        }
      }
    }
    for (const pl of lists) {
      if (!pl || typeof pl.title !== 'string' || !Array.isArray(pl.tracks)) {
        skipped += 1;
        continue;
      }
      const created = this.createPlaylist(pl.title, typeof pl.description === 'string' ? pl.description : '');
      playlists += 1;
      for (const t of pl.tracks) {
        const vt = validTrack(t);
        if (vt) {
          created.tracks.push(vt);
          tracks += 1;
        }
      }
      if (!created.artworkUrl) {
        created.artworkUrl = created.tracks.find(t => t.artworkUrl)?.artworkUrl || null;
      }
    }
    this.persist();
    this.notify();
    return { playlists, tracks, skipped };
  }

  /** Parses an M3U playlist (YouTube URLs → ids, EXTINF → titles). */
  public static parseM3UTracks(text: string): MediaTrack[] {
    const out: MediaTrack[] = [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let pendingTitle: string | null = null;
    const idFromUrl = (url: string): string | null => {
      const m = /(?:youtube\.com\/(?:watch\?.*v=|shorts\/)|youtu\.be\/|music\.youtube\.com\/watch\?.*v=)([A-Za-z0-9_-]{11})/.exec(url);
      return m ? m[1] : null;
    };
    for (const line of lines) {
      if (line.startsWith('#EXTINF')) {
        const comma = line.indexOf(',');
        pendingTitle = comma !== -1 ? line.slice(comma + 1).trim() : null;
        continue;
      }
      if (line.startsWith('#')) continue;
      const id = idFromUrl(line);
      if (!id) continue;
      let title = 'Unknown Title';
      let artist = 'Unknown Artist';
      if (pendingTitle) {
        const sep = pendingTitle.indexOf(' - ');
        if (sep !== -1) {
          artist = pendingTitle.slice(0, sep).trim() || artist;
          title = pendingTitle.slice(sep + 3).trim() || title;
        } else {
          title = pendingTitle;
        }
      }
      out.push({ id, title, artist, album: 'Single', durationSeconds: 194, artworkUrl: null, provider: 'youtube_music' });
      pendingTitle = null;
    }
    return out;
  }

  public importM3UTracks(name: string, tracks: MediaTrack[]): { playlist: string; tracks: number } {
    const created = this.createPlaylist(name || 'Imported Playlist');
    const seen = new Set<string>();
    for (const t of tracks) {
      if (!t.id || seen.has(t.id)) continue;
      seen.add(t.id);
      created.tracks.push(t);
    }
    if (!created.artworkUrl) {
      created.artworkUrl = created.tracks.find(t => t.artworkUrl)?.artworkUrl || null;
    }
    this.persist();
    this.notify();
    return { playlist: created.title, tracks: created.tracks.length };
  }
}

export const libraryStore = new LibraryStore();
