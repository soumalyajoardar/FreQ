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
  };
  isPlaying: boolean;
  position: number;
  audioMode: 'NORMAL' | 'SNR' | 'NIGHTCORE';
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
  private showingAfk = false;
  private afkTimer: NodeJS.Timeout | null = null;

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

    if (!payload || !payload.track || !payload.track.title) {
      this.lastPlaying = false;
      this.showBrowsing();
      return;
    }
    this.lastPlaying = !!payload.isPlaying;

    if (!this.isConnected) {
      this.connect();
      return;
    }

    // Rate-limit activity updates to prevent Discord RPC spam (min 1.2s between updates)
    const now = Date.now();
    if (now - this.lastUpdateTimestamp < 1200) {
      return;
    }

    this.applyActivity(payload);
  }

  private async applyActivity(payload: DiscordActivityPayload) {
    if (!this.client || !this.client.user || !this.isConnected || !this.isEnabled) return;

    const { track, isPlaying, position, audioMode } = payload;
    if (!track || !track.title) {
      this.clearActivity();
      return;
    }

    // Audio flavor labels
    let flavorLabel = 'FreQ • Studio';
    if (audioMode === 'SNR') flavorLabel = 'FreQ • SnR (Slowed + Reverb)';
    else if (audioMode === 'NIGHTCORE') flavorLabel = 'FreQ • Nightcore (1.2x Pitch)';

    // Exact user layout:
    // Line 1: Song title only
    // Line 2: Artists name
    // Bottom: Timeline progress bar
    const details = (track.title || 'Unknown Track').trim().slice(0, 128);
    const state = (track.artist || 'Unknown Artist').trim().slice(0, 128);

    try {
      if (isPlaying) {
        const now = Date.now();
        const startTimestamp = Math.max(0, Math.floor(now - (position || 0) * 1000));
        const duration = track.durationSeconds || 194;
        const remainingSeconds = Math.max(1, duration - (position || 0));
        const endTimestamp = Math.floor(now + remainingSeconds * 1000);

        await this.client.user.setActivity({
          type: 2, // 2 = LISTENING ("Listening to FreQ")
          details, // Listening to {Song name}
          state, // Artists name
          startTimestamp, // Timeline start
          endTimestamp, // Timeline end (renders live countdown timeline at the bottom)
          largeImageKey: track.artworkUrl || undefined,
          largeImageText: track.title.slice(0, 128),
          smallImageKey: 'freq_logo', // FreQ app icon (upload in portal Art Assets)
          smallImageText: flavorLabel.slice(0, 128),
        });
      } else {
        await this.client.user.setActivity({
          type: 2,
          details,
          state: `${state} (Paused)`.slice(0, 128),
          largeImageKey: track.artworkUrl || undefined,
          largeImageText: track.title.slice(0, 128),
          smallImageText: 'Paused',
        });
      }

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
