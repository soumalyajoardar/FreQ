# STACK.md — Technology Stack

## Runtime & Platforms
- **Platform**: Windows 10 / Windows 11 (x64)
- **Application Framework**: Electron 32+
- **Frontend Core**: React 18 / 19, TypeScript 5, Vite 6
- **Styling**: Vanilla CSS with custom Liquid-Glass design system tokens, CSS Backdrop-Filter blur, CSS 3D Transforms for lyrics card flip
- **Audio Processing**: HTML5 Audio + Web Audio API (AudioContext, MediaElementAudioSourceNode, ConvolverNode for impulse response reverb, GainNode)
- **Streaming & Ingestion**: Local `yt-dlp` executable bridge (`S:\PROJECTS\WAVE\backend-python\.venv\Scripts\yt-dlp.exe` / local fallback) + FreQ API fallback
- **Lyrics Source**: LRCLIB REST API (`https://lrclib.net/api/get`)
- **Persistence**: Electron `app.getPath('userData')` JSON file storage for local library, likes, playlists, recents, and settings
- **Windows Integration**: Frameless BrowserWindow with custom Windows Titlebar, Windows MediaSession API (native taskbar media transport & hotkeys)
