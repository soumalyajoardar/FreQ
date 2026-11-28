# Testing & Validation Patterns

**Analysis Date:** 2026-11-28

## Test Frameworks & Runtime Dependencies

- **Application Test Framework:** None configured.
  - `package.json` contains no test runner (`vitest`, `jest`, `mocha`, `playwright`, `cypress`, etc.) in `dependencies` or `devDependencies`, and defines no `"test"` script.
  - No `*.test.*` or `*.spec.*` files exist in `src/`, `electron/`, `scripts/`, or the workspace root (only inside `node_modules/`).
- **Type Checking:**
  - TypeScript compiler (`typescript` `^5.8.2` in `package.json`) serves as the primary static check for the renderer:
    - `node ./node_modules/typescript/bin/tsc --noEmit` (or `npx tsc --noEmit`) validates `src/` per `tsconfig.json` and exits with code `0`.
    - `electron/` is excluded from `tsconfig.json` (`"include": ["src"]`) and is only checked/bundled by `esbuild` during `npm run build:electron`.

## Build & Verification Scripts

- **`package.json` Scripts:**
  - `npm run dev` — Starts Vite dev server (`vite` on port `5173`, `strictPort: true` in `vite.config.ts`).
  - `npm run build:ui` — Bundles renderer via `vite build` into `dist/`.
  - `npm run build:electron` — Bundles `electron/main.ts` and `electron/preload.ts` via `esbuild` (`--platform=node --target=node20 --external:electron`) into `dist-electron/`.
  - `npm run build` — Runs `build:ui` then `build:electron`.
  - `npm run freq` — Builds and launches Electron (`npm run build && electron .`).
  - `npm run dist` / `npm run dist:dir` — Packages Windows NSIS/portable installers via `electron-builder` (`electron-builder.json`) and prunes older release artifacts with `scripts/clean-release.mjs` (`node scripts/clean-release.mjs [--dry-run]`).

## GSD Repository Validation Suite (`scripts/`)

While the desktop app itself has no automated test suite, `scripts/` contains a dual PowerShell (`.ps1`) and Bash (`.sh`) validation suite for GSD metadata, workflows, skills, subagents, templates, and script encoding:

- **Master Runner:** `scripts/validate-all.ps1` / `scripts/validate-all.sh`
  - Invokes all five validators sequentially, tallies `$TotalErrors` / `total_errors`, and exits `0` on pass or `1` on any failure.
  - `scripts/validate-all.ps1` explicitly guards against missing child scripts so a missing validator fails rather than silently passing.
- **Individual Validators:**
  - `scripts/validate-workflows.ps1` / `.sh` — Checks `.agent/workflows/*.md` for YAML frontmatter (`^---`), `description:`, and warns on missing `<process>` tags.
  - `scripts/validate-skills.ps1` / `.sh` — Checks `.agents/skills/*/SKILL.md` existence, YAML frontmatter, `name:`, and `description:`.
  - `scripts/validate-agents.ps1` / `.sh` — Checks `.agents/agents/*.md` for frontmatter, `name`, `description`, `subagent: true`, filename-to-`name` match, and valid Antigravity tool names.
  - `scripts/validate-templates.ps1` / `.sh` — Checks `.gsd/templates/*.md` for `# ` heading, `Last updated` marker (warning), and minimum length `<200` chars (warning).
  - `scripts/validate-encoding.ps1` / `.sh` — Verifies every `scripts/*.ps1` file with non-ASCII bytes carries a UTF-8 BOM and parses cleanly via `[System.Management.Automation.Language.Parser]::ParseFile`.

## Test Seams & Mocking Patterns

- **Test Seams in Pure Modules:**
  - `src/services/playbackQueueLogic.ts` explicitly notes in its header comment that it is a direct port of Android `player/PlaybackQueueLogic.kt` ("M13 test seams") with pure, deterministic functions (`cycleRepeatMode`, `clampQueueIndex`, `planQueueRemove`, `resolveCurrentIndexAfterMove`, `planPlayNext`, `shouldPrefetchNext`) designed for unit testing without player or DOM dependencies.
  - `src/utils/shuffle.ts` (`shuffle<T>`) and `src/services/vibeMatch.ts` / `src/services/continuationQueue.ts` are similarly pure functions.
- **Mocking Patterns:**
  - None currently implemented in the repository (no test harness, mock factories, or Electron IPC mocks exist).
  - `src/services/playbackManager.ts` uses constructor injection (`constructor(private readonly resolver: PlaybackSourceResolver)`) which provides a natural seam for injecting a mock `PlaybackSourceResolver`, though it is currently instantiated as a module singleton.

## Coverage Gaps

- **Zero Automated Unit/Integration Tests:**
  - Pure queue/playback logic (`src/services/playbackQueueLogic.ts`, `src/services/playbackManager.ts`, `src/services/continuationQueue.ts`, `src/services/vibeMatch.ts`, `src/utils/shuffle.ts`) has no automated unit test execution despite having clean pure-function seams.
  - Persistence and state stores (`src/services/libraryStore.ts`, `src/services/playbackPersistence.ts`) have no tests for serialization, migration, or quota/corruption recovery.
  - Web Audio DSP graph and playback state (`src/services/audioEngine.ts`) have no unit or integration tests.
- **No Electron Main/Preload Typecheck or IPC Tests:**
  - `electron/main.ts`, `electron/preload.ts`, and `electron/discordRpc.ts` are not included in `tsconfig.json` (`"include": ["src"]`), meaning `tsc --noEmit` does not typecheck Electron main-process code.
  - IPC handlers (`ipcMain.handle` in `electron/main.ts`) and external-process integrations (`yt-dlp.exe` stream extraction, `electron-updater`, Discord RPC, MQTT `partyService.ts`) have no automated contract or integration tests.
- **No UI Component or E2E Tests:**
  - React components (`src/components/`), views (`src/views/`), and `src/App.tsx` have no component tests (e.g., Testing Library) or Electron E2E tests (e.g., Playwright).
- **No CI Pipeline:**
  - No `.github/workflows/` directory exists to run `tsc --noEmit`, `npm run build`, or `scripts/validate-all.ps1` automatically on commits or PRs.

---

*Analysis Date: 2026-11-28*
