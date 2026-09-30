# ROADMAP.md — Project Roadmap

> **Current Milestone**: `v1.0.0 Desktop MVP`
> **Status**: `IN_PROGRESS`

## Phases

### Phase 1: Project Scaffolding & Desktop Shell (Target: v1.0.0-p1)
- [ ] Initialize Electron + Vite + React + TypeScript project foundation.
- [ ] Implement frameless Windows window with customized Windows titlebar (drag region, FreQ branding, minimize, maximize/restore, close buttons).
- [ ] Set up secure Preload IPC bridge (`electron-preload`) and window state persistence.
- [ ] Establish Liquid-Glass CSS design system (tokens, colors `#090A0F`, `#00E5FF`, `#8B5CF6`, `#00F5D4`, glass surfaces, blur filters, typography).

### Phase 2: Native Audio Engine & Extraction Bridge (Target: v1.0.0-p2)
- [ ] Implement local yt-dlp audio extraction IPC handler in Electron main process with caching.
- [ ] Build Web Audio API pipeline with HTML5 `<audio>` connection:
  - Normal playback mode (1.0x).
  - SnR (Slowed + Reverb) mode (0.8x playback rate + procedural impulse ConvolverNode reverb).
  - Nightcore mode (1.2x playback rate + pitch preservation toggled off).
- [ ] Integrate Windows MediaSession API (native Windows 10/11 lockscreen & taskbar media controls, hardware media keys).

### Phase 3: Music Catalog & Discovery (Target: v1.0.0-p3)
- [ ] Implement YouTube Music catalog client (Search, Home sections, Artists, Albums).
- [ ] Build Home View: Hero featured track, rotating greeting & editorial headline, Quick Picks, Trending and Genre rails.
- [ ] Build Search View: Debounced query input, search history pills, category filters (All, Songs, Artists, Albums), instant results.
- [ ] Build Artist & Album Detail Views: Hero banner, top songs, discography.

### Phase 4: Now Playing Experience & Synced Lyrics (Target: v1.0.0-p4)
- [ ] Build persistent Bottom Mini-Player Bar (progress bar, seekbar, volume slider, play/pause, prev/next, flavor pill switcher, queue button, lyrics button).
- [ ] Build Full-Screen Expandable Now Playing modal with reactive dynamic artwork atmosphere & breathing ambient pulse.
- [ ] Implement 3D Tap-To-Flip lyrics card:
  - LRCLIB client fetching synced & plain lyrics on-device.
  - LRC parser with millisecond timestamps and auto-scrolling active lyric line.
- [ ] Implement Vibe-Aware Autoplay & Queue Management (ported from `AutoplayEngine.kt`).

### Phase 5: Local-First Library & User Playlists (Target: v1.0.0-p5)
- [ ] Implement local JSON storage for Library state (Liked Songs, User Playlists, History, Recents).
- [ ] Build Library View: Liked Songs quick-access, User Playlists grid, Recently Played list.
- [ ] Implement Playlist CRUD: Create new playlist, rename, delete, add/remove tracks via track context menu.
- [ ] Build Settings View: Audio quality preferences, cache management (clear cache, disk usage stats), about FreQ.

### Phase 6: Polish, Packaging & Verification (Target: v1.0.0-p6)
- [ ] Keyboard shortcuts (Space = Play/Pause, Left/Right = Seek, M = Mute, F = Fullscreen Now Playing).
- [ ] End-to-end testing of playback, audio flavors, lyrics sync, and search.
- [ ] Package verification for Windows desktop.
