# ARCHITECTURE.md — System Architecture & Design

## System Overview
FreQ Desktop for Windows is an Electron-powered application consisting of two primary processes:
1. **Main Process (Node.js runtime)**:
   - Manages native Windows application window (frameless acrylic/mica window, titlebar IPC, maximize/minimize/close).
   - Manages audio extraction bridge (spawning `yt-dlp` locally to obtain direct audio stream URLs, with fallback to yt-api).
   - Manages local filesystem storage (`freq_library.json`, user preferences, download cache).
   - Manages Windows native system tray and power/sleep prevention during playback.
2. **Renderer Process (React + Vite + Web Audio API)**:
   - UI layer: Liquid-Glass design system, responsive desktop layout (left sidebar, top navigation & search, central dynamic content viewport, persistent bottom mini-player bar, expandable full-screen Now Playing modal).
   - Web Audio DSP pipeline: `<audio>` element hooked into `AudioContext` -> `MediaElementAudioSourceNode` -> `ConvolverNode` (reverb impulse generator for SnR mode) + `GainNode` -> `AudioDestinationNode`. Playback rate and pitch modulation for Nightcore (1.2x) and SnR (0.8x).
   - Lyrics Engine: Direct on-device querying of `https://lrclib.net/api/get`, LRC timestamp parsing into millisecond cues, smooth RAF-based active cue tracking, tap-to-flip 3D card.
   - Vibe-Aware Queue Engine: Ported directly from FreQ Android `AutoplayEngine.kt` to TypeScript, computing artist affinity, language script matching, and catalog position nudges.
   - Local Library Store: React state backed by IPC file persistence (Zustand or custom observable hook).

## Component Hierarchy & Layout
```
+--------------------------------------------------------------------------+
|  [Logo: FreQ]  [Search Input (live)]   [Time-of-day greeting] [-][#][X]   |  <-- Custom Titlebar
+---------------------+----------------------------------------------------+
|  SIDEBAR            |  MAIN CONTENT VIEWPORT                             |
|  - Home             |  - Home View: Hero Track, Quick Picks, Rails       |
|  - Search           |  - Search View: Tabs (All/Songs/Artists), Results  |
|  - Library          |  - Library View: Liked Songs, Custom Playlists     |
|    * Liked Songs    |  - Artist View: Banner, Top Tracks, Albums         |
|    * Playlists (+)  |  - Album View: Artwork, Tracklist, Play All        |
|    * History        |  - Settings View: Audio Quality, Cache, About      |
|  - Audio Flavor:    |                                                    |
|    [Normal|SnR|NC]  |                                                    |
+---------------------+----------------------------------------------------+
|  BOTTOM PLAYER BAR (Persistent Liquid Glass)                              |
|  [Art] Title - Artist  [Prev] [Play/Pause] [Next]  01:24 =====o==== 03:45 |
|  [Heart]  [Flavor: SnR]  [Lyrics Flip]  [Queue]  [Vol: ===o] [Full Screen] |
+--------------------------------------------------------------------------+
|  EXPANDABLE NOW PLAYING MODAL (Full Screen with Liquid-Glass Atmosphere)  |
|  - Blurred Current Track Artwork Background + Glow Breathing Animation   |
|  - 3D Flip Card: Front = Crisp Hi-Res Cover, Back = Auto-Scrolling Synced Lyrics |
|  - Oversized Neon Controls, Scrubber, Queue Drawer                        |
+--------------------------------------------------------------------------+
```

## Audio Stream Resolution Architecture
```
User clicks track (e.g. videoId: "a4O-abCXsfA")
   |
   +---> Renderer invokes `window.api.getStreamUrl(videoId)`
            |
            +---> Electron Main Process
                     |
                     +---> Check in-memory stream URL cache (with expiry)
                     |
                     +---> Execute local `yt-dlp.exe` with residential IP:
                     |     `yt-dlp.exe -f "ba/ba*" -g "https://www.youtube.com/watch?v={videoId}"`
                     |     (Yields direct googlevideo audio stream in ~2-3s)
                     |
                     +---> [Fallback if yt-dlp unavailable]:
                     |     Query FreQ API / ytmusicapi
                     |
                     +---> Return direct HTTPS audio stream URL to Renderer
                              |
                              +---> `<audio src="https://rr...googlevideo.com/...">` plays!
```

## Security & Performance
- Context Isolation enabled, Node Integration disabled in Renderer for secure Electron architecture.
- Strongly-typed Preload script exposing only safe IPC methods via `window.api`.
- Local disk caching of thumbnails, library state, and lyrics for instant offline responsiveness.
