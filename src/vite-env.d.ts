/// <reference types="vite/client" />

import { ElectronAPI } from '../electron/preload';

declare global {
  const __APP_VERSION__: string;
  const __BUILD_ID__: string;
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
