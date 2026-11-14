# Quick Plan: Listen Together (Party System)

**Task ID:** 261114-pne-listen-together-party  
**Goal:** Build a worldwide real-time "Listen Together" party system in FreQ where users can create a party (up to 5 people), generate a temporary 4-digit code, allow anyone globally to join via the code, and keep songs, playback state, and timeline in sync with the host.

---

## Architecture & Design

1. **Global Real-Time Transport:**
   - Transport: Encrypted MQTT over Secure WebSockets (`wss://`).
   - Redundant public brokers:
     - Primary: `wss://broker.emqx.io:8084/mqtt`
     - Secondary: `wss://broker.hivemq.com:8884/mqtt`
   - Works globally without port forwarding, STUN/TURN, or local network restrictions.
   - Room topic schema: `freq/party/v1/<4-digit-code>` (e.g. `freq/party/v1/7492`).

2. **Party Rules & Capacity:**
   - 4-digit random numeric code (e.g. `4829`, `1000`–`9999`).
   - Maximum 5 people (1 Host + up to 4 Guests).
   - Host controls playback (play, pause, seek, track selection).
   - If a party is full, join requests are rejected with a clear message.
   - If the Host leaves or disconnects, the party is ended.
   - If a Guest leaves, the slot is freed up for others.

3. **Timeline & Playback Synchronization:**
   - **Track Selection:** When Host selects a track, broadcast `TRACK_CHANGE` with full `MediaTrack` metadata. Guests immediately resolve the stream and begin playback.
   - **Play / Pause:** Broadcast `PLAY_STATE` on play or pause. Guests mirror state immediately.
   - **Seek & Timeline Drift Correction:**
     - Periodic broadcast `TIMELINE_SYNC` (every 2 seconds during playback).
     - Network latency compensation: `targetPosition = hostPosition + (now - hostTimestamp) / 1000`.
     - Soft drift threshold: If guest's `currentTime` drifts by > 1.2s from target, smoothly seek into sync.

4. **UI/UX Components:**
   - `Sidebar.tsx`: Add "Listen Together" button with live status badge when in a party.
   - `PlayerBar.tsx`: Add Party button showing active status/count (`3/5`).
   - `PartyModal.tsx`:
     - Clean liquid-glass modal.
     - **Create Mode:** Generates 4-digit code, sets display name, starts hosting.
     - **Join Mode:** 4-digit code entry with auto-focus, display name input, and connect button.
     - **Active Party Lobby:**
       - Big 4-digit code display with 1-click Copy Code.
       - Connected members list (up to 5) with Host badge, Guest badges, and Host kick controls.
       - Live synced playback card with track artwork, title, and timeline sync indicator.
       - Leave / End Party button.

---

## Tasks

- [ ] Task 1: Create `src/services/partyService.ts` for MQTT-based party management, room signaling, and playback synchronization.
- [ ] Task 2: Create `src/components/PartyModal.tsx` for creating, joining, and managing the 5-person party.
- [ ] Task 3: Integrate Party System into `src/App.tsx`, `src/components/Sidebar.tsx`, and `src/components/PlayerBar.tsx` for bi-directional playback and timeline sync.
- [ ] Task 4: Verify with TypeScript check (`npx tsc --noEmit`), build UI & Electron main/preload (`npm run build`), package Windows portable executable, and move to `S:\PROJECTS\WAVE\freq release`.
