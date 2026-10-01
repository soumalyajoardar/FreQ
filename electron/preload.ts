import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<boolean>;
  closeWindow: () => Promise<void>;
  isWindowMaximized: () => Promise<boolean>;
  onWindowMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;
  getStreamUrl: (videoId: string) => Promise<{ streamUrl: string; fromCache: boolean }>;
  invalidateStreamUrl: (videoId: string) => Promise<void>;
  searchTracks: (query: string) => Promise<any[]>;
  getLibraryData: () => Promise<any>;
  saveLibraryData: (data: any) => Promise<{ success: boolean; error?: string }>;
  updateDiscordPresence: (payload: any) => Promise<void>;
  pokeDiscordPresence: () => Promise<void>;
  clearDiscordPresence: () => Promise<void>;
  setDiscordEnabled: (enabled: boolean) => Promise<void>;
  setDiscordClientId: (clientId: string) => Promise<void>;
  getDiscordStatus: () => Promise<{ isConnected: boolean; isEnabled: boolean; clientId: string }>;
}

const api: ElectronAPI = {
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  isWindowMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onWindowMaximizedChange: (callback: (isMaximized: boolean) => void) => {
    const subscription = (_event: any, isMaximized: boolean) => callback(isMaximized);
    ipcRenderer.on('window-maximized-state', subscription);
    return () => {
      ipcRenderer.removeListener('window-maximized-state', subscription);
    };
  },
  getStreamUrl: (videoId: string) => ipcRenderer.invoke('get-stream-url', videoId),
  invalidateStreamUrl: (videoId: string) => ipcRenderer.invoke('invalidate-stream', videoId),
  searchTracks: (query: string) => ipcRenderer.invoke('search-tracks', query),
  getLibraryData: () => ipcRenderer.invoke('get-library-data'),
  saveLibraryData: (data: any) => ipcRenderer.invoke('save-library-data', data),
  updateDiscordPresence: (payload: any) => ipcRenderer.invoke('discord-update-activity', payload),
  pokeDiscordPresence: () => ipcRenderer.invoke('discord-poke'),
  clearDiscordPresence: () => ipcRenderer.invoke('discord-clear-activity'),
  setDiscordEnabled: (enabled: boolean) => ipcRenderer.invoke('discord-set-enabled', enabled),
  setDiscordClientId: (clientId: string) => ipcRenderer.invoke('discord-set-client-id', clientId),
  getDiscordStatus: () => ipcRenderer.invoke('discord-get-status'),
};

contextBridge.exposeInMainWorld('electronAPI', api);
