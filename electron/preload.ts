import { contextBridge, ipcRenderer } from 'electron';

export type DesktopHotkeyAction = 'playPause' | 'next' | 'prev' | 'miniPlayer';

export interface DesktopPrefs {
  closeToTray: boolean;
  minimizeToTray: boolean;
  trackNotifications: boolean;
  hotkeysEnabled: boolean;
  hotkeys: Record<DesktopHotkeyAction, string>;
}

export type DesktopPrefsPatch =
  Partial<Omit<DesktopPrefs, 'hotkeys'>> & { hotkeys?: Partial<Record<DesktopHotkeyAction, string>> };

export interface DesktopPlaybackState {
  hasTrack: boolean;
  title: string;
  artist: string;
  isPlaying: boolean;
}

export interface JumpListTrack {
  id: string;
  title: string;
  artist: string;
}

export interface DesktopLaunchAction {
  type: 'mini' | 'palette' | 'view' | 'play';
  view?: string;
  id?: string;
  title?: string;
  artist?: string;
}

export interface ElectronAPI {
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<boolean>;
  closeWindow: () => Promise<void>;
  isWindowMaximized: () => Promise<boolean>;
  setAlwaysOnTop: (on: boolean) => Promise<{ success: boolean }>;
  onWindowMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;
  getDesktopPrefs: () => Promise<DesktopPrefs>;
  setDesktopPrefs: (patch: DesktopPrefsPatch) => Promise<{ prefs: DesktopPrefs; conflicts: DesktopHotkeyAction[] }>;
  setMiniMode: (on: boolean) => Promise<{ mini: boolean }>;
  showMainWindow: () => Promise<boolean>;
  updateDesktopPlayback: (state: DesktopPlaybackState) => Promise<void>;
  showTrackNotification: (payload: { title: string; artist: string }) => Promise<{ shown: boolean }>;
  updateJumpList: (tracks: JumpListTrack[]) => Promise<{ ok: boolean }>;
  onMiniModeChange: (callback: (isMini: boolean) => void) => () => void;
  onGlobalMediaCommand: (callback: (action: 'playPause' | 'next' | 'prev') => void) => () => void;
  onOpenCommandPalette: (callback: () => void) => () => void;
  onLaunchAction: (callback: (action: DesktopLaunchAction) => void) => () => void;
  getStreamUrl: (videoId: string) => Promise<{ streamUrl: string; fromCache: boolean; expiresAtMs?: number | null }>;
  invalidateStreamUrl: (videoId: string) => Promise<void>;
  downloadTrack: (videoId: string) => Promise<{ path: string; sizeBytes: number; fromCache: boolean }>;
  deleteDownloadedFile: (filePath: string) => Promise<{ success: boolean }>;
  fileExists: (filePath: string) => Promise<boolean>;
  importPlaylistLink: (url: string) => Promise<{ title: string; tracks: any[] }>;
  onDownloadProgress: (callback: (data: { videoId: string; pct: number }) => void) => () => void;
  searchTracks: (query: string) => Promise<any[]>;
  saavnSearch: (query: string, limit?: number) => Promise<any[]>;
  saavnStream: (songId: string) => Promise<string | null>;
  getLibraryData: () => Promise<any>;
  saveLibraryData: (data: any) => Promise<{ success: boolean; error?: string }>;
  updateDiscordPresence: (payload: any) => Promise<void>;
  pokeDiscordPresence: () => Promise<void>;
  clearDiscordPresence: () => Promise<void>;
  setDiscordEnabled: (enabled: boolean) => Promise<void>;
  setDiscordClientId: (clientId: string) => Promise<void>;
  getDiscordStatus: () => Promise<{
    isConnected: boolean;
    isEnabled: boolean;
    clientId: string;
    joinableParty: { code: string; privacy: 'public' | 'private' } | null;
  }>;
  onDiscordJoinParty: (callback: (partyCode: string) => void) => () => void;
  onNavigateToView: (callback: (view: string) => void) => () => void;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  getUpdateCacheInfo: () => Promise<{ files: number; bytes: number }>;
  clearUpdateCache: () => Promise<{ files: number; bytes: number; skipped?: boolean }>;
  onUpdaterEvent: (callback: (data: any) => void) => () => void;
  openDevTools: () => Promise<boolean>;
}

const api: ElectronAPI = {
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  isWindowMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  setAlwaysOnTop: (on: boolean) => ipcRenderer.invoke('set-always-on-top', on),
  onWindowMaximizedChange: (callback: (isMaximized: boolean) => void) => {
    const subscription = (_event: any, isMaximized: boolean) => callback(isMaximized);
    ipcRenderer.on('window-maximized-state', subscription);
    return () => {
      ipcRenderer.removeListener('window-maximized-state', subscription);
    };
  },
  getDesktopPrefs: () => ipcRenderer.invoke('desktop-get-prefs'),
  setDesktopPrefs: (patch: DesktopPrefsPatch) => ipcRenderer.invoke('desktop-set-prefs', patch),
  setMiniMode: (on: boolean) => ipcRenderer.invoke('desktop-set-mini-mode', on),
  showMainWindow: () => ipcRenderer.invoke('desktop-show-window'),
  updateDesktopPlayback: (state: DesktopPlaybackState) => ipcRenderer.invoke('desktop-playback-state', state),
  showTrackNotification: (payload: { title: string; artist: string }) =>
    ipcRenderer.invoke('desktop-show-track-notification', payload),
  updateJumpList: (tracks: JumpListTrack[]) => ipcRenderer.invoke('desktop-set-jump-list', tracks),
  onMiniModeChange: (callback: (isMini: boolean) => void) => {
    const subscription = (_event: any, isMini: boolean) => callback(isMini);
    ipcRenderer.on('desktop-mini-mode', subscription);
    return () => {
      ipcRenderer.removeListener('desktop-mini-mode', subscription);
    };
  },
  onGlobalMediaCommand: (callback: (action: 'playPause' | 'next' | 'prev') => void) => {
    const subscription = (_event: any, action: 'playPause' | 'next' | 'prev') => callback(action);
    ipcRenderer.on('desktop-media-command', subscription);
    return () => {
      ipcRenderer.removeListener('desktop-media-command', subscription);
    };
  },
  onOpenCommandPalette: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on('desktop-open-palette', subscription);
    return () => {
      ipcRenderer.removeListener('desktop-open-palette', subscription);
    };
  },
  onLaunchAction: (callback: (action: DesktopLaunchAction) => void) => {
    const subscription = (_event: any, action: DesktopLaunchAction) => callback(action);
    ipcRenderer.on('desktop-launch-action', subscription);
    return () => {
      ipcRenderer.removeListener('desktop-launch-action', subscription);
    };
  },
  getStreamUrl: (videoId: string) => ipcRenderer.invoke('get-stream-url', videoId),
  invalidateStreamUrl: (videoId: string) => ipcRenderer.invoke('invalidate-stream', videoId),
  downloadTrack: (videoId: string) => ipcRenderer.invoke('download-track', videoId),
  deleteDownloadedFile: (filePath: string) => ipcRenderer.invoke('delete-downloaded-file', filePath),
  fileExists: (filePath: string) => ipcRenderer.invoke('file-exists', filePath),
  importPlaylistLink: (url: string) => ipcRenderer.invoke('import-playlist-link', url),
  onDownloadProgress: (callback: (data: { videoId: string; pct: number }) => void) => {
    const subscription = (_event: any, data: { videoId: string; pct: number }) => callback(data);
    ipcRenderer.on('download-progress', subscription);
    return () => {
      ipcRenderer.removeListener('download-progress', subscription);
    };
  },
  searchTracks: (query: string) => ipcRenderer.invoke('search-tracks', query),
  saavnSearch: (query: string, limit?: number) => ipcRenderer.invoke('saavn-search', query, limit),
  saavnStream: (songId: string) => ipcRenderer.invoke('saavn-stream', songId),
  getLibraryData: () => ipcRenderer.invoke('get-library-data'),
  saveLibraryData: (data: any) => ipcRenderer.invoke('save-library-data', data),
  updateDiscordPresence: (payload: any) => ipcRenderer.invoke('discord-update-activity', payload),
  pokeDiscordPresence: () => ipcRenderer.invoke('discord-poke'),
  clearDiscordPresence: () => ipcRenderer.invoke('discord-clear-activity'),
  setDiscordEnabled: (enabled: boolean) => ipcRenderer.invoke('discord-set-enabled', enabled),
  setDiscordClientId: (clientId: string) => ipcRenderer.invoke('discord-set-client-id', clientId),
  getDiscordStatus: () => ipcRenderer.invoke('discord-get-status'),
  onDiscordJoinParty: (callback: (partyCode: string) => void) => {
    const subscription = (_event: any, partyCode: string) => callback(partyCode);
    ipcRenderer.on('discord-join-party', subscription);
    return () => {
      ipcRenderer.removeListener('discord-join-party', subscription);
    };
  },
  onNavigateToView: (callback: (view: string) => void) => {
    const subscription = (_event: any, view: string) => callback(view);
    ipcRenderer.on('navigate-to-view', subscription);
    return () => {
      ipcRenderer.removeListener('navigate-to-view', subscription);
    };
  },
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getUpdateCacheInfo: () => ipcRenderer.invoke('update-cache-info'),
  clearUpdateCache: () => ipcRenderer.invoke('update-cache-clear'),
  onUpdaterEvent: (callback: (data: any) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('updater-event', subscription);
    return () => {
      ipcRenderer.removeListener('updater-event', subscription);
    };
  },
  openDevTools: () => ipcRenderer.invoke('open-dev-tools'),
};

contextBridge.exposeInMainWorld('electronAPI', api);
