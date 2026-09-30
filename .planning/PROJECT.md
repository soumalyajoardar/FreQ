# SPEC.md — Project Specification

> **Status**: `FINALIZED`
>
> ⚠️ **Planning Lock**: Spec finalized and aligned with FreQ core vision and desktop user preferences.

## Vision
FreQ Desktop for Windows is an ultra-premium, ad-free, account-free, tracking-free desktop music streaming application inspired directly by the FreQ Android experience (`S:\PROJECTS\WAVE`). It combines YouTube Music discovery, on-device audio stream resolution via high-speed native extraction (yt-dlp), Web Audio DSP with signature audio flavors (Normal, SnR / Slowed + Reverb, Nightcore), tap-to-flip LRCLIB synchronized lyrics, local-first library persistence, and a jaw-dropping Liquid-Glass dark aesthetic tailored for Windows desktop.

## Goals
1. **Desktop Native Parity** — Bring the complete FreQ Android experience to Windows with desktop-class ergonomics (frameless glass window, custom titlebar, sidebar navigation, Windows MediaSession integration with keyboard media keys and taskbar controls).
2. **Reliable On-Device Audio Streaming** — Leverage local high-speed extraction (yt-dlp bridge) to obtain direct audio streams without datacenter IP blocks, supporting instant playback and track pre-fetching.
3. **Audio Flavors Engine (Normal, SnR, Nightcore)** — Web Audio API pipeline with ConvolverNode impulse reverb for lush SnR (0.8x speed + pitch down + 50% wet reverb) and Nightcore (1.2x speed + pitch up).
4. **Synced Lyrics with 3D Flip Card** — Real-time timestamped synchronized lyrics fetched on-device via LRCLIB with smooth auto-scroll, line-by-line highlights, and 3D card flip animation.
5. **Local-First Privacy & Library** — Zero accounts, zero tracking. Stored completely on-device: Liked Songs, Custom Playlists (create/edit/delete/reorder), Listening History / Recents, and Search History.
6. **Vibe-Aware Queue & Recommendations** — Continuous playback with smart queue recommendation matching language, artist affinity, liked songs, and genre rails.
7. **Liquid-Glass Design System** — Deep obsidian palette (`#090A0F`, `#0E1018`, `#12141F`), vibrant neon accents (Electric Cyan `#00E5FF`, Violet `#8B5CF6`, Teal `#00F5D4`), glassmorphism with backdrop filters, and dynamic track artwork ambient background lighting.

## Non-Goals (Out of Scope)
- Cloud account sync / user logins (strictly against FreQ's privacy philosophy).
- Commercial subscriptions, monetization, or ad networks.
- Video playback (FreQ is strictly a pure audio experience).

## Constraints
- Windows 10/11 64-bit environment.
- Node.js v24+ runtime, Electron 30+, React 18+, Vite, TypeScript.
- Extraction leverages local executable (`yt-dlp.exe`) with fallback to node extractor or FreQ Vercel API.

## Success Criteria
- [x] Comprehensive architectural analysis of `S:\PROJECTS\WAVE` completed.
- [ ] Electron + Vite + React desktop application successfully initialized and structured.
- [ ] Frameless window with custom Windows titlebar, minimize, maximize/restore, and close buttons.
- [ ] Local audio extraction bridge operational and streams audio playback smoothly.
- [ ] Web Audio DSP pipeline implements Normal, SnR (slowed + reverb), and Nightcore modes seamlessly.
- [ ] LRCLIB synchronized lyrics display with active timestamp highlighting and 3D flip card.
- [ ] Full local library functionality: Likes, Playlists, History, Recents, and Search History persisted on disk.
- [ ] YouTube Music search (tracks, artists, albums) and Home catalog discovery rails active.
- [ ] Windows MediaSession controls active (taskbar thumbnail buttons, keyboard play/pause/prev/next).

---

*Last updated: 2026-09-30*
