---
status: complete
date: 2026-11-21
slug: 261121-win-fixes-vtsl-devmode
---

# Quick Task Summary: Windows Audio Fixes, Stereo Widener, Developer Mode & VTSL Simulation

## Overview
Addressed 5 key user requests in the FreQ Windows desktop application:
1. **Audio Device Enumeration Bug Fix:** Diagnosed and fixed why 3 identical "Headphones" or "Speakers" were displayed. Windows enumerates `default`, `communications`, and the hardware endpoint; regex stripping removed `Default - ` and `Communications - ` as well as `(Realtek Audio)`, collapsing all 3 into identical entries. Filtered out useless `communications` endpoints, formatted `System default (<Target>)` distinctly from hardware endpoints, deduplicated by `deviceId`, and added context-aware icons (Speakers vs Headphones vs TV/Display).
2. **Post-Update Changelog Modal Fix:** Fixed `getPendingReleaseNotes` which previously returned an empty array whenever `lastSeen == null` and immediately marked the version as seen. Existing users upgrading to 2.5.0 never had `freq_last_seen_version` in `localStorage`, causing the release notes dialog to be permanently suppressed. Added upgrade detection, update flag tracking, and manual "What's new" / "Changelog" buttons in Settings.
3. **Enhanced Stereo Separation:** Upgraded the broadcast Mid-Side stereo spatializer curve in `audioEngine.ts`. Expanded the side multiplier up to 2.85x and added subtle Mid compensation to prevent the center mono channel from drowning out the expansive stereo field, while maintaining bit-perfect original stereo at 0% width and safe dynamic headroom.
4. **Developer Mode with Warning:** Added a dedicated Developer Mode section in Settings with an explicit warning banner ("Use only if you are a developer!"). When enabled, provides DevTools inspector toggle, diagnostic dump to clipboard/console, What's New dialog tester, and window reload.
5. **VTSL High-Fi Simulation:** Added a "VTSL" card on top of Settings that launches an entertaining high-fi simulation (`VtslModal.tsx`) featuring real-time analog CRT TV static fuzz, dual-trace neon oscilloscope, 24-band animated LED meters, blinking annunciator lights, rolling techno-babble logs, and warp overdrive controls.

## Verification
- TypeScript typecheck passed cleanly: `cmd.exe /c npx tsc --noEmit` exited 0.
- Vite UI build passed cleanly: `cmd.exe /c npm run build:ui` built in 9.55s.
- Electron build passed cleanly: `cmd.exe /c npm run build:electron` built in 197ms.
