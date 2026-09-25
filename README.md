# FreQ 🎵

A dark, glassy Android music player streaming YouTube Music — artwork atmospheres, slowed + reverb flavors, vibe-aware autoplay, lyrics flip, and on-device search.

![Home](screenshot.png) ![Player](screenshot2.png)

## Features

- **Now Playing** — artwork atmosphere, thumbless seek, transport bar, tap-to-flip lyrics card (LRCLIB, on-device)
- **Audio flavors** — Normal (1.0x) · SnR (0.8x pitched down + reverb) · Nightcore (1.2x pitched up)
- **Vibe autoplay** — same artist / language-script / trending-aware Up Next with seed-artist rescue
- **Search** — on-device InnerTube songs + artists, genre tiles, trending rail, voice input
- **Library** — likes, playlists, follows, recents (all local, DataStore)
- **Output chip** — live speaker / headphones / Bluetooth indicator

## Project layout

| Path | What |
|---|---|
| `app/` | Android app (Kotlin, Compose Material3, Media3/ExoPlayer, Haze + Prismal glass) |
| `app/src/main/res/font/` | Bundled Inter typeface (closest open match to SF) |
| `backend/` | Node/Express YTMusic API (reference deployment, not required by the app) |
| `backend-python/` | FastAPI/ytmusicapi backend alternative |

The app works standalone: catalog/search reads YouTube Music InnerTube straight from the device first, with the `freq-api` backend as fallback.

## Build

Requirements: Android Studio (or JDK 17 + Android SDK 37), internet for first Gradle sync.

```powershell
# Debug APK (signed with your debug key, installs immediately)
./gradlew :app:assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk

# Release APK (universal, all ABIs)
./gradlew :app:assembleRelease
# → app/build/outputs/apk/release/app-release.apk
```

Release signing defaults to your local debug keystore. For a production key, add to `local.properties` (gitignored, never commit it):

```properties
wave.storeFile=C:\\keys\\freq-release.keystore
wave.storePassword=...
wave.keyAlias=freq
wave.keyPassword=...
```

Run unit tests with `./gradlew :app:testDebugUnitTest`.

## Privacy / security notes for contributors

- No accounts, no analytics, no API keys in the repo — library and prefs stay in on-device DataStore.
- Never commit `local.properties`, keystores (`*.jks`, `*.keystore`), `backend/node_modules/`, or `backend-python/.venv/` — `.gitignore` already excludes them.
- Background photos are Wikimedia Commons images (see in-code credits where applicable).

## Disclaimer

Personal, non-commercial project for learning. YouTube Music data comes from public InnerTube endpoints and the community `ytmusic-api` / NewPipe extractors; respect their terms and your local law.
