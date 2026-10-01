# FreQ Desktop for Windows 🎵

> Unlock the full potential of music: stream effortlessly on Windows with a stunning liquid-glass desktop experience!

FreQ Desktop brings the signature **FreQ Android (`S:\PROJECTS\WAVE\Android`)** experience to Windows with native desktop power: **zero ads, zero subscriptions, zero accounts, and zero tracking**. Your personal library never leaves your PC.

---

## ✨ Features

- **Liquid-Glass Aesthetic**: Atmospheric obsidian dark theme (`#090A0F`), dynamic glowing accents (Electric Cyan, Violet, Teal, Pink), frameless Windows acrylic styling, and **time-of-day backgrounds** (Morning, Afternoon, Evening, Night).
- **3 Signature Audio Flavors (Web Audio DSP)**:
  - **Normal**: 1.0x studio dry fidelity.
  - **SnR (Slowed + Reverb)**: 0.8x tempo + pitched down with authentic procedural `ConvolverNode` stereo impulse reverb.
  - **Nightcore**: 1.2x upbeat tempo + high pitch without time-stretching.
- **3D Tap-To-Flip Synced Lyrics**:
  - Click on the album artwork to smoothly flip the card in 3D into a **real-time Synchronized Lyrics** view powered by LRCLIB.
  - Automatic line-by-line smooth scrolling and click-to-seek timestamp jumping.
- **Vibe-Aware Autoplay Engine**:
  - Automatically curates continuous "Up Next" queue recommendations matching artist affinity, language script, listening history, and user playlist genres.
- **Local-First Private Library**:
  - Liked Songs favorites, custom user playlists (create, rename, delete, add/remove songs), search history, and listening recents saved safely on-device in `freq_library.json`.
- **High-Speed On-Device Audio Extraction**:
  - Resolves direct GoogleVideo audio streams using local residential IP extraction (via native `yt-dlp` bridge) to bypass cloud datacenter IP blocks.
- **Native Windows Integration**:
  - Frameless window with custom minimize, maximize, and close controls.
  - Windows MediaSession API integration (controls playback from the Windows taskbar preview, lockscreen, and hardware media keys).

---

## 🚀 Quick Start

### Launch directly:
Double-click `start-freq.bat` or run in PowerShell:
```powershell
.\start-freq.ps1
```

Or via npm:
```powershell
npm run freq
```

### Development:
```powershell
# Run Vite web frontend dev server:
npm run dev

# Build both frontend and Electron main process:
npm run build
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Runtime** | Electron 35+ |
| **Frontend Framework** | React 19 + TypeScript |
| **Bundler & Tooling** | Vite 6 + Esbuild |
| **DSP Audio Engine** | Web Audio API (`AudioContext`, `ConvolverNode`, `GainNode`) |
| **Catalog Provider** | YouTube Music REST API client |
| **Lyrics Provider** | LRCLIB On-Device API |
| **Stream Extraction** | Local `yt-dlp` Windows Bridge |
| **Styling** | Vanilla CSS Liquid-Glass Design System with Backdrop Blur & 3D Transforms |

---

## 📄 License

FreQ is free software licensed under **GPL v3.0**.
