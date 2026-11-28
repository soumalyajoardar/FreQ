# Codebase Structure

**Analysis Date:** 2026-11-28

## Directory Layout

```
s:\PROJECTS\WAVE\Windows\
├── electron/                   # Electron main process, preload bridge, and Discord RPC
│   ├── main.ts                 # App lifecycle, BrowserWindow, IPC handlers, yt-dlp, updater, tray
│   ├── preload.ts              # Typed contextBridge API (window.electronAPI)
│   ├── discordRpc.ts           # Discord Rich Presence manager & party join handling
│   └── assets/                 # Tray & Windows taskbar thumbar PNG icons
├── src/                        # React 19 + TypeScript renderer application
│   ├── main.tsx                # Renderer entry point (theme init + ReactDOM root)
│   ├── App.tsx                 # Top-level application shell, state, routing, & event wiring
│   ├── vite-env.d.ts           # Vite & global Window.electronAPI / build macro declarations
│   ├── assets/                 # Bundled app icon and time-of-day background images
│   ├── components/             # Reusable UI components, modals, drawers, and chrome
│   ├── data/                   # Static app data (release changelog entries)
│   ├── services/               # Audio DSP, playback resolution, storage, APIs, & party sync
│   ├── styles/                 # Global CSS & liquid-glass design system tokens
│   ├── types/                  # Shared domain TypeScript interfaces
│   ├── utils/                  # Pure utility helpers
│   └── views/                  # Full-screen route views
├── public/                     # Static public assets copied to dist/
├── build/                      # electron-builder resources (app icons & bundled yt-dlp.exe)
├── scripts/                    # Release cleanup & GSD repo validation/search scripts
├── adapters/                   # Optional model-specific AI instruction adapters (GSD)
├── .agent/                     # GSD workflow definitions (.agent/workflows/*.md)
├── .agents/                    # GSD agent definitions & skill modules
├── .gemini/                    # Gemini workspace rules (GEMINI.md)
├── .gsd/                       # GSD specs, roadmap, templates, & examples
├── .planning/                  # Planning state, quick tasks, & codebase analysis docs
├── dist/                       # Built Vite renderer output (gitignored/build artifact)
├── dist-electron/              # Built esbuild main & preload bundles (build artifact)
├── release/                    # electron-builder Windows installers & portable builds
├── index.html                  # Renderer HTML shell & Content-Security-Policy
├── package.json                # Dependencies, npm scripts, & main entry ("dist-electron/main.js")
├── tsconfig.json               # TypeScript compiler config (includes src/)
├── vite.config.ts              # Vite config (aliases @ -> ./src, port 5173, build defines)
├── electron-builder.json       # Windows x64 NSIS + Portable packaging config
├── PROJECT_RULES.md            # Canonical GSD project rules
└── GSD-STYLE.md                # GSD documentation & file structure conventions
```

## Key File Locations

### Entry Points & Configuration
- `package.json`: Project metadata (`freq-desktop` v2.6.2), build scripts (`dev`, `build`, `dist`, `clean:release`), and dependencies.
- `index.html`: Renderer entry document with strict `Content-Security-Policy` meta tag and Google Fonts (`Inter`, `Instrument Serif`).
- `vite.config.ts`: Configures `@` alias to `src/`, injects `__APP_VERSION__` and `__BUILD_ID__`, and ignores build output directories in dev watch.
- `electron-builder.json`: Configures Windows `nsis` and `portable` x64 targets, GitHub Releases publishing, and `extraResources` (`build/yt-dlp.exe` → `bin/yt-dlp.exe`, `electron/assets` → `assets`).
- `tsconfig.json`: Strict ES2022/ESNext TypeScript configuration scoped to `src/`.

### Electron Main & Preload (`electron/`)
- `electron/main.ts`: Main-process entrypoint (1,690 lines) handling window creation, tray/thumbar/jump-list/hotkeys, `yt-dlp` stream & download execution, JioSaavn DES decryption, `freq_library.json` read/write, and `electron-updater`.
- `electron/preload.ts`: Exposes `ElectronAPI` on `window.electronAPI` and defines shared desktop preference/launch types (`DesktopPrefs`, `DesktopPlaybackState`, `DesktopLaunchAction`).
- `electron/discordRpc.ts`: `DiscordRpcManager` singleton managing serialized Discord IPC updates, AFK presence, and public party join invites.
- `electron/assets/`: `tray.png`, `thumb-play.png`, `thumb-pause.png`, `thumb-next.png`, `thumb-prev.png`.

### Renderer Core (`src/`)
- `src/main.tsx`: Calls `initTheme()` and renders `<ErrorBoundary><App /></ErrorBoundary>`.
- `src/App.tsx`: Central application component (2,527 lines) coordinating views, playback state, queue operations, keyboard shortcuts, updater UI, and service subscriptions.
- `src/types/index.ts`: Core domain types (`MediaTrack`, `AudioMode`, `RepeatMode`, `SyncedLyricLine`, `TrackLyrics`, `UserPlaylist`, `SmartMix`, `DuplicateGroup`, `CatalogItem`, `CatalogSection`, `ArtistDetails`, `AlbumDetails`).
- `src/styles/index.css`: Global styling, CSS variables, and liquid-glass utility classes.
- `src/data/changelog.ts`: Versioned release notes (`CHANGELOG`) and seen-version tracking helpers.
- `src/utils/shuffle.ts`: Fisher-Yates shuffle utility.

### Services (`src/services/`)
- `src/services/audioEngine.ts`: Web Audio DSP pipeline, `HTMLAudioElement` wrapper, output device routing, `MediaSession`, and timeline clock.
- `src/services/playbackManager.ts`: Track source caching, prefetching, and session save/restore.
- `src/services/playbackSource.ts`: `PlaybackSource` union (`local` | `remote` | `unavailable`) and URL expiry/HTTPS validation.
- `src/services/playbackSourceResolver.ts`: Ordered resolution chain (local `mediaUri` → remote provider → unavailable).
- `src/services/remotePlaybackProvider.ts`: `YtMusicRemoteProvider` (JioSaavn ID → local `yt-dlp` IPC → cloud `/api/playback` → JioSaavn title fallback).
- `src/services/playbackQueueLogic.ts`: Pure queue helpers (`clampQueueIndex`, `cycleRepeatMode`, `shouldPrefetchNext`).
- `src/services/playbackPersistence.ts`: Playback session snapshot persistence.
- `src/services/libraryStore.ts`: Local-first library, playlists, play stats, downloads, shortcuts, and DSP settings store.
- `src/services/ytmusic.ts`: FreQ cloud API client (`https://freq-api.vercel.app`) for search, home catalog, artist/album details, and artwork normalization.
- `src/services/jiosaavn.ts`: Secondary catalog and stream provider (`saavn-search`/`saavn-stream` IPC + `saavn.sumit.co` / `saavn.dev` fallback).
- `src/services/autoplayEngine.ts`: Affinity-scored autoplay queue generator.
- `src/services/continuationQueue.ts`: Continuation queue builder (`buildContinuationQueue`).
- `src/services/vibeMatch.ts`: Song deduplication, alternate-upload detection, and script/token scoring.
- `src/services/partyService.ts`: MQTT-over-WebSocket Listen Together room client.
- `src/services/lyrics.ts`: LRCLIB synced/plain lyrics client.
- `src/services/downloads.ts`: Offline download helpers (`withLocalFile`, `formatBytes`).
- `src/services/shareCard.ts`: Canvas-based track share card renderer and downloader.
- `src/services/theme.ts`: Accent theme initialization and CSS variable management.
- `src/services/regions.ts`: Content region definitions and locale detection (`regionFromLocale`).

### Views (`src/views/`)
- `src/views/HomeView.tsx`: Personalized home feed, time-of-day hero, quick picks, and smart mixes.
- `src/views/SearchView.tsx`: Catalog search results across songs, albums, artists, and playlists.
- `src/views/LibraryView.tsx`: Liked tracks, custom playlists, downloaded tracks, and duplicate finder.
- `src/views/StatsView.tsx`: Listening history and play statistics visualizations.
- `src/views/PlaylistDetailView.tsx`: Playlist tracklist, cover upload, and management.
- `src/views/ArtistDetailView.tsx`: Artist top songs and discography.
- `src/views/AlbumDetailView.tsx`: Album tracklist and metadata.
- `src/views/SettingsView.tsx`: Audio DSP tuning, output device selection, desktop prefs, hotkeys, Discord RPC, and updater controls.
- `src/views/PartyView.tsx`: Listen Together room hosting, joining, member list, and live reactions.

### Components (`src/components/`)
- `src/components/TitleBar.tsx`: Custom frameless window title bar with window controls, pin toggle, and audio output selector.
- `src/components/Sidebar.tsx`: Primary navigation rail and user playlists list.
- `src/components/PlayerBar.tsx`: Bottom playback bar with transport controls, scrubber, audio mode selector, and volume.
- `src/components/MiniPlayer.tsx`: Compact floating mini-player UI when `miniMode` is active.
- `src/components/NowPlayingModal.tsx`: Fullscreen now-playing view with 3D flip-card synced lyrics.
- `src/components/QueueDrawer.tsx`: Slide-over playback queue and continuation controls.
- `src/components/HomeLyricsRail.tsx`: Side rail displaying live synced lyrics on the main view.
- `src/components/GlobalSearch.tsx`: Top-bar search input with history/suggestions.
- `src/components/CommandPalette.tsx`: Keyboard-driven command palette (`Ctrl+K` / tray action).
- `src/components/SpatialPad.tsx`: Interactive 2D directional pad for HRTF spatializer angle/intensity.
- `src/components/FlatScrubber.tsx`: Custom timeline/volume scrubber control.
- `src/components/TrackContextMenu.tsx`: Right-click track context menu.
- `src/components/AddToPlaylistModal.tsx`, `src/components/ImportPlaylistDialog.tsx`, `src/components/PartyModal.tsx`, `src/components/WhatsNewModal.tsx`, `src/components/FreqDialogs.tsx`: Feature dialogs and toast stack.
- `src/components/SafeArtwork.tsx`, `src/components/SquareArt.tsx`, `src/components/LyricsIcon.tsx`, `src/components/ErrorBoundary.tsx`, `src/components/useExitTransition.ts`: UI primitives and hooks.

### Build, Assets, Scripts, & Governance
- `public/freq-icon.png`, `src/assets/freq-icon.png`, `src/assets/backgrounds/app_background_{morning,afternoon,evening,night}.jpg`: UI icons and dynamic time-of-day backgrounds.
- `build/`: `icon.ico`, `icon.png`, and `yt-dlp.exe` bundled into Windows releases.
- `scripts/clean-release.mjs`: Prunes old installer artifacts from `release/` keeping only the current `package.json` version.
- `scripts/validate-*.{ps1,sh}`, `scripts/search_repo.{ps1,sh}`, `scripts/setup_search.{ps1,sh}`: GSD repository validation and search helper scripts.
- `adapters/{CLAUDE,GEMINI,GPT_OSS}.md`: Optional model-specific GSD adapters referencing `PROJECT_RULES.md`.

## Module Boundaries

- **Main vs. Renderer:** Renderer code (`src/`) never imports Node.js built-ins or `electron` directly (except type-only imports from `../electron/preload` in `src/App.tsx`). All OS/filesystem/binary operations cross `window.electronAPI`.
- **Views vs. Services:** Views (`src/views/*.tsx`) and components (`src/components/*.tsx`) receive state and callbacks via props from `src/App.tsx` or read pure helpers; `src/services/` encapsulates external network calls, audio DSP, and persistence.
- **Browser Preview Compatibility:** Services (`libraryStore.ts`, `remotePlaybackProvider.ts`) guard `window.electronAPI` checks so the UI can also run in Vite browser dev mode (`npm run dev`).

## Naming Conventions

- **React Components & Views:** `PascalCase.tsx` (`PlayerBar.tsx`, `HomeView.tsx`, `ErrorBoundary.tsx`).
- **Services, Utilities, & Types:** `camelCase.ts` (`audioEngine.ts`, `playbackManager.ts`, `libraryStore.ts`).
- **Electron Main Modules:** `camelCase.ts` (`main.ts`, `preload.ts`, `discordRpc.ts`).
- **Hooks:** `useCamelCase.ts` (`useExitTransition.ts`).
- **IPC Channels:** `kebab-case` strings (`get-stream-url`, `desktop-set-mini-mode`, `discord-update-activity`).
- **Local Storage / Library Keys:** `freq_*` prefix (`freq_library.json`, `freq_desktop_prefs.json`, `freq_output_device`, `freq_party_username`).

---

*Structure analysis: 2026-11-28*
