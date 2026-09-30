import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<boolean>;
  closeWindow: () => Promise<void>;
  isWindowMaximized: () => Promise<boolean>;
  onWindowMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;
  getStreamUrl: (videoId: string) => Promise<{ streamUrl: string; fromCache: boolean }>;
  getLibraryData: () => Promise<any>;
  saveLibraryData: (data: any) => Promise<{ success: boolean; error?: string }>;
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
  getLibraryData: () => ipcRenderer.invoke('get-library-data'),
  saveLibraryData: (data: any) => ipcRenderer.invoke('save-library-data', data),
};

contextBridge.exposeInMainWorld('electronAPI', api);
