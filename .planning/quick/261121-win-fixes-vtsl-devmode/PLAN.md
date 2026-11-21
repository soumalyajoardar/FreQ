# Quick Plan: Windows Fixes, Audio Separation, Developer Mode & VTSL Simulation

**Task ID:** 261121-win-fixes-vtsl-devmode  
**Goal:** Address 5 specific user requests in the Windows version:
1. Fix playback device list showing 3 identical "Headphones" or "Speakers" due to Windows Default/Communications aliases and aggressive regex stripping.
2. Fix post-update catalog (What's New changelog) not appearing after an update.
3. Make stereo separation distinctly more noticeable in `audioEngine.ts`.
4. Add Developer Mode in Settings with explicit warning about stability/use-only-if-developer and useful debugging utilities.
5. Add "VTSL" option on top of Settings that launches an entertaining high-fi simulation with blinking lights, animated static, oscilloscope, and LED meters.

---

## Tasks

- [ ] Task 1: Fix Audio Device Enumeration and Labeling in `src/components/GlobalSearch.tsx` and `src/services/audioEngine.ts`.
  - Filter out `communications` endpoint.
  - Distinguish `System default` cleanly from physical hardware endpoints.
  - Preserve distinguishing adapter/brand info when multiple devices share names.
  - Render appropriate icons for Speakers vs Headphones vs HDMI/Displays.

- [ ] Task 2: Fix Post-Update Release Notes Catalog in `src/data/changelog.ts`, `src/App.tsx`, and `src/views/SettingsView.tsx`.
  - Fix `getPendingReleaseNotes` so existing users upgrading don't get blocked by `lastSeen == null`.
  - Add explicit "View release notes / What's new" button in Settings About section.
  - Track `freq_just_updated` flag during update installation.

- [ ] Task 3: Enhance Stereo Separation in `src/services/audioEngine.ts`.
  - Expand the Mid-Side spatializer side-multiplier curve up to 2.8x.
  - Apply gentle Mid attenuation at high width to prevent the center mono signal from drowning out the wide stereophonic field.
  - Retain bit-perfect untouched stereo at 0% width and safe dynamic headroom.

- [ ] Task 4: Add Developer Mode in `src/views/SettingsView.tsx` with Warning and Developer Tools.
  - Add prominent warning: "Use this only if you are a developer..."
  - Expose `openDevTools` in `electron/preload.ts` and `electron/main.ts`.
  - Add diagnostics (audio engine state, platform specs, storage inspection, logs dump, force reload).

- [ ] Task 5: Add "VTSL" Option on Top of Settings with High-Fi Blinking Lights & Static Simulation.
  - Create `src/components/VtslModal.tsx` with canvas static generator, LED arrays, oscilloscope waveform, techno-babble console, and hyper-hi-fi controls.
  - Add "VTSL" button/badge on top of Settings to open the simulation.

- [ ] Task 6: Verification & Build.
  - Run TypeScript compile check (`cmd.exe /c npx tsc --noEmit`).
  - Run Vite UI build (`cmd.exe /c npm run build:ui`).
  - Run Electron build (`cmd.exe /c npm run build:electron`).
  - Verify all 5 features function without breaking existing capabilities.
