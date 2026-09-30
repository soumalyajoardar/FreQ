import { Client } from '@xhayper/discord-rpc';

const DEFAULT_CLIENT_ID = '1177081335727267940';

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

  constructor() {
    this.connect();
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
          this.applyActivity(this.lastActivity);
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
    if (!this.isEnabled) return;

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

    const details = track.title.length < 2 ? `${track.title} ` : track.title;
    const state = `${track.artist || 'Unknown'}${track.album ? ` • ${track.album}` : ''}`;

    // Discord buttons (max 2)
    const buttons = track.id && /^[A-Za-z0-9_-]{11}$/.test(track.id)
      ? [
          {
            label: 'Listen on YouTube Music',
            url: `https://music.youtube.com/watch?v=${track.id}`,
          },
        ]
      : undefined;

    try {
      if (isPlaying) {
        const now = Date.now();
        const startTimestamp = Math.max(0, Math.floor(now - (position || 0) * 1000));
        const duration = track.durationSeconds || 194;
        const remainingSeconds = Math.max(1, duration - (position || 0));
        const endTimestamp = Math.floor(now + remainingSeconds * 1000);

        await this.client.user.setActivity({
          details: details.slice(0, 128),
          state: state.slice(0, 128),
          startTimestamp,
          endTimestamp,
          largeImageKey: track.artworkUrl || undefined,
          largeImageText: track.album ? `${track.title} (${track.album})`.slice(0, 128) : track.title.slice(0, 128),
          smallImageText: flavorLabel.slice(0, 128),
          buttons,
        });
      } else {
        await this.client.user.setActivity({
          details: `${details} [Paused]`.slice(0, 128),
          state: state.slice(0, 128),
          largeImageKey: track.artworkUrl || undefined,
          largeImageText: track.title.slice(0, 128),
          smallImageText: 'Paused',
          buttons,
        });
      }

      this.lastUpdateTimestamp = Date.now();
    } catch (err: any) {
      console.warn('[Discord RPC] setActivity warning:', err.message || err);
    }
  }

  public async clearActivity() {
    this.lastActivity = null;
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
