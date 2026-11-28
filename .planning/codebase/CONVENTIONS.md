# Coding Conventions

**Analysis Date:** 2026-11-28

## Language & TypeScript Configuration

- **Language:** TypeScript (`^5.8.2` in `package.json`) with React 19 (`react` / `react-dom` `^19.0.0`) for the renderer (`src/`) and Electron (`^35.0.0`) + Node.js (`@types/node` `^22.13.10`) for the main/preload processes (`electron/`).
- **Renderer `tsconfig.json`:**
  - `target`: `"ES2022"`, `lib`: `["ES2022", "DOM", "DOM.Iterable"]`, `module`: `"ESNext"`, `moduleResolution`: `"bundler"`.
  - `jsx`: `"react-jsx"`, `isolatedModules`: `true`, `noEmit`: `true`, `resolveJsonModule`: `true`, `allowImportingTsExtensions`: `true`, `skipLibCheck`: `true`.
  - `strict`: `true` and `noFallthroughCasesInSwitch`: `true`, while `noUnusedLocals` and `noUnusedParameters` are `false`.
  - `include`: `["src"]` — **note:** `electron/` (`electron/main.ts`, `electron/preload.ts`, `electron/discordRpc.ts`) is outside `tsconfig.json` `include` and is bundled directly via `esbuild` in `package.json` (`build:electron`).
- **Global Ambient Types (`src/vite-env.d.ts`):**
  - Declares build-time constants `__APP_VERSION__` and `__BUILD_ID__` (injected by `vite.config.ts` `define`) and extends `Window` with `electronAPI?: ElectronAPI` imported from `../electron/preload`.
- **Path Aliases:**
  - `vite.config.ts` defines `@` → `./src`, though source files consistently use relative imports (`./components/...`, `../services/...`, `../types`, `../utils/...`).

## Code Style & Formatting

- **No Repo-Level Linter/Formatter Config:** There is no `.eslintrc*`, `eslint.config.*`, or `.prettierrc*` in the workspace root (only a single inline `// eslint-disable-next-line react-hooks/exhaustive-deps` comment in `src/components/useExitTransition.ts`).
- **Formatting Patterns Observed:**
  - 2-space indentation across `src/` and `electron/`.
  - Semicolons used consistently across `src/` and `electron/` (occasional omission in `vite.config.ts`).
  - Single quotes (`'...'`) for string literals and imports.
  - Trailing commas in multi-line object literals, arrays, and parameter lists.
- **Styling (`src/styles/index.css`):**
  - CSS custom properties on `:root` (Obsidian Editorial design system: `--bg-primary`, `--surface-primary`, `--accent-cyan`, `--text-primary`, `--glass-*`, `--line`, etc.) with inline `style` objects used selectively for dynamic/fallback layouts (e.g., `src/components/ErrorBoundary.tsx`).

## Naming Conventions

| Entity | Convention | Examples |
|--------|------------|----------|
| React Components & Views | `PascalCase.tsx` | `src/components/PlayerBar.tsx`, `src/components/ErrorBoundary.tsx`, `src/views/HomeView.tsx`, `src/views/SettingsView.tsx` |
| Custom Hooks | `camelCase.ts` (`use*`) | `src/components/useExitTransition.ts` (`useExitTransition`) |
| Services & Utilities | `camelCase.ts` | `src/services/audioEngine.ts`, `src/services/playbackManager.ts`, `src/utils/shuffle.ts` |
| Electron Modules | `camelCase.ts` | `electron/main.ts`, `electron/preload.ts`, `electron/discordRpc.ts` |
| Interfaces & Types | `PascalCase` | `MediaTrack`, `UserPlaylist`, `AudioMode`, `RepeatMode` (`src/types/index.ts`), `ElectronAPI`, `DesktopPrefs` (`electron/preload.ts`) |
| Component Props | `<ComponentName>Props` | `ErrorBoundaryProps` (`src/components/ErrorBoundary.tsx`), `PlayerBarProps` (`src/components/PlayerBar.tsx`), `HomeViewProps` (`src/views/HomeView.tsx`) |
| Constants | `UPPER_SNAKE_CASE` | `EXPIRY_SAFETY_MARGIN_MS` (`src/services/playbackManager.ts`), `EQ_BAND_LABELS`, `LEVEL_TARGET_DB` (`src/services/audioEngine.ts`), `MAX_LOG_BYTES` (`electron/main.ts`) |
| `localStorage` Keys | `'freq_<snake_case>'` | `'freq_quality_mode'` (`src/components/PlayerBar.tsx`), `'freq_output_device'` (`src/services/audioEngine.ts`), `'freq_library_data'` (`src/services/libraryStore.ts`), `'freq_party_privacy'` (`src/services/partyService.ts`) |
| Custom DOM Events | `'freq-<kebab-case>'` | `'freq-quality-preset'` (`src/components/PlayerBar.tsx`) |
| IPC Channels | `'kebab-case'` | `'check-for-updates'`, `'window-minimize'`, `'desktop-get-prefs'`, `'get-stream-url'`, `'discord-update-activity'` (`electron/main.ts`) |

## Component & Module Patterns

- **Functional React Components with Named Exports:**
  - Components and views export named functions (e.g., `export function PlayerBar(...)`, `export function HomeView(...)`, `export class ErrorBoundary extends React.Component<...>` in `src/components/ErrorBoundary.tsx`).
  - `src/main.tsx` mounts `<App />` wrapped in `<React.StrictMode>` and `<ErrorBoundary>`, calling `initTheme()` before `ReactDOM.createRoot(...)`.
- **Service Singletons & Pure Logic Modules:**
  - Stateful services in `src/services/` and `electron/` use class-based singletons (e.g., `PlaybackManager` in `src/services/playbackManager.ts`, `AudioEngine` in `src/services/audioEngine.ts`, `LibraryStore` in `src/services/libraryStore.ts`, `DiscordRpcManager` in `electron/discordRpc.ts`).
  - Pure, side-effect-free logic is extracted into dedicated modules with JSDoc comments (e.g., `src/services/playbackQueueLogic.ts` for queue/repeat math, `src/utils/shuffle.ts` for Fisher-Yates `shuffle<T>`).
- **Electron IPC & Preload Bridge:**
  - `electron/preload.ts` exposes a typed `ElectronAPI` via `contextBridge.exposeInMainWorld`, with event subscription methods returning unsubscribe callbacks (`() => void`).
  - `electron/main.ts` registers handlers via `ipcMain.handle('<channel>', ...)`.
- **Documentation Comments:**
  - JSDoc (`/** ... */`) is used on exported helpers and interface fields (e.g., `src/utils/shuffle.ts`, `src/types/index.ts`, `src/services/playbackQueueLogic.ts`, `src/components/PlayerBar.tsx`).
  - Inline `//` comments explain non-obvious invariants, edge cases, and design rationale (e.g., `electron/main.ts` URL safety check `isSafeExternalUrl`, `electron/discordRpc.ts` synchronous `desiredPlaying` tracking, `vite.config.ts` `buildId()`).

## Error Handling & Logging

- **UI Crash Guard:**
  - `src/components/ErrorBoundary.tsx` catches React render errors via `getDerivedStateFromError` and `componentDidCatch`, logs `[FreQ] UI crash caught:` via `console.error`, and renders a recovery screen with a `Reload FreQ` button.
- **Defensive `try/catch` & Graceful Degradation:**
  - Heavy use of `try/catch` blocks across `src/` and `electron/` (184 `catch` clauses observed).
  - Non-critical storage/IO errors (e.g., `localStorage` access in `src/components/PlayerBar.tsx`) are intentionally swallowed (`// Ignored.`), while playback/network/store failures fall back to secondary providers (e.g., `src/services/ytmusic.ts` falling back from cloud search to local `yt-dlp` and JioSaavn) or log warnings.
- **Logging Conventions:**
  - **Renderer (`src/`):** Uses `console.warn` / `console.error` / `console.log` with bracketed module prefixes in newer/service code (e.g., `[FreQ]`, `[LrcLib]`, `[PartyService]`, `[FreQ Dev Diag]`).
  - **Main Process (`electron/main.ts`):** Defines a custom `log(...args: any[])` helper that timestamps messages (`[ISOString] ...`), writes to `freq-debug.log` (rotating/truncating when exceeding `MAX_LOG_BYTES = 5 * 1024 * 1024` every 200 writes), and forwards to `console.log`. Global handlers register `process.on('uncaughtException', ...)` and `process.on('unhandledRejection', ...)`.
  - **Discord RPC (`electron/discordRpc.ts`):** Uses `console.log` / `console.warn` with `[Discord RPC]` prefix.

## GSD Repository & Script Conventions

- **Workflow & Rule Docs (`PROJECT_RULES.md`, `GSD-STYLE.md`, `adapters/`):**
  - Canonical protocol: `SPEC -> PLAN -> EXECUTE -> VERIFY -> COMMIT` (`PROJECT_RULES.md`).
  - Commit format: `type(scope): description` (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`).
  - Shell discipline (`PROJECT_RULES.md`): one command per invocation (never chain with `&&` or `||` due to Windows PowerShell 5.1 compatibility).
  - Model independence: `adapters/CLAUDE.md`, `adapters/GEMINI.md`, `adapters/GPT_OSS.md` are optional enhancements referencing `PROJECT_RULES.md`.
- **PowerShell Script Encoding (`scripts/validate-encoding.ps1`):**
  - `.ps1` scripts containing non-ASCII characters must include a UTF-8 BOM (`0xEF 0xBB 0xBF`) so Windows PowerShell 5.1 parses them without syntax errors.

---

*Analysis Date: 2026-11-28*
