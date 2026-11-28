# Technology Stack

**Analysis Date:** 2026-11-28

## Overview

**FreQ Desktop** (`freq-desktop` v2.6.2) is a local-first Windows desktop music player built with **Electron**, **React**, **TypeScript**, and **Vite**. It pairs a frameless Chromium renderer (Liquid Glass / Obsidian Editorial UI) with a Node.js Electron main process that bridges native Windows desktop features, local `yt-dlp` media extraction, Discord Rich Presence, and Web Audio API real-time DSP.

## Languages & Runtimes

| Layer | Language / Runtime | Target / Version | Config / Source |
|---|---|---|---|
| Renderer UI | TypeScript + React (JSX) | ES2022, `react-jsx` | `tsconfig.json`, `src/main.tsx` |
| Main & Preload | TypeScript (bundled to Node CJS/JS) | Node 20 (`--target=node20`) | `package.json`, `electron/main.ts`, `electron/preload.ts` |
| Desktop Shell | Electron (Chromium + Node.js) | `^35.0.0` | `package.json`, `electron/main.ts` |
| Styles | Vanilla CSS (CSS Custom Properties) | Modern Chromium CSS | `src/styles/index.css` |
| Build / Maintenance Scripts | ESM Node.js (`.mjs`), PowerShell (`.ps1`), Bash (`.sh`), Batch (`.bat`) | Node 20+ | `scripts/clean-release.mjs`, `start-freq.ps1`, `start-freq.bat` |

## Frameworks & Libraries

### Production Dependencies (`package.json`)

| Package | Version | Purpose | Where Used |
|---|---|---|---|
| `react` | `^19.0.0` | UI component framework | `src/main.tsx`, `src/App.tsx`, `src/components/*`, `src/views/*` |
| `react-dom` | `^19.0.0` | React DOM renderer | `src/main.tsx` |
| `lucide-react` | `^1.16.0` | Iconography across player, sidebar, modals, and views | `src/components/*`, `src/views/*` |
| `mqtt` | `^5.16.1` | MQTT-over-WebSocket client for Listen Together synchronized rooms | `src/services/partyService.ts` |
| `@xhayper/discord-rpc` | `^1.5.1` | Discord IPC client for Rich Presence & party join invites | `electron/discordRpc.ts` |
| `electron-updater` | `^6.8.9` | Auto-update check, download, and NSIS install via GitHub Releases | `electron/main.ts` |

### Development Dependencies (`package.json`)

| Package | Version | Purpose |
|---|---|---|
| `electron` | `^35.0.0` | Desktop application runtime & packaging target |
| `electron-builder` | `^26.15.3` | Windows NSIS installer & Portable `.exe` packager |
| `vite` | `^6.2.1` | Renderer dev server (`localhost:5173`) and production bundler |
| `@vitejs/plugin-react` | `^4.3.4` | React Fast Refresh and JSX transform for Vite |
| `typescript` | `^5.8.2` | Type checking (`strict: true`, `noEmit: true` for renderer) |
| `@types/node` | `^22.13.10` | Node.js type definitions |
| `@types/react` | `^19.0.10` | React 19 type definitions |
| `@types/react-dom` | `^19.0.4` | React DOM 19 type definitions |
| `concurrently` | `^9.1.2` | Dev dependency for parallel command execution |
| `cross-env` | `^7.0.3` | Cross-platform environment variable helper |

## Build, Bundling & Packaging

### Build Pipeline (`package.json`)

- **Renderer (`build:ui`):** `vite build` outputs static assets to `dist/` (`vite.config.ts` sets `base: './'`, `@` alias to `./src`, and injects `__APP_VERSION__` from `package.json` and `__BUILD_ID__` from `git rev-parse --short HEAD`).
- **Electron Main & Preload (`build:electron`):** Uses `esbuild` (via `npx esbuild`) to bundle `electron/main.ts` -> `dist-electron/main.js` and `electron/preload.ts` -> `dist-electron/preload.js` with `--platform=node --target=node20 --external:electron`.
- **Full Build (`build`):** Runs `npm run build:ui && npm run build:electron`.
- **Windows Distribution (`dist` / `dist:dir`):** Runs `npm run build` followed by `electron-builder --win` (and `clean:release` via `node scripts/clean-release.mjs` to prune stale `.exe`/`.blockmap` artifacts from `release/`).

### Electron Builder Configuration (`electron-builder.json`)

- **App ID:** `com.freq.music` (`productName`: `FreQ`)
- **Targets (Windows x64):**
  - `nsis` (`FreQ.Setup.${version}.${ext}`) — interactive installer, desktop & start menu shortcuts
  - `portable` (`${productName}-Portable-${version}.${ext}`) — standalone portable executable
- **Publish Provider:** GitHub (`owner`: `soumalyajoardar`, `repo`: `FreQ`)
- **Bundled Extra Resources:**
  - `build/yt-dlp.exe` -> `bin/yt-dlp.exe`
  - `electron/assets` -> `assets` (tray icon `tray.png` and thumbar icons `thumb-play.png`, `thumb-pause.png`, `thumb-next.png`, `thumb-prev.png`)

### NPM Scripts (`package.json`)

| Script | Command | Purpose |
|---|---|---|
| `dev` | `vite` | Start Vite dev server on port `5173` (`strictPort: true`) |
| `build:ui` | `vite build` | Build React renderer into `dist/` |
| `build:electron` | `esbuild` main & preload | Bundle Electron main & preload into `dist-electron/` |
| `build` | `build:ui` + `build:electron` | Build complete app |
| `start` / `electron` | `electron .` | Launch Electron against built `dist/` |
| `freq` | `npm run build && electron .` | Rebuild and launch Electron (also invoked by `start-freq.ps1` / `start-freq.bat`) |
| `dist` | `build` + `electron-builder --win` + `clean:release` | Build Windows installers and prune older versions |
| `dist:dir` | `build` + `electron-builder --win --dir` | Build unpacked Windows directory (`release/win-unpacked/`) |
| `clean:release` | `node scripts/clean-release.mjs` | Remove older installer payloads in `release/` |

## Styling, Fonts & Browser APIs

- **Design System:** Custom Obsidian Editorial / Liquid Glass CSS in `src/styles/index.css` using CSS variables (`--bg-primary`, `--accent-cyan`, `--glass-blur`, etc.) without Tailwind or CSS-in-JS.
- **Typography:** Google Fonts `Inter` and `Instrument Serif` loaded in `index.html`, with system font fallbacks.
- **Content Security Policy:** Enforced via `<meta http-equiv="Content-Security-Policy">` in `index.html`, restricting scripts to `'self' 'unsafe-inline'`, workers to `'self' blob:`, styles/fonts to `'self'` and Google Fonts, and `connect-src` to `'self' https: wss: ws:`.
- **Browser / Web Platform APIs:**
  - **Web Audio API** (`src/services/audioEngine.ts`): `AudioContext`, `MediaElementAudioSourceNode`, `BiquadFilterNode`, `ConvolverNode`, `DynamicsCompressorNode`, `ChannelSplitterNode`, `ChannelMergerNode`, `GainNode`, `AnalyserNode`, `StereoPannerNode`, `PannerNode` (HRTF), and `AudioContext.setSinkId` / `HTMLAudioElement.setSinkId` for output device routing.
  - **HTML5 Canvas 2D** (`src/services/shareCard.ts`): Renders 1080×1440 PNG Now-Playing share cards client-side.
  - **Media Session API** (`src/services/audioEngine.ts`): Syncs metadata and position state with Windows OS media controls.

## Repository Tooling & GSD Metadata

- `model_capabilities.yaml` and `adapters/` (`adapters/CLAUDE.md`, `adapters/GEMINI.md`, `adapters/GPT_OSS.md`): Optional AI agent guidance and model capability profiles for the GSD workflow; not imported or executed by the application runtime.
- `scripts/`: Contains `clean-release.mjs` (runtime release cleanup) alongside repository search/validation scripts (`search_repo.ps1`/`.sh`, `setup_search.ps1`/`.sh`, `validate-*.ps1`/`.sh`).

---
*Stack analysis: 2026-11-28*
