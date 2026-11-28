# External Integrations

**Analysis Date:** 2026-11-28

## Overview

FreQ Desktop operates primarily local-first, resolving media streams on the user's own network via a bundled `yt-dlp` binary while falling back to cloud APIs and public services for metadata, lyrics, backup streams, synchronized listening rooms, Discord Rich Presence, and app updates.

## Music & Media Providers

### 1. Local `yt-dlp` Bridge (Primary Audio & Search)

- **Integration:** Spawns `yt-dlp` via Node `child_process` (`execFile` / `spawn`) in `electron/main.ts`.
- **Binary Resolution (`resolveYtDlp` in `electron/main.ts`):**
  1. Packaged resource: `process.resourcesPath/bin/yt-dlp.exe`
  2. Local build paths: `build/yt-dlp.exe`
  3. Sibling Python venv fallback: `../../Android/backend-python/.venv/Scripts/python.exe -m yt_dlp` or `yt-dlp.exe`
  4. System `PATH` fallback: `yt-dlp`
- **Capabilities & IPC Channels (`electron/main.ts`, `electron/preload.ts`):**
  - `get-stream-url`: Extracts direct `googlevideo` HTTPS audio URLs (`-f ba/ba* -g`) across `youtube.com` and `music.youtube.com` (standard, `android`, and `mweb,android` player clients), with in-memory expiry caching (`streamCache`) and per-track in-flight deduplication (`streamInflight`).
  - `download-track`: Downloads best audio as `.mp3` into `app.getPath('userData')/downloads/` and streams progress via `download-progress`.
  - `search-tracks`: Executes `ytsearch15:<query> --dump-json --flat-playlist` as a local search fallback.
  - `import-playlist-link`: Extracts YouTube playlist metadata and tracks via `--flat-playlist -J`.

### 2. FreQ Cloud API (`https://freq-api.vercel.app`)

- **Used in:** `src/services/ytmusic.ts`, `src/services/remotePlaybackProvider.ts`, and `electron/main.ts` (fallback).
- **Endpoints:**
  - `GET /api/search?q=<query>` — YouTube Music track search (`src/services/ytmusic.ts`)
  - `GET /api/home` — Home feed shelves/recommendations (`src/services/ytmusic.ts`)
  - `GET /api/artists/:artistId` — Artist details & top tracks (`src/services/ytmusic.ts`)
  - `GET /api/albums/:albumId` — Album tracklist (`src/services/ytmusic.ts`)
  - `GET /api/watch/:trackId?limit=<n>` — Watch/radio continuation queue (`src/services/ytmusic.ts`)
  - `GET /api/playback/:videoId` — Cloud `yt-dlp` stream URL fallback (`electron/main.ts`, `src/services/remotePlaybackProvider.ts`)
  - `GET /api/stream/:trackId` — Direct stream proxy used in browser preview mode when `window.electronAPI` is absent (`src/services/remotePlaybackProvider.ts`)
- **Thumbnails:** YouTube image CDN (`https://i.ytimg.com/vi/<videoId>/mqdefault.jpg` / `hqdefault.jpg`).

### 3. JioSaavn Bridge (Catalog & Stream Fallback)

- **Renderer Community Instances (`src/services/jiosaavn.ts`):** Queries `https://saavn.sumit.co` and `https://saavn.dev` when needed.
- **Main-Process Direct Bridge (`electron/main.ts`):**
  - `saavn-search` / `saavn-stream` IPC handlers fetch `https://www.jiosaavn.com/api.php` (`search.getResults`, `song.getDetails`) directly from Node to bypass CORS.
  - Decrypts `encrypted_media_url` locally using Node `crypto` (`des-ede3-ecb` / `des-ede3` / `des-ecb` with key `38346591`) and upgrades `_96.mp4` links to `_320.mp4`.

## Lyrics Provider

### LRCLIB (`https://lrclib.net`)

- **Used in:** `src/services/lyrics.ts`
- **Endpoints:**
  - `GET https://lrclib.net/api/get` (exact track/artist/album/duration match)
  - `GET https://lrclib.net/api/search` (fallback search)
- **Details:** Sends `User-Agent: FreQ-Desktop/1.0 (https://github.com/soumalyajoardar/FreQ)`. Parses `[mm:ss.xx]` LRC timestamps and includes client-side Devanagari-to-Latin transliteration.

## Real-Time Networking & Social Integrations

### 1. Listen Together (MQTT over WebSockets)

- **Library:** `mqtt` (`^5.16.1`) in `src/services/partyService.ts`
- **Brokers:** Connects over `wss://` to public MQTT-over-WebSocket brokers tried in order:
  - `wss://broker.emqx.io:8084/mqtt`
  - `wss://test.mosquitto.org:8081/mqtt`
- **Purpose:** Synchronizes room playback state, track changes, seek positions, and up to 5 participants' presence with phase-lock rate nudging in `src/services/audioEngine.ts`.

### 2. Discord Rich Presence

- **Library:** `@xhayper/discord-rpc` (`^1.5.1`) in `electron/discordRpc.ts`
- **Client ID:** Defaults to `1555196374067322940` (configurable via `setDiscordClientId`).
- **IPC Bridge (`electron/preload.ts`):** `discord-update-activity`, `discord-poke`, `discord-clear-activity`, `discord-set-enabled`, `discord-set-client-id`, `discord-get-status`, and renderer event `discord-join-party`.
- **Capabilities:** Displays track title, artist, album artwork, live playback countdown, audio flavor (`Normal`, `SnR`, `Nightcore`), AFK/browsing states, and public party `ACTIVITY_JOIN` / `ACTIVITY_JOIN_REQUEST` invites.

## Audio / DSP Engine

- **Implementation:** `src/services/audioEngine.ts` (Chromium Web Audio API)
- **Signal Chain:** `HTMLAudioElement` -> `MediaElementAudioSourceNode` -> Highpass (`BiquadFilterNode`) -> Dual-stage Bass Boost (`55 Hz` + `95 Hz` `BiquadFilterNode`) -> 5-Band EQ (`60 Hz`, `230 Hz`, `910 Hz`, `3.6 kHz`, `14 kHz`) -> Dry/Wet Reverb (`ConvolverNode` with procedural stereo impulse response) -> HD Clarity & Air (`BiquadFilterNode`) -> Mid/Side Stereo Widener (`ChannelSplitterNode` / `ChannelMergerNode`) -> Optional HRTF Spatializer (`PannerNode`) -> Per-track Trim & RMS Auto-Leveling (`AnalyserNode` + `GainNode`) -> Stereo Balance (`StereoPannerNode`) -> Limiter (`DynamicsCompressorNode`) -> Master Volume (`GainNode`).
- **Flavors:** `NORMAL` (1.0x dry), `SNR` (0.8x rate + reverb), `NIGHTCORE` (1.2x rate + pitch shift via `preservesPitch = false`).

## Auto-Updates & Distribution

- **Provider:** GitHub Releases (`soumalyajoardar/FreQ`) via `electron-updater` (`^6.8.9`) in `electron/main.ts` and `electron-builder.json`.
- **IPC Channels:** `check-for-updates`, `download-update`, `install-update`, `update-cache-info`, `update-cache-clear`, and `updater-event`.
- **Fallback:** Queries `https://api.github.com/repos/soumalyajoardar/FreQ/releases/latest` directly if `autoUpdater.checkForUpdates()` fails, and opens the release page in the OS browser if `downloadUpdate()` fails.

## Windows OS & IPC Native Integrations

- **Preload Bridge (`electron/preload.ts`):** Exposes `window.electronAPI` via `contextBridge.exposeInMainWorld` (`contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`).
- **Windows Shell Features (`electron/main.ts`):**
  - App User Model ID: `com.freq.music`
  - System Tray (`Tray` + `Menu`) with playback controls, close-to-tray, and minimize-to-tray
  - Windows Taskbar Thumbnail Toolbar (`setThumbarButtons` using `electron/assets/thumb-*.png`)
  - Windows Jump List (`app.setJumpList`) for quick actions and recent tracks (`--freq-mini`, `--freq-palette`, `--freq-view=`, `--freq-play=`)
  - Global Media Hotkeys (`globalShortcut`)
  - Native Windows Toast Notifications (`Notification`)
  - Frameless custom window chrome (`window-minimize`, `window-maximize`, `window-close`, `set-always-on-top`, Mini Player mode)
  - Safe external link handling (`shell.openExternal` restricted to `http:` / `https:`)

## Storage & Persistence

| Store | Location / Mechanism | Contents | Source |
|---|---|---|---|
| Library JSON | `app.getPath('userData')/freq_library.json` (64 MB guard) | Playlists, liked tracks, history, audio settings, Discord client ID | `electron/main.ts`, `src/services/libraryStore.ts` |
| Desktop Prefs | `app.getPath('userData')/freq_desktop_prefs.json` | Tray behavior, notifications, global hotkey bindings | `electron/main.ts` |
| Update State | `app.getPath('userData')/freq_update_notified.json` | Last notified update version | `electron/main.ts` |
| Offline Audio | `app.getPath('userData')/downloads/<videoId>.mp3` | Offline downloaded tracks via `yt-dlp` | `electron/main.ts`, `src/services/downloads.ts` |
| Debug Logs | `freq-debug.log` (5 MB cap) | Main & forwarded renderer console logs | `electron/main.ts` |
| Browser `localStorage` | Chromium `localStorage` | Browser-mode library fallback (`freq_library_data`), output device ID (`freq_output_device`), playback resume state (`playbackPersistence.ts`), party username/privacy/recents (`partyService.ts`), theme preset (`theme.ts`) | `src/services/*` |
| In-Memory Caches | `Map` instances | `yt-dlp` stream URLs (`streamCache`), lyrics (`lyricsCache`) | `electron/main.ts`, `src/services/lyrics.ts` |

---
*Integrations analysis: 2026-11-28*
