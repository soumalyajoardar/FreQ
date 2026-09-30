import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { discordRpcManager, DiscordActivityPayload } from './discordRpc';

const execFileAsync = promisify(execFile);

const logFile = path.join(__dirname, '../freq-debug.log');
function log(...args: any[]) {
  const msg = `[${new Date().toISOString()}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}\n`;
  try { fs.appendFileSync(logFile, msg); } catch {}
  console.log(...args);
}

process.on('uncaughtException', err => log('Uncaught Exception:', err));
process.on('unhandledRejection', err => log('Unhandled Rejection:', err));

let mainWindow: BrowserWindow | null = null;

// Audio stream cache: videoId -> { url: string, expiresAt: number }
const streamCache = new Map<string, { url: string; expiresAt: number }>();

// Path to verified local yt-dlp executable
const DEFAULT_YTDLP_PATH = 'S:\\PROJECTS\\WAVE\\backend-python\\.venv\\Scripts\\yt-dlp.exe';

function findYtDlpPath(): string {
  // 1. Packaged Electron extraResources path
  const packagedPath = path.join(process.resourcesPath, 'bin', 'yt-dlp.exe');
  if (fs.existsSync(packagedPath)) {
    return packagedPath;
  }
  // 2. Local WAVE dev environment path
  if (fs.existsSync(DEFAULT_YTDLP_PATH)) {
    return DEFAULT_YTDLP_PATH;
  }
  // 3. System PATH fallback
  return 'yt-dlp';
}

function getLibraryFilePath(): string {
  const userDataDir = app.getPath('userData');
  return path.join(userDataDir, 'freq_library.json');
}

function createWindow() {
  log('createWindow called');
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    frame: false, // Frameless for custom liquid-glass titlebar
    backgroundColor: '#090A0F',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Allow streaming audio & loading remote thumbnails seamlessly
    },
    show: true, // Show immediately
  });

  mainWindow.webContents.on('did-fail-load', (e, code, desc, url) => {
    log('did-fail-load:', code, desc, url);
  });
  mainWindow.webContents.on('render-process-gone', (e, details) => {
    log('render-process-gone:', details);
  });
  mainWindow.webContents.on('console-message', (_event, _level, message, line, sourceId) => {
    log(`[Renderer] ${message} (${sourceId}:${line})`);
  });

  mainWindow.on('close', () => {
    log('mainWindow close event');
  });
  mainWindow.on('closed', () => {
    log('mainWindow closed event');
    mainWindow = null;
  });

  mainWindow.once('ready-to-show', () => {
    log('mainWindow ready-to-show');
    mainWindow?.show();
  });

  // Handle window maximize state changes
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized-state', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximized-state', false);
  });

  // External links open in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    log('Loading dev URL:', process.env.VITE_DEV_SERVER_URL);
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    log('Loading file path:', indexPath, 'exists:', fs.existsSync(indexPath));
    mainWindow.loadFile(indexPath).catch(err => log('Failed loadFile:', err));
  }
}

log('Starting Electron main script...');
app.whenReady().then(() => {
  log('app.whenReady fired');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  log('app window-all-closed fired');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  log('app will-quit fired');
  discordRpcManager.destroy();
});
app.on('quit', () => {
  log('app quit fired');
});

// Window control IPC handlers
ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
  return mainWindow?.isMaximized();
});

ipcMain.handle('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() || false;
});

// yt-dlp Audio Stream Resolution IPC
ipcMain.handle('get-stream-url', async (_event, videoId: string) => {
  if (!videoId || typeof videoId !== 'string') {
    throw new Error('Valid videoId is required');
  }

  // 1. Check in-memory cache
  const cached = streamCache.get(videoId);
  if (cached && Date.now() < cached.expiresAt) {
    return { streamUrl: cached.url, fromCache: true };
  }

  const ytdlpPath = findYtDlpPath();

  try {
    // 2. Execute local yt-dlp with best audio format
    // Extracts direct googlevideo playback URL
    const { stdout } = await execFileAsync(
      ytdlpPath,
      [
        '-f', 'ba/ba*',
        '-g',
        `https://www.youtube.com/watch?v=${videoId}`
      ],
      { timeout: 15000 }
    );

    const streamUrl = stdout.trim().split('\n')[0]?.trim();
    if (streamUrl && streamUrl.startsWith('http')) {
      // Cache stream URL for 4 hours
      streamCache.set(videoId, {
        url: streamUrl,
        expiresAt: Date.now() + 4 * 60 * 60 * 1000,
      });
      return { streamUrl, fromCache: false };
    }
  } catch (err: any) {
    console.warn(`Local yt-dlp extraction warning for ${videoId}:`, err.message || err);
  }

  // 3. Fallback: Query FreQ cloud API
  try {
    const res = await fetch(`https://freq-api.vercel.app/api/playback/${videoId}`);
    const data: any = await res.json();
    if (data && data.available && data.streamUrl) {
      return { streamUrl: data.streamUrl, fromCache: false };
    }
  } catch (cloudErr) {
    console.error(`Cloud playback fallback failed for ${videoId}:`, cloudErr);
  }

  throw new Error(`Failed to resolve audio stream for track ${videoId}`);
});

// Local Library Storage IPC
ipcMain.handle('get-library-data', async () => {
  const filePath = getLibraryFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to read library file:', e);
  }
  return null;
});

ipcMain.handle('save-library-data', async (_event, payload: any) => {
  const filePath = getLibraryFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    return { success: true };
  } catch (e: any) {
    console.error('Failed to save library file:', e);
    return { success: false, error: e.message };
  }
});

// Local yt-dlp Track Search IPC Handler
ipcMain.handle('search-tracks', async (_event, query: string) => {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return [];
  }
  const ytdlpPath = findYtDlpPath();
  try {
    const { stdout } = await execFileAsync(
      ytdlpPath,
      [
        `ytsearch15:${query.trim()}`,
        '--dump-json',
        '--flat-playlist',
        '--no-warnings',
      ],
      { timeout: 15000 }
    );
    const lines = stdout.trim().split('\n').filter(Boolean);
    const results = [];
    for (const line of lines) {
      try {
        const item = JSON.parse(line);
        if (item.id && item.title) {
          results.push({
            id: item.id,
            title: item.title,
            artist: item.uploader || item.channel || 'YouTube Music',
            album: 'Single',
            durationSeconds: item.duration || 194,
            artworkUrl: item.thumbnails?.[item.thumbnails.length - 1]?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
            provider: 'youtube_music',
          });
        }
      } catch {}
    }
    return results;
  } catch (err: any) {
    console.error('yt-dlp search error:', err.message || err);
    return [];
  }
});

// Discord Rich Presence IPC Handlers
ipcMain.handle('discord-update-activity', (_event, payload: DiscordActivityPayload) => {
  discordRpcManager.updateActivity(payload);
});

ipcMain.handle('discord-clear-activity', () => {
  discordRpcManager.clearActivity();
});

ipcMain.handle('discord-set-enabled', (_event, enabled: boolean) => {
  discordRpcManager.setEnabled(enabled);
});

ipcMain.handle('discord-set-client-id', (_event, clientId: string) => {
  discordRpcManager.setClientId(clientId);
});

ipcMain.handle('discord-get-status', () => {
  return discordRpcManager.getStatus();
});


