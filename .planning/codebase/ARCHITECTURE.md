# Architecture

**Analysis Date:** 2026-11-28

## Pattern Overview

**Overall:** Two-process Electron desktop application (Main + Sandboxed Renderer) with a React 19 UI, a Web Audio API DSP pipeline, local-first JSON persistence, and a multi-source audio resolution chain.

**Key Characteristics:**
- **Process Separation & Security:** `electron/main.ts` runs Node.js/Electron APIs (`yt-dlp` execution, filesystem I/O, Discord RPC, tray, global shortcuts, auto-updater), while `electron/preload.ts` exposes a typed `window.electronAPI` bridge via `contextBridge` (`contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`, CSP enforced in `index.html`).
- **Centralized UI State + Stateless Service Modules:** `src/App.tsx` owns React UI/playback state (active view, queue, current track, modals, updater state), delegating domain logic to singleton/static services under `src/services/`.
- **Real-Time Web Audio DSP Graph:** `src/services/audioEngine.ts` wraps an `HTMLAudioElement` inside an `AudioContext` node graph for zero-latency Audio Flavors (`NORMAL`, `SNR`, `NIGHTCORE`), 5-band EQ, bass boost, mid-side stereo widening, HRTF spatialization, auto-leveling, and output device routing (`setSinkId`).
- **Android-Aligned Playback Abstractions:** `src/services/playbackManager.ts`, `src/services/playbackSource.ts`, `src/services/playbackSourceResolver.ts`, `src/services/remotePlaybackProvider.ts`, and `src/services/autoplayEngine.ts` mirror the Android companion architecture (`PlaybackManager.kt`, `PlaybackSource.kt`, `AutoplayEngine.kt`) adapted for Electron/Web Audio.
- **Local-First Persistence:** User library, playlists, play stats, shortcuts, and DSP preferences persist locally in `freq_library.json` (via main-process IPC) and `freq_desktop_prefs.json`, with no user accounts or telemetry.

## Layers

### 1. Electron Main Process (`electron/`)
- **Purpose:** Window lifecycle, OS integration, native binary bridging, local persistence, and third-party desktop IPC.
- **Location:** `electron/main.ts`, `electron/discordRpc.ts`
- **Responsibilities:**
  - Frameless `BrowserWindow` management (`frame: false`, `backgroundColor: '#090A0F'`, `backgroundThrottling: false`), single-instance lock, mini-player mode, always-on-top pinning, and external URL sanitization (`isSafeExternalUrl`).
  - Windows desktop shell integration: System `Tray`, taskbar `Thumbar` buttons, Windows Jump List (`refreshJumpList`), native toast notifications, and `globalShortcut` media hotkeys.
  - Stream extraction & offline downloads: Resolves `yt-dlp` (`build/yt-dlp.exe` in packaged `extraResources` or system binary) with a 4-strategy extraction chain, 4-hour/expiry-aware in-memory `streamCache`, in-flight deduplication (`streamInflight`), and cloud fallback (`https://freq-api.vercel.app/api/playback/{id}`).
  - JioSaavn main-process proxy (`saavn-search`, `saavn-stream`) with Node `crypto` DES URL decryption (`saavnDecrypt`) to bypass renderer CORS.
  - Local file storage (`freq_library.json` and `userData/downloads/*.mp3`).
  - Auto-updates via `electron-updater` (GitHub Releases) and direct GitHub API fallback (`checkGitHubReleasesDirectly`).
  - Discord Rich Presence via `DiscordRpcManager` (`electron/discordRpc.ts`) using `@xhayper/discord-rpc`, serialized write queue (`writeChain` + `activitySeq`), AFK detection, and public party `ACTIVITY_JOIN` / `ACTIVITY_JOIN_REQUEST` handling.

### 2. Preload IPC Bridge (`electron/preload.ts`)
- **Purpose:** Typed, capability-scoped boundary between the sandboxed renderer and Node.js main process.
- **Location:** `electron/preload.ts`
- **Responsibilities:**
  - Exposes `window.electronAPI` (`ElectronAPI` interface) via `contextBridge.exposeInMainWorld`.
  - Wraps `ipcRenderer.invoke` for request/response calls and `ipcRenderer.on` / `removeListener` cleanup callbacks for push events (`window-maximized-state`, `desktop-mini-mode`, `desktop-media-command`, `desktop-open-palette`, `desktop-launch-action`, `download-progress`, `discord-join-party`, `navigate-to-view`, `updater-event`).

### 3. Renderer Services Layer (`src/services/`)
- **Purpose:** Stateless/singleton domain engines for audio DSP, playback resolution, catalog browsing, library storage, lyrics, and synchronized listening parties.
- **Location:** `src/services/*.ts`
- **Key Modules:**
  - `src/services/audioEngine.ts`: Singleton `AudioEngine` managing `HTMLAudioElement`, Web Audio DSP graph, `MediaSession` API integration, smooth ~4.5 Hz timeline clock (`startSmoothClock`), and Listen Together phase-lock rate nudging.
  - `src/services/playbackManager.ts`: Singleton `PlaybackManager` owning the in-memory `sourceCache` (with 60s expiry safety margin), next-track prefetching (`maybePrefetchNext`), and session persistence delegation (`playbackPersistence.ts`).
  - `src/services/playbackSourceResolver.ts` & `src/services/remotePlaybackProvider.ts`: Ordered source resolution (`local mediaUri` → `electronAPI.getStreamUrl` → `freq-api.vercel.app` → `jioSaavnService`).
  - `src/services/libraryStore.ts`: Observable `LibraryStore` singleton syncing `freq_library.json` via `electronAPI.getLibraryData` / `saveLibraryData` (with `localStorage` fallback for browser preview).
  - `src/services/ytmusic.ts` & `src/services/jiosaavn.ts`: Catalog search, home sections, artist/album details, and artwork URL upgrading (`upgradeArtworkUrl`).
  - `src/services/autoplayEngine.ts`, `src/services/continuationQueue.ts`, `src/services/vibeMatch.ts`: Affinity-weighted autoplay queue generation and title/artist deduplication.
  - `src/services/partyService.ts`: Singleton `PartyService` implementing Listen Together rooms over MQTT-over-WebSockets (`wss://broker.emqx.io:8084/mqtt`, `wss://test.mosquitto.org:8081/mqtt`).
  - `src/services/lyrics.ts`, `src/services/downloads.ts`, `src/services/shareCard.ts`, `src/services/theme.ts`, `src/services/regions.ts`.

### 4. Renderer Presentation Layer (`src/App.tsx`, `src/views/`, `src/components/`)
- **Purpose:** Liquid-glass Windows desktop UI, custom frameless chrome, views, modals, and keyboard shortcuts.
- **Location:** `src/App.tsx`, `src/views/*.tsx`, `src/components/*.tsx`, `src/styles/index.css`
- **Responsibilities:**
  - `src/App.tsx` coordinates playback lifecycle, queue navigation, `libraryStore` subscriptions, `partyService` sync events, Discord RPC updates, and top-level routing between views (`HomeView`, `SearchView`, `LibraryView`, `StatsView`, `PlaylistDetailView`, `ArtistDetailView`, `AlbumDetailView`, `SettingsView`, `PartyView`) and `MiniPlayer`.
  - `src/components/` provides reusable chrome (`TitleBar`, `Sidebar`, `PlayerBar`, `QueueDrawer`, `NowPlayingModal`, `CommandPalette`, `SpatialPad`, `HomeLyricsRail`, `WhatsNewModal`, `ErrorBoundary`).

## Data Flow

### Audio Playback & Stream Resolution Flow
```
User selects track (src/App.tsx)
  → playbackManager.resolveSource(track) (src/services/playbackManager.ts)
    → PlaybackSourceResolver.resolve() (src/services/playbackSourceResolver.ts)
      1. Check track.mediaUri (local downloaded file)
      2. YtMusicRemoteProvider.resolvePlaybackSource() (src/services/remotePlaybackProvider.ts)
         a. If id starts with "saavn:", query jioSaavnService.streamForId()
         b. Else invoke window.electronAPI.getStreamUrl(videoId)
            → IPC 'get-stream-url' (electron/main.ts)
              → Check streamCache (60s expiry margin)
              → Run local yt-dlp.exe (4 client strategies)
              → Fallback: GET https://freq-api.vercel.app/api/playback/{videoId}
         c. Cloud fallback: GET https://freq-api.vercel.app/api/playback/{id}
         d. JioSaavn title-match fallback: jioSaavnService.resolveStreamByTitle()
  → audioEngine.loadAndPlay(track, url) (src/services/audioEngine.ts)
  → Main process updates: updateDesktopPlayback() + updateDiscordPresence()
```

### Web Audio DSP Signal Chain (`src/services/audioEngine.ts`)
```
HTMLAudioElement → MediaElementAudioSourceNode
  → highpassNode (24 Hz subsonic guard)
  → bassNode (60 Hz lowshelf) → bassPunchNode (100 Hz peaking)
  → eqNodes[0..4] (60 Hz, 230 Hz, 910 Hz, 3.6 kHz, 14 kHz)
  → hdClarityNode (3.6 kHz peaking) → hdAirNode (11.5 kHz highshelf)
  → trimGainNode (per-track dB normalization)
  ├── Dry path: dryGainNode ──────────────────────┐
  └── Wet path: convolverNode → wetGainNode ──────┼→ masterGainNode
  → Mid-Side Stereo Matrix (stereoSplitter → midGain / sideGain / widthMultiplier → stereoMerger)
  → levelGainNode (RMS auto-leveling) → analyserNode (2048 FFT)
  ├── Spatial dry: spatialDryGain ────────────────┐
  └── Spatial wet: PannerNode (HRTF) → spatialWet ┼→ spatialOutGain
  → panNode (StereoPannerNode balance) → headroomNode → limiterNode → finalGainNode → volumeNode → destination
```

### Listen Together (Party) Sync Flow
- Host creates or joins a 4-digit room in `PartyService` (`src/services/partyService.ts`), connecting via `mqtt` over `wss://`.
- Host publishes `track`, `playState`, `seek`, `timelineSync`, and heartbeats; guests receive `PartySyncEvent` callbacks in `src/App.tsx`.
- Guests apply drift correction via `audioEngine` phase-lock rate nudging (`syncRateMultiplier` reverting to `1.0` within 45 ms of host position).
- Public parties attach the 4-digit room code as `joinSecret` in `DiscordRpcManager` (`electron/discordRpc.ts`), enabling Discord "Join" / "Ask to Join" deep-linking back into the renderer via `onDiscordJoinParty`.

## Entry Points

- **Electron Main Process:** `electron/main.ts` (compiled to `dist-electron/main.js`, referenced as `"main"` in `package.json`). Initializes `app.whenReady()`, registers IPC handlers, creates `BrowserWindow`, tray, hotkeys, and auto-updater.
- **Electron Preload:** `electron/preload.ts` (compiled to `dist-electron/preload.js`). Bridges `window.electronAPI` into the renderer before page scripts execute.
- **Renderer HTML:** `index.html` (loads `/src/main.tsx`).
- **Renderer Root:** `src/main.tsx` — calls `initTheme()` (`src/services/theme.ts`) before first paint, then mounts `<ErrorBoundary><App /></ErrorBoundary>` into `#root`.

## Build & Packaging Architecture

- **UI Bundler:** Vite (`vite.config.ts`) compiles `src/` to `dist/`, injecting `__APP_VERSION__` and `__BUILD_ID__` (`<version>+<git-sha>`) at build time.
- **Main/Preload Bundler:** `esbuild` (`package.json` `build:electron` script) bundles `electron/main.ts` and `electron/preload.ts` for `node20` into `dist-electron/`, keeping `electron` external.
- **Installer Packaging:** `electron-builder` (`electron-builder.json`) packages `dist/`, `dist-electron/`, `electron/assets/`, and `build/yt-dlp.exe` (as `extraResources/bin/yt-dlp.exe`) into Windows x64 NSIS and Portable targets under `release/`. `scripts/clean-release.mjs` prunes older version installers after `npm run dist`.

---

*Architecture analysis: 2026-11-28*
