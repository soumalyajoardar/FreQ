import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<boolean>;
  closeWindow: () => Promise<void>;
  isWindowMaximized: () => Promise<boolean>;
  setAlwaysOnTop: (on: boolean) => Promise<{ success: boolean }>;
  onWindowMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;
  getStreamUrl: (videoId: string) => Promise<{ streamUrl: string; fromCache: boolean; expiresAtMs?: number | null }>;
  invalidateStreamUrl: (videoId: string) => Promise<void>;
  downloadTrack: (videoId: string) => Promise<{ path: string; sizeBytes: number; fromCache: boolean }>;
  deleteDownloadedFile: (filePath: string) => Promise<{ success: boolean }>;
  fileExists: (filePath: string) => Promise<boolean>;
  importPlaylistLink: (url: string) => Promise<{ title: string; tracks: any[] }>;
  onDownloadProgress: (callback: (data: { videoId: string; pct: number }) => void) => () => void;
  searchTracks: (query: string) => Promise<any[]>;
  getLibraryData: () => Promise<any>;
  saveLibraryData: (data: any) => Promise<{ success: boolean; error?: string }>;
  updateDiscordPresence: (payload: any) => Promise<void>;
  pokeDiscordPresence: () => Promise<void>;
  clearDiscordPresence: () => Promise<void>;
  setDiscordEnabled: (enabled: boolean) => Promise<void>;
  setDiscordClientId: (clientId: string) => Promise<void>;
  getDiscordStatus: () => Promise<{ isConnected: boolean; isEnabled: boolean; clientId: string }>;
  onDiscordJoinParty: (callback: (partyCode: string) => void) => () => void;
  onNavigateToView: (callback: (view: string) => void) => () => void;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  onUpdaterEvent: (callback: (data: any) => void) => () => void;
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
  onUpdaterEvent: (callback: (data: any) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('updater-event', subscription);
    return () => {
      ipcRenderer.removeListener('updater-event', subscription);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
