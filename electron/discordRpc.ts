import { Client } from '@xhayper/discord-rpc';

const DEFAULT_CLIENT_ID = '1555196374067322940';

export interface DiscordActivityPayload {
  track: {
    id: string;
    title: string;
    artist: string;
    album?: string;
    artworkUrl?: string | null;
    durationSeconds: number;
  } | null;
  isPlaying: boolean;
  position: number;
  audioMode: 'NORMAL' | 'SNR' | 'NIGHTCORE';
  party?: {
    code: string;
    size: number;
    max?: number;
    isHost?: boolean;
    // Public parties expose a Discord join secret so friends can join from
    // the presence itself. Private parties deliberately omit it.
    privacy?: 'public' | 'private';
  };
}

class DiscordRpcManager {
  private client: Client | null = null;
  private isConnected = false;
  private isConnecting = false;
  private isEnabled = true;
  private clientId: string = DEFAULT_CLIENT_ID;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private lastActivity: DiscordActivityPayload | null = null;
  private lastUpdateTimestamp = 0;
  private lastActive = Date.now();
  private lastPlaying = false;
  private lastTrackId: string | null = null;
  // Requested state, updated synchronously when a payload is accepted. Change
  // detection must use this, not lastPlaying/lastTrackId (which only move
  // after the async Discord write resolves) — otherwise a fast pause → play
  // looks like "no change" and gets skipped, leaving a stale presence.
  private desiredPlaying = false;
  private desiredTrackId: string | null = null;
  private lastDuration = 0;
  private lastPosition = 0;
  private lastActivityTimestamp = 0;
  private lastInParty = false;
  private lastPartySize = 0;
  private lastPartyPrivacy: 'public' | 'private' | null = null;
  // Latest joinable party (public only). Used to auto-approve "Ask to Join".
  private joinableParty: { code: string; privacy: 'public' | 'private' } | null = null;
  private joinListener: ((code: string) => void) | null = null;
  private joinEventsBound = false;
  private showingAfk = false;
  private afkTimer: NodeJS.Timeout | null = null;
  private pendingUpdate: DiscordActivityPayload | null = null;
  private pendingTimer: NodeJS.Timeout | null = null;
  // Every setActivity write is serialized. Discord's IPC is async and can
  // resolve out of order; without a queue an older "Paused" write can land
  // after the next track's "Playing" write — the wrong-state glitch at
  // track boundaries. A monotonic seq also lets superseded writes no-op.
  private writeChain: Promise<void> = Promise.resolve();
  private activitySeq = 0;

  private enqueueWrite(fn: () => Promise<void>): Promise<void> {
    const next = this.writeChain.catch(() => {}).then(fn);
    this.writeChain = next.catch(() => {});
    return next;
  }

  constructor() {
    this.connect();
    this.startAfkLoop();
  }

  // Any user interaction resets the 5-minute AFK clock. If we were
  // showing AFK, drop back to the browsing presence immediately.
  public poke() {
    this.lastActive = Date.now();
    if (this.showingAfk) {
      this.showingAfk = false;
      this.showBrowsing();
    }
  }

  // Every 30s: untouched for 5+ minutes and nothing playing → AFK.
  private startAfkLoop() {
    if (this.afkTimer) return;
    this.afkTimer = setInterval(() => {
      // Never AFK out of a party: that presence carries the join secret the
      // Discord invite menu needs, and dropping it would silently break
      // invites for anyone still sitting in the lobby.
      if (!this.isEnabled || !this.isConnected || this.lastPlaying || this.showingAfk) return;
      if (this.lastInParty) return;
      if (Date.now() - this.lastActive < 5 * 60 * 1000) return;
      this.showingAfk = true;
      this.applyStaticPresence('AFK in FreQ', 'Idle — nothing playing');
    }, 30000);
  }

  private async applyStaticPresence(details: string, state: string) {
    if (!this.client || !this.client.user || !this.isConnected || !this.isEnabled) return;
    const seq = this.activitySeq;
    return this.enqueueWrite(async () => {
      // A newer track/pause write queued while we waited — skip this one.
      if (seq !== this.activitySeq) return;
      if (!this.client || !this.client.user || !this.isConnected || !this.isEnabled) return;
      try {
        await this.client.user.setActivity({
          type: 0, // PLAYING ("Playing FreQ")
          details: details.slice(0, 128),
          state: state.slice(0, 128),
          largeImageKey: 'freq_logo',
          largeImageText: 'FreQ Desktop',
        });
        this.lastUpdateTimestamp = Date.now();
      } catch (err: any) {
        console.warn('[Discord RPC] static presence warning:', err.message || err);
      }
    });
  }

  // Idle with no song: logo + browsing text (not a cleared presence).
  public showBrowsing() {
    if (!this.isEnabled) return;
    this.lastPlaying = false;
    this.showingAfk = false;
    this.joinableParty = null;
    this.lastPartyPrivacy = null;
    // Invalidate any queued/in-flight track write so a late "Playing" can
    // never repaint over the browsing presence.
    this.activitySeq += 1;
    if (!this.isConnected) {
      this.connect();
      return;
    }
    const now = Date.now();
    if (now - this.lastUpdateTimestamp < 1200) return;
    this.applyStaticPresence('Browsing libraries', 'FreQ Desktop');
  }

  public setClientId(newId: string) {
    if (newId && newId !== this.clientId) {
      this.clientId = newId;
      this.reconnect();
    }
  }

  // Renderer callback: a friend joined our presence from Discord. We hand it
  // the party code so it can run the normal join path.
  public onJoin(listener: (code: string) => void) {
    this.joinListener = listener;
  }

  private bindJoinEvents(client: Client) {
    if (this.joinEventsBound) return;
    this.joinEventsBound = true;

    // "Join" clicked on our presence (only public parties publish a secret).
    client.on('ACTIVITY_JOIN', (data: any) => {
      const secret = typeof data?.secret === 'string' ? data.secret : '';
      const code = secret.replace(/\D/g, '');
      if (code.length === 4) this.joinListener?.(code);
    });

    // "Ask to Join" clicked. Auto-approve while the party is public so
    // Discord routes the secret back as an ACTIVITY_JOIN. Private parties
    // stay code-only, so we leave the request unanswered.
    client.on('ACTIVITY_JOIN_REQUEST', async (data: any) => {
      if (!this.joinableParty || this.joinableParty.privacy !== 'public') return;
      const userId = data?.id || data?.user?.id;
      if (!userId || !client.user) return;
      try {
        await client.user.sendJoinInvite(userId);
      } catch (err: any) {
        console.warn('[Discord RPC] join invite warning:', err.message || err);
      }
    });
  }

  private subscribeJoinEvents(client: Client) {
    client.subscribe('ACTIVITY_JOIN').catch(err => {
      console.warn('[Discord RPC] subscribe ACTIVITY_JOIN warning:', err?.message || err);
    });
    client.subscribe('ACTIVITY_JOIN_REQUEST').catch(err => {
      console.warn('[Discord RPC] subscribe ACTIVITY_JOIN_REQUEST warning:', err?.message || err);
    });
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.clearActivity();
    } else if (this.lastActivity) {
      this.updateActivity(this.lastActivity);
    }
  }

  public getStatus() {
    return {
      isConnected: this.isConnected,
      isEnabled: this.isEnabled,
      clientId: this.clientId,
      // Whether a join secret is currently published, and for which room.
      // Surfaced in the Party view so hosts can confirm Discord sees the invite.
      joinableParty: this.joinableParty
        ? { code: this.joinableParty.code, privacy: this.joinableParty.privacy }
        : null,
    };
  }

  private connect() {
    if (this.isConnected || this.isConnecting || !this.isEnabled) return;
    this.isConnecting = true;

    try {
      this.client = new Client({ clientId: this.clientId });
      this.joinEventsBound = false;
      this.bindJoinEvents(this.client);

      this.client.on('ready', () => {
        this.isConnected = true;
        this.isConnecting = false;
        console.log(`[Discord RPC] Connected to Discord as ${this.client?.user?.username || 'user'}`);
        if (this.client) this.subscribeJoinEvents(this.client);

        if (this.lastActivity && this.isEnabled) {
          if (this.lastActivity.track && this.lastActivity.track.title) {
            this.applyActivity(this.lastActivity);
          } else if (this.lastActivity.party) {
            // Coming back from a Discord restart while sitting in a party: keep
            // advertising the room (and its join secret) even with no track.
            this.applyPartyIdle(this.lastActivity.party);
          } else {
            this.showBrowsing();
          }
        } else if (this.isEnabled) {
          this.showBrowsing();
        }
      });

      this.client.on('disconnected', () => {
        console.log('[Discord RPC] Disconnected from Discord.');
        this.isConnected = false;
        this.isConnecting = false;
        this.scheduleReconnect();
      });

      this.client.login().catch(err => {
        // Discord is likely closed; silently schedule reconnect
        this.isConnected = false;
        this.isConnecting = false;
        this.scheduleReconnect();
      });
    } catch (e) {
      this.isConnected = false;
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isConnected && this.isEnabled) {
        this.connect();
      }
    }, 15000);
  }

  private reconnect() {
    this.destroy();
    this.connect();
  }

  public updateActivity(payload: DiscordActivityPayload) {
    this.lastActivity = payload;
    this.lastActive = Date.now();
    this.showingAfk = false;
    if (!this.isEnabled) return;

    const inParty = !!payload?.party;
    const currentPartySize = payload?.party?.size || 0;
    const currentPrivacy = payload?.party
      ? (payload.party.privacy === 'public' ? 'public' : 'private')
      : null;
    const partyChanged =
      inParty !== this.lastInParty ||
      currentPartySize !== this.lastPartySize ||
      currentPrivacy !== this.lastPartyPrivacy;

    if (!payload || !payload.track || !payload.track.title) {
      this.lastPlaying = false;
      this.lastTrackId = null;
      this.desiredPlaying = false;
      this.desiredTrackId = null;
      if (inParty && payload.party) {
        this.applyPartyIdle(payload.party);
      } else {
        this.lastInParty = false;
        this.lastPartySize = 0;
        this.lastPartyPrivacy = null;
        this.joinableParty = null;
        this.showBrowsing();
      }
      return;
    }

    if (!this.isConnected) {
      this.connect();
      return;
    }

    const prevPlaying = this.desiredPlaying;
    const prevTrackId = this.desiredTrackId;
    const isPlaying = !!payload.isPlaying;
    const currentTrackId = payload.track?.id || null;
    const currentDuration = Math.round(payload.track?.durationSeconds || 0);

    const playStateChanged = isPlaying !== prevPlaying;
    const trackChanged = currentTrackId !== prevTrackId;
    const durationChanged = currentDuration > 0 && Math.abs(currentDuration - this.lastDuration) >= 1;

    // Check if position was sought manually (jumped by > 2.5s from expected wall-clock progression)
    const expectedPos = this.lastPlaying && this.lastActivityTimestamp > 0
      ? this.lastPosition + (Date.now() - this.lastActivityTimestamp) / 1000
      : this.lastPosition;
    const seekOccurred = Math.abs((payload.position || 0) - expectedPos) > 2.5;

    const isSignificantChange = playStateChanged || trackChanged || partyChanged || durationChanged || seekOccurred;

    // Skip redundant updates during normal continuous playback — Discord's native client ticks the progress bar smoothly
    if (!isSignificantChange && isPlaying && prevPlaying && !trackChanged) {
      return;
    }

    // This payload is now the authoritative requested state.
    this.desiredPlaying = isPlaying;
    this.desiredTrackId = currentTrackId;

    const now = Date.now();
    const elapsed = now - this.lastUpdateTimestamp;

    // When a song finishes and transitions to another, or play/pause flips, or party state updates,
    // we want Discord updated promptly without stale states.
    // Enforce 300ms minimum for state/song/party transitions, and 1200ms for continuous updates.
    // Timestamp the payload arrival to prevent timeline drift during throttle delays
    (payload as any).receivedAt = Date.now();

    const minInterval = isSignificantChange ? 300 : 1200;

    if (elapsed < minInterval) {
      this.pendingUpdate = payload;
      if (!this.pendingTimer) {
        const delay = Math.max(50, minInterval - elapsed);
        this.pendingTimer = setTimeout(() => {
          this.pendingTimer = null;
          const pending = this.pendingUpdate;
          this.pendingUpdate = null;
          if (pending) {
            this.applyActivity(pending);
          }
        }, delay);
      }
      return;
    }

    // Clear any pending update — this one supersedes it.
    this.pendingUpdate = null;
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }

    this.applyActivity(payload);
  }

  public async applyPartyIdle(party: { code: string; size: number; max?: number; privacy?: 'public' | 'private' }) {
    if (!this.client || !this.client.user || !this.isConnected || !this.isEnabled) return;
    const privacy = party.privacy === 'public' ? 'public' : 'private';
    const previousPrivacy = this.joinableParty?.code === party.code ? this.joinableParty.privacy : null;
    // Track this synchronously: "Ask to Join" can arrive before the write.
    this.joinableParty = { code: party.code, privacy };
    if (previousPrivacy !== privacy) {
      console.log(
        `[Discord RPC] Party #${party.code} is now ${privacy}` +
          (privacy === 'public' ? ' (joinable from Discord)' : ' (code only)')
      );
    }
    // Supersede any older queued write, exactly like applyActivity does —
    // otherwise a stale presence can land after this one.
    const seq = ++this.activitySeq;
    return this.enqueueWrite(async () => {
      if (seq !== this.activitySeq) return;
      if (!this.client || !this.client.user || !this.isConnected || !this.isEnabled) return;
      try {
        const partySize = party.size || 1;
        const partyMax = party.max || 5;
        await this.client.user.setActivity({
          // Discord renders the Join / "Ask to Join" affordance for Playing
          // sessions. A Listening (2) activity shows the same text but never
          // exposes the invite action, so a public party is published as a
          // joinable Playing session instead.
          type: privacy === 'public' ? 0 : 2,
          details: `${partySize}/${partyMax} (${privacy === 'public' ? 'Public' : 'Private'})`,
          state: privacy === 'public' ? 'Waiting for song to start · joinable' : 'Waiting for song to start',
          largeImageKey: 'freq_logo',
          largeImageText: `FreQ Party #${party.code}`,
          smallImageKey: 'freq_logo',
          smallImageText: `Party (${partySize}/5)`,
          partyId: `freq_party_${party.code}`,
          partySize,
          partyMax,
          joinSecret: privacy === 'public' ? party.code : undefined,
          // Discord only treats a presence as a joinable game session when
          // the activity is flagged as an instance. Without this the channel
          // shows "supports game invites" but the + invite menu stays empty.
          instance: true,
        });
        this.lastUpdateTimestamp = Date.now();
        this.lastInParty = true;
        this.lastPartySize = partySize;
        this.lastPartyPrivacy = privacy;
      } catch (err: any) {
        console.warn('[Discord RPC] party idle warning:', err.message || err);
      }
    });
  }

  private async applyActivity(payload: DiscordActivityPayload) {
    if (!this.client || !this.client.user || !this.isConnected || !this.isEnabled) return;

    const { track, isPlaying, position, audioMode, party } = payload;
    if (!track || !track.title) {
      this.clearActivity();
      return;
    }

    const seq = ++this.activitySeq;

    const inParty = !!party;
    const partySize = party?.size || 1;
    const partyMax = party?.max || 5;
    const partyPrivacy = party?.privacy === 'public' ? 'public' : 'private';
    // Public parties expose the room code as Discord's join secret, which
    // turns the presence into a clickable "Join" button.
    this.joinableParty = inParty ? { code: party!.code, privacy: partyPrivacy } : null;
    if (inParty && partyPrivacy !== this.lastPartyPrivacy) {
      console.log(
        `[Discord RPC] Party #${party!.code} is now ${partyPrivacy}` +
          (partyPrivacy === 'public' ? ' (joinable from Discord)' : ' (code only)')
      );
    }

    // Audio flavor labels
    let flavorLabel = 'FreQ • Normal';
    if (audioMode === 'SNR') flavorLabel = 'FreQ • SnR (Slowed + Reverb)';
    else if (audioMode === 'NIGHTCORE') flavorLabel = 'FreQ • Nightcore (1.2x Pitch)';

    // Layout:
    // When in a party:
    // Line 1 (heading): "X/5 (Public|Private)"
    // Line 2: Song title
    // Line 3: Artist name
    // When not in a party:
    // Line 1 (heading): Song title
    // Line 2: Artist name
    // Line 3: Album / Audio mode
    // Bottom: Live timeline progress bar
    const songTitle = (track.title || 'Unknown Track').trim();
    const artistName = (track.artist || 'Unknown Artist').trim();

    const details = inParty
      ? `${partySize}/${partyMax} (${partyPrivacy === 'public' ? 'Public' : 'Private'})`.slice(0, 128)
      : songTitle.slice(0, 128);

    const state = inParty
      ? (isPlaying ? songTitle : `${songTitle} (Paused)`).slice(0, 128)
      : (isPlaying ? artistName : `${artistName} (Paused)`).slice(0, 128);

    const largeImageText = inParty
      ? artistName.slice(0, 128)
      : (track.album || artistName || 'FreQ Music').slice(0, 128);

    const partyConfig = inParty
      ? {
          partyId: `freq_party_${party!.code}`,
          partySize,
          partyMax,
          joinSecret: partyPrivacy === 'public' ? party!.code : undefined,
          // Marks the activity as an instanced (joinable) game session, which
          // is what Discord's invite UI keys off of.
          instance: true,
        }
      : {};

    let smallText = inParty ? `Party (${partySize}/5) • ${flavorLabel}` : flavorLabel;
    if (!isPlaying) smallText = inParty ? `Party (${partySize}/5) • Paused` : 'Paused';

    return this.enqueueWrite(async () => {
      // A newer state was queued while this one waited — don't write stale data.
      if (seq !== this.activitySeq) return;
      if (!this.client || !this.client.user || !this.isConnected || !this.isEnabled) return;

      try {
        if (isPlaying) {
          const now = Date.now();
          const duration = Math.max(1, Math.round(track.durationSeconds || 194));
          const pos = Math.max(0, position || 0);
          const ageSec = (payload as any).receivedAt ? Math.max(0, (now - (payload as any).receivedAt) / 1000) : 0;
          const effectivePos = pos + ageSec;
          // Ensure startTimestamp and endTimestamp differ by EXACTLY duration * 1000 without throttle drift
          const startTimestamp = Math.max(0, Math.floor(now - effectivePos * 1000));
          const endTimestamp = Math.floor(startTimestamp + duration * 1000);

          await this.client.user.setActivity({
            // Public parties are published as Playing sessions so Discord
            // exposes the Join button; solo listening stays a Listening card.
            type: inParty && partyPrivacy === 'public' ? 0 : 2,
            details, // Line 1: Heading ("X/5 (Public|Private)" or song title)
            state, // Line 2: Song title (or artist if solo)
            startTimestamp, // Timeline start
            endTimestamp, // Timeline end (renders live countdown timeline at the bottom)
            largeImageKey: track.artworkUrl || undefined,
            largeImageText, // Line 3: Artist name (or album if solo)
            smallImageKey: 'freq_logo', // FreQ app icon
            smallImageText: smallText.slice(0, 128),
            ...partyConfig,
          });
        } else {
          await this.client.user.setActivity({
            type: inParty && partyPrivacy === 'public' ? 0 : 2,
            details,
            state,
            largeImageKey: track.artworkUrl || undefined,
            largeImageText,
            smallImageKey: 'freq_logo',
            smallImageText: smallText.slice(0, 128),
            ...partyConfig,
          });
        }

        // Only the newest write owns the tracked state. An older in-flight
        // write must never flip lastPlaying/lastPosition and poison the next
        // comparison (which is what caused the "Paused while playing" flash).
        if (seq !== this.activitySeq) return;

        this.lastPlaying = isPlaying;
        this.lastTrackId = track.id || null;
        this.lastDuration = Math.max(1, Math.round(track.durationSeconds || 194));
        this.lastPosition = Math.max(0, position || 0);
        this.lastActivityTimestamp = Date.now();
        this.lastInParty = inParty;
        this.lastPartySize = partySize;
        this.lastPartyPrivacy = inParty ? partyPrivacy : null;
        this.lastUpdateTimestamp = Date.now();
      } catch (err: any) {
        console.warn('[Discord RPC] setActivity warning:', err.message || err);
      }
    });
  }

  public async clearActivity() {
    this.lastActivity = null;
    this.lastPlaying = false;
    this.showingAfk = false;
    this.joinableParty = null;
    this.lastPartyPrivacy = null;
    // Invalidate any queued/in-flight track write so it cannot repaint after
    // the presence has been cleared.
    this.activitySeq += 1;
    return this.enqueueWrite(async () => {
      if (this.client && this.client.user && this.isConnected) {
        try {
          await this.client.user.clearActivity();
        } catch (e) {
          // Ignore
        }
      }
    });
  }

  public destroy() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.afkTimer) {
      clearInterval(this.afkTimer);
      this.afkTimer = null;
    }
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    this.pendingUpdate = null;
    if (this.client) {
      try {
        this.client.destroy();
      } catch {}
      this.client = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.joinEventsBound = false;
    this.joinableParty = null;
    this.lastPartyPrivacy = null;
  }
}

export const discordRpcManager = new DiscordRpcManager();
