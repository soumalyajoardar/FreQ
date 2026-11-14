---
status: complete
quick_id: 261114-pne
slug: listen-together-party
date: 2026-11-14
---

# Quick Task Summary: Listen Together (Party System) & Discord Presence

## Deliverables & Architecture

1. **Global Real-Time Networking Service (`src/services/partyService.ts`):**
   - Utilizes secure, encrypted WebSocket MQTT (`wss://`) across redundant global public brokers (`broker.emqx.io:8084` and `broker.hivemq.com:8884`).
   - Allows users to join from anywhere in the world without requiring port forwarding, router configuration, or external infrastructure.
   - Generates unique temporary 4-digit numeric party codes (e.g. `4829`, `1000`–`9999`).
   - Enforces a strict 5-person capacity per party (1 Host + up to 4 Guests).
   - Handles automatic presence, join requests, approval, member list updates, and room teardown.
   - Bi-directional timeline & song synchronization:
     - Real-time `TRACK_CHANGE` propagation.
     - Real-time `PLAY_STATE` (play/pause) synchronization.
     - Real-time `SEEK` and 2.5-second heartbeat `TIMELINE_SYNC` with drift compensation (corrects drift > 1.2s).
     - Live floating reactions bar (`🔥`, `❤️`, `🎵`, `👏`, `⚡`).

2. **Discord Rich Presence Party Integration (`electron/discordRpc.ts` & `src/App.tsx`):**
   - Automatically detects when a user is in an active Listen Together party.
   - Profile Display:
     - **Line 1 (details):** Which song they are listening to (e.g., song title).
     - **Line 2 (state):** `In a song party with <X>/5 people` (e.g., `In a song party with 3/5 people`, or `(Paused)` if stopped).
     - **Discord Native Party:** Registers `partyId`, `partySize` ($X$), and `partyMax` ($5$).
     - **Small Icon Badge:** Shows `Party (<X>/5) • <Flavor>` or `Party (<X>/5) • Paused`.
     - **Idle / Between Songs:** Displays `In a song party with <X>/5 people` and `Waiting for song to start`.
   - Real-time updates: When a friend joins or leaves, presence updates immediately to reflect the new count.

3. **Listen Together Modal & Party Lobby (`src/components/PartyModal.tsx`):**
   - **Create Party (Host):** Generates 4-digit code, initializes the room, and displays host status.
   - **Join Party (Guest):** 4-digit numeric code entry with auto-focus and instant validation.
   - **Party Lobby & Control:**
     - Large 4-digit room code with one-click "Copy Code" button.
     - Real-time member list showing connection status, roles (`HOST`, `YOU`), and host kick controls.
     - Capacity indicator (`X/5 slots`).
     - Synchronized Now Playing card with live progress and broadcasting status.
     - Quick reaction buttons with live floating badges.
     - Clean "Leave Party" and "End Party (Close Room)" actions.

4. **Application Integration (`src/App.tsx`, `Sidebar.tsx`, `PlayerBar.tsx`):**
   - **Sidebar:** Added a dedicated "Listen Together" button with live status badge (`3/5`) when in an active party.
   - **PlayerBar:** Added an integrated party indicator button with live member count.
   - **Playback Synchronization:**
     - Host playback changes (play, pause, seek, track selection) automatically broadcast to all party members.
     - Guests automatically resolve and play the synchronized tracks, pause/resume in sync, and correct timeline drift.

5. **Build & Release Packaging:**
   - Verified TypeScript compilation: 0 errors (`npx tsc --noEmit`).
   - Built UI and Electron main/preload with Vite and esbuild.
   - Built portable Windows executable with electron-builder.
   - Deliverable moved and verified: `S:\PROJECTS\WAVE\freq release\FreQ-Portable-1.8.0.exe` (102,035,440 bytes).
