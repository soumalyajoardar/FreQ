# Codebase Concerns & Technical Debt

**Analysis Date:** 2026-11-28

---

## 1. Security & Privacy Considerations

### Auto-Updater Code Signature Verification Disabled
- **Location:** `electron/main.ts:738-741`
- **Issue:** `(autoUpdater as any).verifyUpdateCodeSignature = () => null;` explicitly bypasses Windows code signature verification on `electron-updater` updates (configured for GitHub Releases `soumalyajoardar/FreQ` in `electron-builder.json:9-15` and `electron/main.ts:867-873`).
- **Risk:** If a release artifact or download channel is compromised, the updater will install and execute unsigned binaries without signature validation.

### Listen Party Uses Public Unauthenticated MQTT Brokers & 4-Digit Codes
- **Location:** `src/services/partyService.ts:51-54`, `src/services/partyService.ts:317-321`
- **Issue:** Listen Party connects directly from the renderer to public, unauthenticated MQTT-over-WebSocket brokers (`wss://broker.emqx.io:8084/mqtt` and `wss://test.mosquitto.org:8081/mqtt`). Rooms are keyed by 4-digit numeric codes (10,000 possible rooms) with no payload signing, encryption, or host authentication.
- **Risk:** Anyone can enumerate or eavesdrop on active party topics, or inject spoofed `TRACK_CHANGE`, `PLAY_STATE`, `SEEK`, `HOST_LEAVE`, or `REACTION` packets into any active room.

### Debug Log Path & Renderer Console Forwarding (`freq-debug.log`)
- **Location:** `electron/main.ts:24-39`, `electron/main.ts:608-610`
- **Issue:** `logFile` is resolved via `path.join(__dirname, '../freq-debug.log')`, and all `mainWindow.webContents` `console-message` events are forwarded into it.
  - In development, this writes `freq-debug.log` to the workspace root (ignored in `.gitignore:12`).
  - In packaged `app.asar` builds, `__dirname` resolves inside the read-only ASAR archive, causing `fs.appendFileSync(logFile, msg)` to fail silently inside `try {} catch {}` (`electron/main.ts:29`).
- **Risk:** Production main-process diagnostics are silently lost, while dev logs capture all renderer console output (including any logged URLs or session diagnostics).

### Implicit Renderer Sandbox & Exposed DevTools Toggle
- **Location:** `electron/main.ts:587-595`, `electron/main.ts:1142-1148`, `src/views/SettingsView.tsx:1080-1093`
- **Observation:** `BrowserWindow` `webPreferences` properly sets `contextIsolation: true`, `nodeIntegration: false`, and `webSecurity: true`, and `openExternalSafe` (`electron/main.ts:48-63`) restricts external links to `http:`/`https:`. However, `sandbox: true` is not explicitly set (relying on Electron 35 defaults), and `open-dev-tools` is exposed in production via `electron/preload.ts:188` and `SettingsView.tsx`.

### Hardcoded JioSaavn DES Key & Unenforced HTTPS on Decrypted URLs
- **Location:** `electron/main.ts:1541-1575`
- **Issue:** `SAAVN_DES_KEY` (`Buffer.from('38346591')`) is hardcoded for decrypting JioSaavn media URLs. `saavnDecrypt()` accepts any decrypted string starting with `http` (`if (raw.startsWith('http')) return raw;` at `electron/main.ts:1569`), unlike `isValidStreamUrl()` (`electron/main.ts:523`) and `src/services/playbackSource.ts:32` which strictly require `https://`.

---

## 2. Known Bugs, Error Handling Gaps & Fragile Areas

### Concurrent `download-track` Race Condition & Missing `ffmpeg` Bundling
- **Location:** `electron/main.ts:1338-1380`, `electron-builder.json:22-31`
- **Issues:**
  1. Unlike `get-stream-url` (which deduplicates concurrent requests via `streamInflight` in `electron/main.ts:1249-1255`), `download-track` has no inflight deduplication. Two rapid download triggers for the same `videoId` spawn parallel `yt-dlp` processes writing to the same `%(id)s.%(ext)s` / `${videoId}.mp3` destination.
  2. `download-track` passes `-x --audio-format mp3` (`electron/main.ts:1355`), which requires `ffmpeg` for post-processing. `electron-builder.json:22-31` only bundles `build/yt-dlp.exe` and `electron/assets` (`build/` contains `icon.ico`, `icon.png`, and `yt-dlp.exe`), so MP3 conversion fails unless `ffmpeg` is installed on the user's system `PATH`.

### Hardcoded Sibling Repository Fallback in `resolveYtDlp()`
- **Location:** `electron/main.ts:556-568`
- **Issue:** `resolveYtDlp()` probes `../../Android/backend-python/.venv/Scripts/python.exe` and `../../Android/backend-python/.venv/Scripts/yt-dlp.exe` as fallbacks, coupling desktop development resolution to an external sibling directory structure.

### Widespread Silent `catch {}` Blocks
- **Locations:**
  - `electron/main.ts` (lines 29, 36, 190, 198, 336, 469, 475, 541, 548, 554, 561, 568, 631, 741, 828, 834, 973, 993, 1105, 1108, 1334, 1369, 1391, 1521)
  - `src/services/partyService.ts` (lines 140, 180, 189, 197, 204, 222, 247, 415, 579, 606)
  - `src/services/audioEngine.ts` (lines 164, 475, 656)
  - `electron/discordRpc.ts` (line 603)
  - `src/services/theme.ts` (lines 43, 62), `src/components/Sidebar.tsx` (line 69), `src/views/SettingsView.tsx` (lines 229, 242)
- **Impact:** Empty `catch {}` blocks swallow filesystem write failures, JSON parse errors, `localStorage` quota errors, and Web Audio / MQTT cleanup failures without telemetry.

### Dependence on Unauthenticated Third-Party / Community Endpoints
- **Locations:**
  - `https://freq-api.vercel.app` (`electron/main.ts:1309`, `src/services/ytmusic.ts:5`, `src/services/remotePlaybackProvider.ts:19`)
  - YouTube scraping via `yt-dlp` (`electron/main.ts:1263-1274`)
  - `https://www.jiosaavn.com/api.php` (`electron/main.ts:1588`) and community mirrors `https://saavn.sumit.co`, `https://saavn.dev` (`src/services/jiosaavn.ts:21`)
  - `https://lrclib.net/api/` (`src/services/lyrics.ts:3-4`)
- **Impact:** Upstream rate limits, CORS/bot-check changes, or API deprecations directly degrade search, lyrics, and stream resolution.

---

## 3. Technical Debt & Monolithic Complexity

### Oversized Monolithic Files
Several core files concentrate too many responsibilities, making changes and reviews error-prone:
- `src/App.tsx` (~2,341 lines): Mixes top-level routing, playback orchestration, queue state, 32 `useState`/`useEffect` hooks, party sync, mini-player transitions, and keyboard shortcuts. Contains `eslint-disable-next-line react-hooks/exhaustive-deps` suppressions at lines 303, 1703, and 1894.
- `src/styles/index.css` (~2,107 lines): Single global stylesheet for all views, modals, and liquid-glass effects.
- `electron/main.ts` (~1,690 lines total): Combines window management, tray/thumbar/jump-list integration, auto-updater, `yt-dlp` IPC, offline downloads, library file I/O, and JioSaavn decryption.
- `src/views/SettingsView.tsx` (~1,134 lines)
- `src/services/audioEngine.ts` (~1,151 lines total)
- `src/services/libraryStore.ts` (~946 lines total)
- `src/services/partyService.ts` (~906 lines total)
- `src/components/NowPlayingModal.tsx` (~794 lines), `src/components/PartyModal.tsx` (~787 lines), `src/views/PartyView.tsx` (~742 lines)
- `electron/discordRpc.ts` (~614 lines total)

### TypeScript Coverage & Strictness Gaps
- **Electron Main/Preload Excluded from `tsc`:** `tsconfig.json:19` sets `"include": ["src"]`, so `electron/main.ts`, `electron/preload.ts`, and `electron/discordRpc.ts` are not typechecked by `tsc`. `package.json:9` (`build:electron`) bundles them directly with `esbuild`, which strips types without typechecking.
- **Relaxed Compiler Flags:** `tsconfig.json:15-16` disables `noUnusedLocals` and `noUnusedParameters`.
- **Untyped `as any` Casts:** Used in `src/services/libraryStore.ts:151-225` (deserialization), `src/services/audioEngine.ts:175,791,1016`, `electron/discordRpc.ts:351,513`, `electron/main.ts:419,740,1647`, and `src/components/TitleBar.tsx:31,68`.

### Zero Automated Test Coverage
- **Observation:** No `.test.*` or `.spec.*` files exist in `src/` or `electron/`, and `package.json` defines no test runner or test scripts. All playback, queue, party sync, IPC, and library persistence logic is verified manually.

### Lack of Inline Debt Markers
- **Observation:** A repository-wide search for `TODO`, `FIXME`, `HACK`, `XXX`, and `BUG` across `src/`, `electron/`, `adapters/`, and `scripts/` returned zero source-code markers (only usage examples in `scripts/search_repo.ps1` and `scripts/search_repo.sh`). Known workarounds (such as the updater signature bypass and `yt-dlp` fallback chains) are documented only in prose comments.

---

## 4. Performance Bottlenecks & Scaling Risks

### Synchronous Full-Library JSON Writes on Main Thread
- **Location:** `src/services/libraryStore.ts:250-275`, `electron/main.ts:1470-1485`
- **Issue:** Every library mutation (`toggleLike`, playlist edits, play stats, download records) serializes the entire `StoredLibrary` payload and invokes `save-library-data`, which runs `JSON.stringify(payload, null, 2)` and `fs.writeFileSync(filePath, json, 'utf-8')` synchronously in the Electron main process (capped at 64 MB at `electron/main.ts:1476`).
- **Impact:** As `playStats`, `likedTracks`, and playlists grow, frequent synchronous pretty-printed JSON serialization and blocking disk writes can stall main-process IPC and UI responsiveness.

### Background Throttling Disabled
- **Location:** `electron/main.ts:591`
- **Issue:** `backgroundThrottling: false` is set on `mainWindow`, keeping renderer timers, React updates, and Web Audio/visual loops running at full rate even when the window is hidden in the tray or minimized.

### Heavy Static Assets & Workspace Artifacts
- **Location:** `src/assets/backgrounds/` (~4.8 MB across four ~1.2 MB JPGs), `src/assets/freq-icon.png` (~259 KB), `electron-dist/` (local Electron runtime copy, >200 MB), and `freq-site-6.zip` (~149 KB) in the workspace root.

---

## 5. Build & Packaging Quirks

- **Installer Accumulation in `release/`:** `electron-builder` produces ~110 MB NSIS setup and ~106 MB portable `.exe` artifacts per build without pruning older versions; `package.json:14` chains `npm run clean:release` (`scripts/clean-release.mjs`) to delete stale versioned installers after `dist`.
- **Vite Dev Server File-Watch Exclusions:** `vite.config.ts:39-50` explicitly ignores `dist/`, `dist-electron/`, `release/`, `electron-dist/`, and `build/yt-dlp.exe` because packager staging churn otherwise exhausts file handles and crashes the dev server.
- **Windows PowerShell `npx` Execution Policy:** Running `npx` in restricted PowerShell environments fails (`npx.ps1 cannot be loaded because running scripts is disabled on this system`), requiring `cmd /c npx ...` or direct `./node_modules/.bin/` invocations.
