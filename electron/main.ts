import { app, BrowserWindow, ipcMain, shell, Notification } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { execFile, spawn } from 'child_process';
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

// "Pin window on top" intent. The actual topmost flag is derived from this and
// from the window state: a pinned window is a small floating player, so it is
// never allowed to be topmost while maximized or full screen.
let pinWanted = false;

function applyPin() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const shouldPin = pinWanted && !mainWindow.isMaximized() && !mainWindow.isFullScreen();
  try {
    if (shouldPin) {
      mainWindow.setAlwaysOnTop(true, 'floating');
    } else {
      mainWindow.setAlwaysOnTop(false);
    }
  } catch {
    // Ignore: window may be closing.
  }
}

// Required for Windows toast notifications to attribute correctly.
if (process.platform === 'win32') {
  app.setAppUserModelId('com.freq.music');
}

// Audio stream cache: videoId -> { url, expiresAt }. Expiry comes from the
// googlevideo `?expire=` param when present (true URL lifetime), else a
// 4h fallback. Reads apply a 60s safety margin (Android parity).
const streamCache = new Map<string, { url: string; expiresAt: number }>();
// In-flight extractions per videoId (Android per-track Mutex parity):
// concurrent taps share one yt-dlp run instead of spawning duplicates.
const streamInflight = new Map<string, Promise<{ streamUrl: string; fromCache: boolean; expiresAtMs: number | null }>>();

/** True googlevideo expiry from `?expire=<unix-sec>`, else null. */
function parseStreamExpiryMs(url: string): number | null {
  try {
    const exp = new URL(url).searchParams.get('expire');
    if (!exp) return null;
    const sec = parseInt(exp, 10);
    return Number.isFinite(sec) && sec > 0 ? sec * 1000 : null;
  } catch {
    return null;
  }
}

/** Only HTTPS URLs with a real host are accepted as streams. */
function isValidStreamUrl(url: string): boolean {
  if (!url || !url.startsWith('https://')) return false;
  try {
    return !!new URL(url).host;
  } catch {
    return false;
  }
}

interface YtDlpCommand { cmd: string; prefixArgs: string[]; }

function resolveYtDlp(): YtDlpCommand {
  // 1. Packaged Electron extraResources path
  try {
    const packagedPath = path.join(process.resourcesPath, 'bin', 'yt-dlp.exe');
    if (fs.existsSync(packagedPath)) {
      return { cmd: packagedPath, prefixArgs: [] };
    }
  } catch {}
  // 1.5 Local workspace / app build directory
  try {
    const localBuildPath = path.resolve(app.getAppPath(), 'build', 'yt-dlp.exe');
    if (fs.existsSync(localBuildPath)) {
      return { cmd: localBuildPath, prefixArgs: [] };
    }
  } catch {}
  try {
    const devBuildPath = path.resolve(__dirname, '../build/yt-dlp.exe');
    if (fs.existsSync(devBuildPath)) {
      return { cmd: devBuildPath, prefixArgs: [] };
    }
  } catch {}
  // 2. Venv python -m yt_dlp (robust against venv moves; .exe shims carry absolute paths)
  const siblingPython = path.resolve(__dirname, '../../Android/backend-python/.venv/Scripts/python.exe');
  try {
    if (fs.existsSync(siblingPython)) {
      return { cmd: siblingPython, prefixArgs: ['-m', 'yt_dlp'] };
    }
  } catch {}
  // 3. Direct exe in the sibling backend (may be stale after folder moves)
  try {
    const siblingExe = path.resolve(__dirname, '../../Android/backend-python/.venv/Scripts/yt-dlp.exe');
    if (fs.existsSync(siblingExe)) {
      return { cmd: siblingExe, prefixArgs: [] };
    }
  } catch {}
  // 4. System PATH fallback
  return { cmd: 'yt-dlp', prefixArgs: [] };
}

function getLibraryFilePath(): string {
  const userDataDir = app.getPath('userData');
  return path.join(userDataDir, 'freq_library.json');
}

function createWindow() {
  log('createWindow called');
  mainWindow = new BrowserWindow({
    width: 1536,
    height: 864,
    minWidth: 700,
    minHeight: 460,
    frame: false, // Frameless for custom liquid-glass titlebar
    backgroundColor: '#090A0F',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // Keep running at full speed even when unfocused or behind another window
      webSecurity: false, // Allow streaming audio & loading remote thumbnails seamlessly
    },
    show: true,
  });

  // Lock aspect ratio to 16:9
  // mainWindow.setAspectRatio(16 / 9); // Unlocked for responsive snapping

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
    // Open close to fullscreen (frameless custom chrome handles the rest)
    mainWindow?.maximize();
    applyPin();
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Handle window maximize state changes
  mainWindow.on('maximize', () => {
    // Re-evaluate the pin: a maximized window must never sit on top of
    // everything else (see applyPin).
    applyPin();
    mainWindow?.webContents.send('window-maximized-state', true);
  });
  mainWindow.on('unmaximize', () => {
    applyPin();
    mainWindow?.webContents.send('window-maximized-state', false);
  });
  mainWindow.on('enter-full-screen', applyPin);
  mainWindow.on('leave-full-screen', applyPin);

  // Self-heal: if anything outside the app (a shell utility, a stray
  // setAlwaysOnTop, a restored session) left the maximized window topmost,
  // drop that flag the next time it takes focus or loses focus (blur).
  // Alt+Tab would otherwise keep landing behind a window that covers the whole screen.
  mainWindow.on('focus', () => {
    if (mainWindow?.isMaximized() || mainWindow?.isFullScreen()) applyPin();
  });
  mainWindow.on('blur', () => {
    if (mainWindow?.isMaximized() || mainWindow?.isFullScreen()) applyPin();
  });

  // Track window bounds on minimize/restore for frameless custom chrome
  mainWindow.on('minimize', () => {
    const bounds = mainWindow.getBounds();
    mainWindow.webContents.send('window-minimized', { bounds });
  });
  mainWindow.on('restore', () => {
    applyPin();
    mainWindow.webContents.send('window-restored');
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
// --- AUTO UPDATER (GitHub Releases) ---
// electron-builder publishes latest.yml + the NSIS installer to
// https://github.com/soumalyajoardar/FreQ/releases.
const UPDATER_OWNER = 'soumalyajoardar';
const UPDATER_REPO = 'FreQ';

autoUpdater.autoDownload = false; // We want user to confirm
autoUpdater.autoInstallOnAppQuit = true;

// Logger for updater events
autoUpdater.logger = {
  info: (msg: any) => log('[autoUpdater info]', msg),
  warn: (msg: any) => log('[autoUpdater warn]', msg),
  error: (msg: any) => log('[autoUpdater error]', msg),
  debug: (msg: any) => log('[autoUpdater debug]', msg),
};

// Bypass code signature check on unsigned community Windows builds
try {
  (autoUpdater as any).verifyUpdateCodeSignature = () => null;
} catch {}

function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string) => v.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  const l = parse(latest);
  const c = parse(current);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const lPart = l[i] ?? 0;
    const cPart = c[i] ?? 0;
    if (lPart > cPart) return true;
    if (lPart < cPart) return false;
  }
  return false;
}

let cachedLatestRelease: any = null;

async function checkGitHubReleasesDirectly(): Promise<boolean> {
  try {
    const res = await fetch(`https://api.github.com/repos/${UPDATER_OWNER}/${UPDATER_REPO}/releases/latest`, {
      headers: {
        'User-Agent': 'FreQ-Desktop',
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    if (!res.ok) {
      log('Direct release fetch status:', res.status);
      return false;
    }
    const release = await res.json();
    const tag = (release.tag_name || '').replace(/^v/i, '');
    const currentVer = app.getVersion();
    cachedLatestRelease = release;

    if (tag && isNewerVersion(tag, currentVer)) {
      log(`Direct check: update available (latest ${tag} > current ${currentVer})`);
      sendUpdaterEvent({
        type: 'update-available',
        info: {
          version: tag,
          releaseName: release.name || `FreQ v${tag}`,
          releaseNotes: release.body || '',
          releaseDate: release.published_at,
          downloadUrl: release.html_url,
          assets: release.assets,
        },
      });
      showUpdateNotification(tag);
      return true;
    } else {
      log(`Direct check: app is up to date (${currentVer})`);
      sendUpdaterEvent({
        type: 'update-not-available',
        info: { version: currentVer },
      });
      return true;
    }
  } catch (err: any) {
    log('Direct GitHub release check failed:', err.message || err);
    return false;
  }
}

function sendUpdaterEvent(payload: any) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater-event', payload);
  }
}

// Native Windows toast when a new release is found. Once per version, with a
// 24h cooldown, so a pending update is announced without nagging on every
// launch. Clicking the toast focuses FreQ and opens the update card.
const UPDATE_NOTIFY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function showUpdateNotification(version: string) {
  if (!version) return;

  let alreadyNotified = false;
  try {
    const file = path.join(app.getPath('userData'), 'freq_update_notified.json');
    let last: { version?: string; at?: number } = {};
    try {
      last = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {}
    if (last.version === version && Date.now() - (last.at || 0) < UPDATE_NOTIFY_COOLDOWN_MS) {
      alreadyNotified = true;
    } else {
      fs.writeFileSync(file, JSON.stringify({ version, at: Date.now() }));
    }
  } catch {}

  if (alreadyNotified || !Notification.isSupported()) return;

  try {
    const iconPath = path.join(app.getAppPath(), 'build', 'icon.png');
    const notification = new Notification({
      title: 'FreQ update available',
      body: `Version ${version} is ready to download. Open FreQ Settings to update.`,
      icon: fs.existsSync(iconPath) ? iconPath : undefined,
    });
    notification.on('click', () => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('navigate-to-view', 'settings');
    });
    notification.show();
    log('Update notification shown for', version);
  } catch (err: any) {
    log('Update notification failed:', err?.message || err);
  }
}

function reportUpdaterError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  log('Updater error:', message);
  sendUpdaterEvent({ type: 'error', error: message });
}

// Packaged builds read the feed. Dev/unpackaged runs skip it so a local
// Electron session can never overwrite itself with a released build.
if (app.isPackaged) {
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: UPDATER_OWNER,
    repo: UPDATER_REPO,
  });
}

ipcMain.handle('check-for-updates', async () => {
  log('check-for-updates triggered');
  sendUpdaterEvent({ type: 'checking-for-update' });

  // 1. Try electron-updater in packaged mode
  if (app.isPackaged) {
    try {
      const res = await autoUpdater.checkForUpdates();
      if (res && res.updateInfo) {
        log('autoUpdater check succeeded:', res.updateInfo.version);
        return;
      }
    } catch (err: any) {
      log('autoUpdater check failed, trying direct GitHub fallback:', err?.message || err);
    }
  }

  // 2. Direct GitHub Release API check (fallback & unpackaged testing)
  const handled = await checkGitHubReleasesDirectly();
  if (!handled) {
    reportUpdaterError('Could not check for updates. Please check your internet connection and try again.');
  }
});

ipcMain.handle('download-update', async () => {
  log('download-update triggered');
  try {
    if (app.isPackaged) {
      await autoUpdater.downloadUpdate();
      return;
    }
  } catch (err) {
    log('autoUpdater.downloadUpdate failed, opening release in browser:', err);
  }

  // Fallback: open the GitHub release download in browser
  const releaseUrl = cachedLatestRelease?.html_url || ('https://github.com/' + UPDATER_OWNER + '/' + UPDATER_REPO + '/releases/latest');
  shell.openExternal(releaseUrl);
  sendUpdaterEvent({ type: 'update-downloaded', info: { version: cachedLatestRelease?.tag_name || 'latest' } });
});

ipcMain.handle('install-update', () => {
  log('install-update triggered');
  try {
    autoUpdater.quitAndInstall();
  } catch (err) {
    reportUpdaterError(err);
  }
});

autoUpdater.on('checking-for-update', () => {
  sendUpdaterEvent({ type: 'checking-for-update' });
});
autoUpdater.on('update-available', (info) => {
  sendUpdaterEvent({ type: 'update-available', info });
  showUpdateNotification(info?.version);
});
autoUpdater.on('update-not-available', (info) => {
  sendUpdaterEvent({ type: 'update-not-available', info });
});
autoUpdater.on('error', (err) => {
  reportUpdaterError(err);
});
autoUpdater.on('download-progress', (progressObj) => {
  sendUpdaterEvent({ type: 'download-progress', progress: progressObj.percent });
});
autoUpdater.on('update-downloaded', (info) => {
  sendUpdaterEvent({ type: 'update-downloaded', info });
});

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
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    applyPin();
    return false;
  } else {
    mainWindow.maximize();
    applyPin();
    return true;
  }
});

ipcMain.handle('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() || false;
});

// Keep the window above all others (mini-player pin). The pin is only ever
// honoured for a floating (non-maximized, non-fullscreen) window — a topmost
// maximized window covers the entire desktop and makes Alt+Tab look broken.
ipcMain.handle('set-always-on-top', (_event, on: boolean) => {
  pinWanted = !!on;
  applyPin();
  const pinned = !!mainWindow && !mainWindow.isDestroyed() && mainWindow.isAlwaysOnTop();
  return { success: true, pinned };
});

// yt-dlp Audio Stream Resolution IPC
ipcMain.handle('get-stream-url', async (_event, videoId: string) => {
  if (!videoId || typeof videoId !== 'string') {
    throw new Error('Valid videoId is required');
  }

  // 1. Check in-memory cache (60s safety margin: refresh near-expiry URLs
  // instead of handing the player a link that dies mid-track).
  const cached = streamCache.get(videoId);
  if (cached && Date.now() + 60_000 < cached.expiresAt && isValidStreamUrl(cached.url)) {
    return { streamUrl: cached.url, fromCache: true, expiresAtMs: cached.expiresAt };
  }

  // Share one extraction across concurrent requests for the same track.
  const running = streamInflight.get(videoId);
  if (running) return running;
  const job = resolveStreamUrl(videoId).finally(() => {
    if (streamInflight.get(videoId) === job) streamInflight.delete(videoId);
  });
  streamInflight.set(videoId, job);
  return job;
});

async function resolveStreamUrl(videoId: string) {
  const ytdlp = resolveYtDlp();

  // Extraction strategies: base web client on both YouTube Music + YouTube front doors,
  // then android client which avoids bot-checks and handles music tracks reliably.
  const attempts: { url: string; extraArgs: string[] }[] = [
    { url: `https://www.youtube.com/watch?v=${videoId}`, extraArgs: ['--no-warnings'] },
    { url: `https://music.youtube.com/watch?v=${videoId}`, extraArgs: ['--no-warnings'] },
    {
      url: `https://www.youtube.com/watch?v=${videoId}`,
      extraArgs: ['--extractor-args', 'youtube:player_client=android', '--no-warnings'],
    },
    {
      url: `https://music.youtube.com/watch?v=${videoId}`,
      extraArgs: ['--extractor-args', 'youtube:player_client=mweb,android', '--no-warnings'],
    },
  ];

  for (const attempt of attempts) {
    try {
      // Execute local yt-dlp with best audio format — direct googlevideo URL
      const { stdout } = await execFileAsync(
        ytdlp.cmd,
        [
          ...ytdlp.prefixArgs,
          ...attempt.extraArgs,
          '-f', 'ba/ba*',
          '-g',
          attempt.url,
        ],
        { timeout: 15000 }
      );

      const lines = stdout.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (isValidStreamUrl(line)) {
          // True googlevideo expiry when present, else 4h fallback.
          const expiresAt = parseStreamExpiryMs(line) || Date.now() + 4 * 60 * 60 * 1000;
          streamCache.set(videoId, { url: line, expiresAt });
          return { streamUrl: line, fromCache: false, expiresAtMs: expiresAt };
        }
      }
    } catch (err: any) {
      const detail = err?.stderr || err?.stdout || err.message || err;
      console.warn(`Local yt-dlp attempt failed for ${videoId} (${attempt.url}):`, detail);
    }
  }
  log(`All yt-dlp attempts failed for ${videoId} via ${ytdlp.cmd}`);

  // 3. Fallback: Query FreQ cloud API
  try {
    const res = await fetch(`https://freq-api.vercel.app/api/playback/${videoId}`);
    const data: any = await res.json();
    if (data && data.available && typeof data.streamUrl === 'string' && isValidStreamUrl(data.streamUrl)) {
      return { streamUrl: data.streamUrl, fromCache: false, expiresAtMs: parseStreamExpiryMs(data.streamUrl) };
    }
  } catch (cloudErr) {
    console.error(`Cloud playback fallback failed for ${videoId}:`, cloudErr);
  }

  throw new Error(`Failed to resolve audio stream for track ${videoId}`);
}

// Drop a poisoned stream URL so the next attempt re-extracts fresh.
ipcMain.handle('invalidate-stream', async (_event, videoId: string) => {
  if (typeof videoId === 'string' && videoId) {
    streamCache.delete(videoId);
  }
});

// Offline downloads: best-audio → mp3 into userData/downloads, keyed by
// videoId so repeats are free. Progress streams via 'download-progress'.
function downloadsDir(): string {
  const dir = path.join(app.getPath('userData'), 'downloads');
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {}
  return dir;
}

ipcMain.handle('download-track', async (event, videoId: string) => {
  if (!videoId || typeof videoId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    throw new Error('Valid videoId is required');
  }
  const dir = downloadsDir();
  const dest = path.join(dir, `${videoId}.mp3`);
  if (fs.existsSync(dest)) {
    return { path: dest, sizeBytes: fs.statSync(dest).size, fromCache: true };
  }
  const ytdlp = resolveYtDlp();
  const template = path.join(dir, '%(id)s.%(ext)s');
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      ytdlp.cmd,
      [
        ...ytdlp.prefixArgs,
        '-f', 'ba',
        '-x', '--audio-format', 'mp3',
        '--no-playlist',
        '--newline',
        '--no-warnings',
        '-o', template,
        `https://www.youtube.com/watch?v=${videoId}`,
      ],
      { timeout: 10 * 60 * 1000 },
    );
    child.stderr.on('data', (chunk: Buffer) => {
      const m = /(\d+(?:\.\d+)?)%/.exec(chunk.toString());
      if (m) {
        try {
          event.sender.send('download-progress', { videoId, pct: parseFloat(m[1]) });
        } catch {}
      }
    });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`yt-dlp download exited with code ${code}`));
    });
  });
  if (!fs.existsSync(dest)) throw new Error('Download produced no file');
  return { path: dest, sizeBytes: fs.statSync(dest).size, fromCache: false };
});

ipcMain.handle('delete-downloaded-file', async (_event, filePath: string) => {
  if (typeof filePath !== 'string' || !filePath) return { success: false };
  const dir = path.resolve(downloadsDir());
  const resolved = path.resolve(filePath);
  if (resolved !== dir && !resolved.startsWith(dir + path.sep)) {
    throw new Error('Refusing to delete outside the downloads folder');
  }
  try {
    fs.unlinkSync(resolved);
  } catch {}
  return { success: true };
});

ipcMain.handle('file-exists', async (_event, filePath: string) => {
  try {
    return typeof filePath === 'string' && filePath.length > 0 && fs.existsSync(filePath);
  } catch {
    return false;
  }
});

// Playlist link import: flat-scrape a YouTube / YT Music playlist URL
// into { title, tracks[] } (capped). No downloads — metadata only.
ipcMain.handle('import-playlist-link', async (_event, url: string) => {
  if (typeof url !== 'string' || !url) throw new Error('Playlist URL is required');
  let listId = '';
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const okHost = host === 'youtube.com' || host === 'music.youtube.com' || host === 'youtu.be' || host === 'youtube-nocookie.com';
    if (!okHost) throw new Error('not a YouTube URL');
    listId = u.searchParams.get('list') || '';
    if (!listId) throw new Error('no playlist id in URL');
  } catch (e: any) {
    throw new Error(e?.message === 'not a YouTube URL' || e?.message === 'no playlist id in URL' ? e.message : 'Invalid playlist URL');
  }

  const ytdlp = resolveYtDlp();
  const { stdout } = await execFileAsync(
    ytdlp.cmd,
    [
      ...ytdlp.prefixArgs,
      '--flat-playlist',
      '--dump-single-json',
      '--no-warnings',
      '--no-playlist-reverse',
      `https://www.youtube.com/playlist?list=${listId}`,
    ],
    { timeout: 90000, maxBuffer: 32 * 1024 * 1024 },
  );
  const data: any = JSON.parse(stdout);
  const entries: any[] = Array.isArray(data?.entries) ? data.entries : [];
  const tracks = entries.slice(0, 200).map((e: any) => ({
    id: typeof e?.id === 'string' ? e.id : '',
    title: typeof e?.title === 'string' ? e.title : 'Unknown Title',
    artist: typeof e?.uploader === 'string' && e.uploader ? e.uploader
      : typeof e?.channel === 'string' && e.channel ? e.channel : 'Unknown Artist',
    durationSeconds: typeof e?.duration === 'number' && e.duration > 0 ? Math.round(e.duration) : 194,
    thumbnails: Array.isArray(e?.thumbnails) ? e.thumbnails : [],
  })).filter((t: any) => t.id);
  if (tracks.length === 0) throw new Error('No playable songs found in that playlist');
  return {
    title: typeof data?.title === 'string' && data.title ? data.title : 'Imported Playlist',
    tracks,
  };
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
  const ytdlp = resolveYtDlp();
  try {
    const { stdout } = await execFileAsync(
      ytdlp.cmd,
      [
        ...ytdlp.prefixArgs,
        `ytsearch15:${query.trim()}`,
        '--dump-json',
        '--flat-playlist',
        '--no-warnings',
      ],
      { timeout: 20000 }
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

// ---------------------------------------------------------------------------
// JioSaavn fallback bridge
//
// The public `sumitkolhe/jiosaavn-api` deployments come and go, so the last
// layer talks to JioSaavn's own endpoint (the very API that project wraps).
// Main-process fetch avoids CORS, and Node's crypto decrypts the DES-encoded
// media URL so the renderer receives a plain 320 kbps link.
//
// Single DES is emulated with 3DES + a repeated key: EDE(K, K, K) == DES(K),
// which keeps us on OpenSSL's default provider (plain `des-ecb` needs the
// legacy provider and is unavailable in packaged Electron).
const SAAVN_DES_KEY = Buffer.from('38346591');
const SAAVN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function saavnDecrypt(encrypted: unknown): string | null {
  if (typeof encrypted !== 'string' || !encrypted) return null;
  const key = SAAVN_DES_KEY;
  // Node/OpenSSL exposes `des-ede3-ecb`; Electron's BoringSSL only lists the
  // CBC-flavoured names and DES-ECB. Try in that order and keep the first
  // plaintext that actually looks like a media URL.
  const schemes: Array<[string, Buffer]> = [
    ['des-ede3-ecb', Buffer.concat([key, key, key])],
    ['des-ede3', Buffer.concat([key, key, key])],
    ['des-ecb', key],
  ];

  for (const [name, cipherKey] of schemes) {
    try {
      const decipher = crypto.createDecipheriv(name, cipherKey, null);
      decipher.setAutoPadding(false);
      const raw = Buffer.concat([
        decipher.update(Buffer.from(encrypted, 'base64')),
        decipher.final(),
      ])
        .toString('utf8')
        // DES padding leaves control bytes behind; a URL never contains any.
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .trim();
      if (raw.startsWith('http')) return raw;
    } catch {
      // Try the next scheme.
    }
  }
  return null;
}

/** Decrypted 96 kbps link upgraded to the 320 kbps master when available. */
function saavnUpgradeUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.includes('_96.mp4')) return url.replace('_96.mp4', '_320.mp4');
  return url;
}

async function saavnGet(pathAndQuery: string): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(`https://www.jiosaavn.com/api.php${pathAndQuery}`, {
      signal: controller.signal,
      headers: { 'User-Agent': SAAVN_UA, Accept: 'application/json' },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

interface SaavnTrackPayload {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSeconds: number;
  artworkUrl: string | null;
  mediaUri: string | null;
}

function saavnShape(raw: any): SaavnTrackPayload | null {
  if (!raw || typeof raw.id !== 'string' || typeof raw.title !== 'string') return null;
  const info = raw.more_info || {};
  const duration = Number(info.duration ?? raw.duration) || 0;
  const encrypted = info.encrypted_media_url || raw.encrypted_media_url;
  return {
    id: raw.id,
    title: raw.title,
    artist: raw.subtitle || info.music || 'Unknown artist',
    album: info.album || '',
    durationSeconds: duration > 0 ? Math.round(duration) : 0,
    artworkUrl: typeof raw.image === 'string' ? raw.image.replace('150x150', '500x500') : null,
    mediaUri: saavnUpgradeUrl(saavnDecrypt(encrypted)),
  };
}

ipcMain.handle('saavn-search', async (_event, query: string, limit = 20) => {
  const trimmed = typeof query === 'string' ? query.trim() : '';
  if (trimmed.length < 2) return [];
  const n = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const data = await saavnGet(
    `?__call=search.getResults&q=${encodeURIComponent(trimmed)}&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=${n}&p=1`
  );
  const results = Array.isArray(data?.results) ? data.results : [];
  return results.map(saavnShape).filter((t: SaavnTrackPayload | null): t is SaavnTrackPayload => !!t);
});

ipcMain.handle('saavn-stream', async (_event, songId: string) => {
  if (typeof songId !== 'string' || !songId.trim()) return null;
  const data = await saavnGet(
    `?__call=song.getDetails&cc=in&_marker=0&_format=json&pids=${encodeURIComponent(songId.trim())}`
  );
  if (!data) return null;
  const first = data[songId.trim()] ?? Object.values(data)[0];
  if (!first) return null;
  return saavnUpgradeUrl(
    saavnDecrypt((first as any).encrypted_media_url ?? (first as any).more_info?.encrypted_media_url)
  );
});

// Discord Rich Presence IPC Handlers
ipcMain.handle('discord-update-activity', (_event, payload: DiscordActivityPayload) => {
  discordRpcManager.updateActivity(payload);
});

ipcMain.handle('discord-poke', () => {
  discordRpcManager.poke();
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

// Discord "Join" from the presence. A friend clicked join (or we approved an
// Ask to Join) — hand the party code to the renderer, which runs the normal
// join flow. Public parties only; private ones never advertise a secret.
discordRpcManager.onJoin((code: string) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('discord-join-party', code);
  }
});







