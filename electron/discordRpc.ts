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
  private lastInParty = false;
  private lastPartySize = 0;
  private showingAfk = false;
  private afkTimer: NodeJS.Timeout | null = null;
  private pendingUpdate: DiscordActivityPayload | null = null;
  private pendingTimer: NodeJS.Timeout | null = null;

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
      if (!this.isEnabled || !this.isConnected || this.lastPlaying || this.showingAfk) return;
      if (Date.now() - this.lastActive < 5 * 60 * 1000) return;
      this.showingAfk = true;
      this.applyStaticPresence('AFK in FreQ', 'Idle — nothing playing');
    }, 30000);
  }

  private async applyStaticPresence(details: string, state: string) {
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
  }

  // Idle with no song: logo + browsing text (not a cleared presence).
  public showBrowsing() {
    if (!this.isEnabled) return;
    this.lastPlaying = false;
    this.showingAfk = false;
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
    };
  }

  private connect() {
    if (this.isConnected || this.isConnecting || !this.isEnabled) return;
    this.isConnecting = true;

    try {
      this.client = new Client({ clientId: this.clientId });

      this.client.on('ready', () => {
        this.isConnected = true;
        this.isConnecting = false;
        console.log(`[Discord RPC] Connected to Discord as ${this.client?.user?.username || 'user'}`);

        if (this.lastActivity && this.isEnabled) {
          if (this.lastActivity.track && this.lastActivity.track.title) {
            this.applyActivity(this.lastActivity);
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
    const partyChanged = inParty !== this.lastInParty || currentPartySize !== this.lastPartySize;

    if (!payload || !payload.track || !payload.track.title) {
      this.lastPlaying = false;
      this.lastTrackId = null;
      if (inParty && payload.party) {
        this.applyPartyIdle(payload.party);
      } else {
        this.lastInParty = false;
        this.lastPartySize = 0;
        this.showBrowsing();
      }
      return;
    }

    if (!this.isConnected) {
      this.connect();
      return;
    }

    const prevPlaying = this.lastPlaying;
    const prevTrackId = this.lastTrackId;
    const isPlaying = !!payload.isPlaying;
    const currentTrackId = payload.track?.id || null;

    const playStateChanged = isPlaying !== prevPlaying;
    const trackChanged = currentTrackId !== prevTrackId;
    const isSignificantChange = playStateChanged || trackChanged || partyChanged;

    const now = Date.now();
    const elapsed = now - this.lastUpdateTimestamp;

    // When a song finishes and transitions to another, or play/pause flips, or party state updates,
    // we want Discord updated promptly without stale states.
    // Enforce 300ms minimum for state/song/party transitions, and 1200ms for continuous position updates.
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

  public async applyPartyIdle(party: { code: string; size: number; max?: number }) {
    if (!this.client || !this.client.user || !this.isConnected || !this.isEnabled) return;
    try {
      const partySize = party.size || 1;
      const partyMax = party.max || 5;
      await this.client.user.setActivity({
        type: 2, // 2 = LISTENING ("Listening to FreQ")
        details: `In a song party with ${partySize}/5 people`,
        state: 'Waiting for song to start',
        largeImageKey: 'freq_logo',
        largeImageText: `FreQ Party #${party.code}`,
        smallImageKey: 'freq_logo',
        smallImageText: `Party (${partySize}/5)`,
        partyId: `freq_party_${party.code}`,
        partySize,
        partyMax,
      });
      this.lastUpdateTimestamp = Date.now();
      this.lastInParty = true;
      this.lastPartySize = partySize;
    } catch (err: any) {
      console.warn('[Discord RPC] party idle warning:', err.message || err);
    }
  }

  private async applyActivity(payload: DiscordActivityPayload) {
    if (!this.client || !this.client.user || !this.isConnected || !this.isEnabled) return;

    const { track, isPlaying, position, audioMode, party } = payload;
    if (!track || !track.title) {
      this.clearActivity();
      return;
    }

    const inParty = !!party;
    const partySize = party?.size || 1;
    const partyMax = party?.max || 5;

    // Audio flavor labels
    let flavorLabel = 'FreQ • Studio';
    if (audioMode === 'SNR') flavorLabel = 'FreQ • SnR (Slowed + Reverb)';
    else if (audioMode === 'NIGHTCORE') flavorLabel = 'FreQ • Nightcore (1.2x Pitch)';

    // Layout:
    // Line 1: Song title (Which song they are listening to)
    // Line 2: If in a party: "In a song party with X/5 people"
    //         Else: Artists name
    // Bottom: Timeline progress bar
    const details = (track.title || 'Unknown Track').trim().slice(0, 128);
    const partyDesc = `In a song party with ${partySize}/5 people`;
    const baseState = inParty ? partyDesc : (track.artist || 'Unknown Artist').trim();
    const state = isPlaying ? baseState.slice(0, 128) : `${baseState} (Paused)`.slice(0, 128);

    const partyConfig = inParty
      ? {
          partyId: `freq_party_${party!.code}`,
          partySize,
          partyMax,
        }
      : {};

    let smallText = inParty ? `Party (${partySize}/5) • ${flavorLabel}` : flavorLabel;
    if (!isPlaying) smallText = inParty ? `Party (${partySize}/5) • Paused` : 'Paused';

    try {
      if (isPlaying) {
        const now = Date.now();
        const startTimestamp = Math.max(0, Math.floor(now - (position || 0) * 1000));
        const duration = track.durationSeconds || 194;
        const remainingSeconds = Math.max(1, duration - (position || 0));
        const endTimestamp = Math.floor(now + remainingSeconds * 1000);

        await this.client.user.setActivity({
          type: 2, // 2 = LISTENING ("Listening to FreQ")
          details, // Song name
          state, // "In a song party with X/5 people"
          startTimestamp, // Timeline start
          endTimestamp, // Timeline end (renders live countdown timeline at the bottom)
          largeImageKey: track.artworkUrl || undefined,
          largeImageText: track.title.slice(0, 128),
          smallImageKey: 'freq_logo', // FreQ app icon
          smallImageText: smallText.slice(0, 128),
          ...partyConfig,
        });
      } else {
        await this.client.user.setActivity({
          type: 2,
          details,
          state,
          largeImageKey: track.artworkUrl || undefined,
          largeImageText: track.title.slice(0, 128),
          smallImageKey: 'freq_logo',
          smallImageText: smallText.slice(0, 128),
          ...partyConfig,
        });
      }

      this.lastPlaying = isPlaying;
      this.lastTrackId = track.id || null;
      this.lastInParty = inParty;
      this.lastPartySize = partySize;
      this.lastUpdateTimestamp = Date.now();
    } catch (err: any) {
      console.warn('[Discord RPC] setActivity warning:', err.message || err);
    }
  }

  public async clearActivity() {
    this.lastActivity = null;
    this.lastPlaying = false;
    this.showingAfk = false;
    if (this.client && this.client.user && this.isConnected) {
      try {
        await this.client.user.clearActivity();
      } catch (e) {
        // Ignore
      }
    }
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
  }
}

export const discordRpcManager = new DiscordRpcManager();
