import mqtt, { MqttClient } from 'mqtt';
import { MediaTrack } from '../types';

export interface PartyMember {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: number;
  avatarColor: string;
}

export interface PartyReaction {
  id: string;
  emoji: string;
  senderName: string;
  timestamp: number;
}

export type PartyStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface PartySyncEvent {
  type: 'track' | 'playState' | 'seek' | 'timelineSync' | 'reaction' | 'memberJoined' | 'memberLeft' | 'kicked' | 'hostEnded';
  track?: MediaTrack;
  isPlaying?: boolean;
  position?: number;
  reaction?: PartyReaction;
  member?: PartyMember;
  reason?: string;
}

export type PartyListener = () => void;
export type SyncEventListener = (event: PartySyncEvent) => void;

// Globally available public secure WebSocket MQTT brokers with SSL/TLS
const PRIMARY_BROKER = 'wss://broker.emqx.io:8084/mqtt';
const FALLBACK_BROKER = 'wss://broker.hivemq.com:8884/mqtt';

const AVATAR_COLORS = [
  '#1ed760', // Spotify green
  '#00d2ff', // Electric cyan
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#3b82f6', // Royal blue
  '#10b981', // Emerald
];

function getRandomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

export class PartyService {
  private client: MqttClient | null = null;
  private partyCode: string | null = null;
  private isHost: boolean = false;
  private status: PartyStatus = 'idle';
  private errorMessage: string | null = null;

  private myMemberId: string = 'usr_' + Math.random().toString(36).substring(2, 9);
  private myName: string = 'User ' + Math.floor(100 + Math.random() * 900);
  private myAvatarColor: string = getRandomColor();

  private members: PartyMember[] = [];
  private currentTrack: MediaTrack | null = null;
  private isPlaying: boolean = false;
  private position: number = 0;

  private syncListeners: Set<SyncEventListener> = new Set();
  private stateListeners: Set<PartyListener> = new Set();

  private heartbeatTimer: number | null = null;
  private joinTimeoutTimer: number | null = null;
  private activeBroker: string = PRIMARY_BROKER;

  constructor() {
    // Try restoring saved display name if present
    try {
      const saved = localStorage.getItem('freq_party_username');
      if (saved && saved.trim()) {
        this.myName = saved.trim().slice(0, 24);
      }
    } catch {
      // Ignore
    }
  }

  // --- Public Getters ---
  public getPartyCode(): string | null {
    return this.partyCode;
  }

  public getIsHost(): boolean {
    return this.isHost;
  }

  public getStatus(): PartyStatus {
    return this.status;
  }

  public getErrorMessage(): string | null {
    return this.errorMessage;
  }

  public getMembers(): PartyMember[] {
    return [...this.members];
  }

  public getMyMemberId(): string {
    return this.myMemberId;
  }

  public getMyName(): string {
    return this.myName;
  }

  public setMyName(name: string) {
    const clean = name.trim().slice(0, 24);
    if (!clean) return;
    this.myName = clean;
    try {
      localStorage.setItem('freq_party_username', clean);
    } catch {}
    // If in party, update our own member entry
    const me = this.members.find(m => m.id === this.myMemberId);
    if (me) {
      me.name = clean;
      this.notifyState();
    }
  }

  public isInParty(): boolean {
    return this.status === 'connected' && !!this.partyCode;
  }

  public subscribe(listener: PartyListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  public onSyncEvent(listener: SyncEventListener): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  private notifyState() {
    this.stateListeners.forEach(cb => cb());
  }

  private notifySync(event: PartySyncEvent) {
    this.syncListeners.forEach(cb => cb(event));
  }

  // --- Topic Helpers ---
  private getTopic(code: string): string {
    return `freq/party/v1/room/${code}`;
  }

  // --- Host: Create Party ---
  public async createParty(initialTrack?: MediaTrack | null, isPlaying = false, position = 0): Promise<string> {
    this.leaveParty();

    // Generate random 4-digit code (1000 - 9999)
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    this.partyCode = code;
    this.isHost = true;
    this.status = 'connecting';
    this.errorMessage = null;

    this.members = [
      {
        id: this.myMemberId,
        name: this.myName,
        isHost: true,
        joinedAt: Date.now(),
        avatarColor: this.myAvatarColor,
      },
    ];
    this.currentTrack = initialTrack || null;
    this.isPlaying = isPlaying;
    this.position = position;

    this.notifyState();

    try {
      await this.connectMqtt(code);
      this.status = 'connected';
      this.startHostHeartbeat();
      this.notifyState();
      return code;
    } catch (err: any) {
      this.status = 'error';
      this.errorMessage = 'Could not connect to party network. Please check your internet connection.';
      this.notifyState();
      throw err;
    }
  }

  // --- Guest: Join Party ---
  public async joinParty(code: string): Promise<void> {
    const cleanCode = code.trim().replace(/\D/g, '');
    if (cleanCode.length !== 4) {
      throw new Error('Please enter a valid 4-digit party code.');
    }

    this.leaveParty();

    this.partyCode = cleanCode;
    this.isHost = false;
    this.status = 'connecting';
    this.errorMessage = null;
    this.notifyState();

    try {
      await this.connectMqtt(cleanCode);

      // Send JOIN_REQUEST to room
      this.sendJoinRequest();

      // Wait up to 6 seconds for host acceptance
      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const retryInterval = window.setInterval(() => {
          if (this.status === 'connected') {
            clearInterval(retryInterval);
            resolve();
            return;
          }
          if (this.status === 'error') {
            clearInterval(retryInterval);
            reject(new Error(this.errorMessage || 'Failed to join party.'));
            return;
          }
          attempts++;
          if (attempts > 3) {
            clearInterval(retryInterval);
            this.leaveParty();
            const msg = 'Party not found or Host is offline. Check the 4-digit code and try again.';
            this.errorMessage = msg;
            this.status = 'error';
            this.notifyState();
            reject(new Error(msg));
          } else {
            this.sendJoinRequest();
          }
        }, 1500);

        this.joinTimeoutTimer = retryInterval;
      });
    } catch (err: any) {
      this.status = 'error';
      this.errorMessage = err.message || 'Unable to join party.';
      this.notifyState();
      throw err;
    }
  }

  private sendJoinRequest() {
    if (!this.client || !this.partyCode) return;
    const packet = {
      type: 'JOIN_REQUEST',
      senderId: this.myMemberId,
      member: {
        id: this.myMemberId,
        name: this.myName,
        isHost: false,
        joinedAt: Date.now(),
        avatarColor: this.myAvatarColor,
      },
      timestamp: Date.now(),
    };
    this.publish(packet);
  }

  // --- Leave / End Party ---
  public leaveParty() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.joinTimeoutTimer) {
      clearInterval(this.joinTimeoutTimer);
      this.joinTimeoutTimer = null;
    }

    if (this.client && this.partyCode) {
      try {
        if (this.isHost) {
          this.publish({ type: 'HOST_LEAVE', senderId: this.myMemberId });
        } else {
          this.publish({ type: 'MEMBER_LEAVE', memberId: this.myMemberId, senderId: this.myMemberId });
        }
      } catch {
        // Ignored
      }
      try {
        this.client.end(true);
      } catch {}
      this.client = null;
    }

    this.partyCode = null;
    this.isHost = false;
    this.status = 'idle';
    this.errorMessage = null;
    this.members = [];
    this.notifyState();
  }

  // --- Host: Kick Member ---
  public kickMember(memberId: string) {
    if (!this.isHost || !this.partyCode || memberId === this.myMemberId) return;
    this.publish({
      type: 'KICK_MEMBER',
      targetMemberId: memberId,
      senderId: this.myMemberId,
    });
    this.members = this.members.filter(m => m.id !== memberId);
    this.notifyState();
    this.broadcastStateSync();
  }

  // --- Host: Playback Broadcasts ---
  public broadcastTrackChange(track: MediaTrack, position = 0, isPlaying = true) {
    if (!this.isHost || !this.partyCode || this.status !== 'connected') return;
    this.currentTrack = track;
    this.position = position;
    this.isPlaying = isPlaying;
    this.publish({
      type: 'TRACK_CHANGE',
      track,
      position,
      isPlaying,
      timestamp: Date.now(),
      senderId: this.myMemberId,
    });
  }

  public broadcastPlayState(isPlaying: boolean, position: number) {
    if (!this.isHost || !this.partyCode || this.status !== 'connected') return;
    this.isPlaying = isPlaying;
    this.position = position;
    this.publish({
      type: 'PLAY_STATE',
      isPlaying,
      position,
      timestamp: Date.now(),
      senderId: this.myMemberId,
    });
  }

  public broadcastSeek(position: number) {
    if (!this.isHost || !this.partyCode || this.status !== 'connected') return;
    this.position = position;
    this.publish({
      type: 'SEEK',
      position,
      isPlaying: this.isPlaying,
      timestamp: Date.now(),
      senderId: this.myMemberId,
    });
  }

  // Send fun live reaction (both Host and Guests can send)
  public sendReaction(emoji: string) {
    if (!this.partyCode || this.status !== 'connected') return;
    const reaction: PartyReaction = {
      id: Math.random().toString(36).substring(2, 9),
      emoji,
      senderName: this.myName,
      timestamp: Date.now(),
    };
    this.publish({
      type: 'REACTION',
      reaction,
      senderId: this.myMemberId,
    });
    this.notifySync({ type: 'reaction', reaction });
  }

  // --- Host Heartbeat & Periodic Sync ---
  private startHostHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = window.setInterval(() => {
      if (!this.isHost || !this.partyCode || this.status !== 'connected') return;
      this.publish({
        type: 'TIMELINE_SYNC',
        position: this.position,
        isPlaying: this.isPlaying,
        currentTrackId: this.currentTrack?.id || null,
        membersCount: this.members.length,
        timestamp: Date.now(),
        senderId: this.myMemberId,
      });
    }, 3500);
  }

  private broadcastStateSync() {
    if (!this.isHost || !this.partyCode) return;
    this.publish({
      type: 'MEMBERS_UPDATE',
      members: this.members,
      senderId: this.myMemberId,
    });
  }

  // Update current playback position from the host's audio loop
  public updateLocalPlaybackStatus(position: number, isPlaying: boolean, track: MediaTrack | null) {
    this.position = position;
    this.isPlaying = isPlaying;
    if (track) this.currentTrack = track;
  }

  // --- MQTT Client Connection ---
  private connectMqtt(code: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const topic = this.getTopic(code);
      const clientId = `freq_${this.myMemberId}_${Math.floor(Math.random() * 10000)}`;

      // Connect with fallback broker support
      const connectBroker = (brokerUrl: string) => {
        try {
          this.activeBroker = brokerUrl;
          const client = mqtt.connect(brokerUrl, {
            clientId,
            clean: true,
            connectTimeout: 8000,
            reconnectPeriod: 3000,
            keepalive: 30,
          });

          const timeoutHandle = setTimeout(() => {
            if (this.status === 'connecting') {
              client.end(true);
              if (brokerUrl === PRIMARY_BROKER) {
                // Try fallback broker
                connectBroker(FALLBACK_BROKER);
              } else {
                reject(new Error('Connection timed out to party servers.'));
              }
            }
          }, 8500);

          client.on('connect', () => {
            clearTimeout(timeoutHandle);
            this.client = client;
            client.subscribe(topic, { qos: 0 }, err => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          });

          client.on('message', (_topic, message) => {
            try {
              const payload = JSON.parse(message.toString());
              this.handleIncomingMessage(payload);
            } catch (e) {
              console.warn('[PartyService] Failed to parse message:', e);
            }
          });

          client.on('error', err => {
            console.warn('[PartyService] MQTT error on broker:', brokerUrl, err);
            if (this.status === 'connecting' && brokerUrl === PRIMARY_BROKER) {
              clearTimeout(timeoutHandle);
              client.end(true);
              connectBroker(FALLBACK_BROKER);
            }
          });

          client.on('close', () => {
            if (this.status === 'connected') {
              console.log('[PartyService] Connection closed, reconnecting...');
            }
          });
        } catch (e) {
          reject(e);
        }
      };

      connectBroker(PRIMARY_BROKER);
    });
  }

  private publish(payload: any) {
    if (!this.client || !this.partyCode) return;
    const topic = this.getTopic(this.partyCode);
    const msg = JSON.stringify(payload);
    this.client.publish(topic, msg, { qos: 0 });
  }

  // --- Inbound Message Handler ---
  private handleIncomingMessage(payload: any) {
    if (!payload || !payload.type) return;

    // Ignore packets from self
    if (payload.senderId === this.myMemberId) return;

    switch (payload.type) {
      case 'JOIN_REQUEST': {
        if (!this.isHost) return;
        const newMember: PartyMember = payload.member;
        if (!newMember || !newMember.id) return;

        // Capacity guard: Maximum 5 people (1 Host + 4 Members)
        if (this.members.length >= 5) {
          this.publish({
            type: 'JOIN_REJECTED',
            targetMemberId: newMember.id,
            reason: 'Party is already full (maximum 5 people).',
            senderId: this.myMemberId,
          });
          return;
        }

        // Add member if not already present
        if (!this.members.some(m => m.id === newMember.id)) {
          this.members.push(newMember);
          this.notifyState();
          this.notifySync({ type: 'memberJoined', member: newMember });
        }

        // Accept and send current state
        this.publish({
          type: 'JOIN_ACCEPTED',
          targetMemberId: newMember.id,
          members: this.members,
          currentTrack: this.currentTrack,
          isPlaying: this.isPlaying,
          position: this.position,
          timestamp: Date.now(),
          senderId: this.myMemberId,
        });
        break;
      }

      case 'JOIN_ACCEPTED': {
        if (this.isHost) return;
        // Verify this acceptance is for me
        if (payload.targetMemberId !== this.myMemberId) return;

        if (this.joinTimeoutTimer) {
          clearInterval(this.joinTimeoutTimer);
          this.joinTimeoutTimer = null;
        }

        this.status = 'connected';
        this.members = Array.isArray(payload.members) ? payload.members : [];
        // Ensure my record is in the members list
        if (!this.members.some(m => m.id === this.myMemberId)) {
          this.members.push({
            id: this.myMemberId,
            name: this.myName,
            isHost: false,
            joinedAt: Date.now(),
            avatarColor: this.myAvatarColor,
          });
        }
        this.notifyState();

        // Initial sync of track & position
        if (payload.currentTrack) {
          const latency = (Date.now() - (payload.timestamp || Date.now())) / 1000;
          const adjustedPos = Math.max(0, (payload.position || 0) + (payload.isPlaying ? latency : 0));
          this.notifySync({
            type: 'track',
            track: payload.currentTrack,
            isPlaying: !!payload.isPlaying,
            position: adjustedPos,
          });
        }
        break;
      }

      case 'JOIN_REJECTED': {
        if (this.isHost) return;
        if (payload.targetMemberId !== this.myMemberId) return;

        if (this.joinTimeoutTimer) {
          clearInterval(this.joinTimeoutTimer);
          this.joinTimeoutTimer = null;
        }

        this.status = 'error';
        this.errorMessage = payload.reason || 'Party is full or cannot be joined.';
        this.notifyState();
        this.leaveParty();
        break;
      }

      case 'MEMBERS_UPDATE': {
        if (this.isHost) return;
        if (Array.isArray(payload.members)) {
          this.members = payload.members;
          this.notifyState();
        }
        break;
      }

      case 'MEMBER_LEAVE': {
        const leftId = payload.memberId;
        const exiting = this.members.find(m => m.id === leftId);
        this.members = this.members.filter(m => m.id !== leftId);
        this.notifyState();
        if (exiting) {
          this.notifySync({ type: 'memberLeft', member: exiting });
        }
        break;
      }

      case 'HOST_LEAVE': {
        if (this.isHost) return;
        this.notifySync({ type: 'hostEnded', reason: 'The host has ended the party.' });
        this.leaveParty();
        break;
      }

      case 'KICK_MEMBER': {
        if (payload.targetMemberId === this.myMemberId) {
          this.notifySync({ type: 'kicked', reason: 'You have been removed from the party by the host.' });
          this.leaveParty();
        } else {
          this.members = this.members.filter(m => m.id !== payload.targetMemberId);
          this.notifyState();
        }
        break;
      }

      case 'TRACK_CHANGE': {
        if (this.isHost) return;
        if (payload.track) {
          const latency = (Date.now() - (payload.timestamp || Date.now())) / 1000;
          const adjustedPos = Math.max(0, (payload.position || 0) + (payload.isPlaying ? latency : 0));
          this.currentTrack = payload.track;
          this.isPlaying = !!payload.isPlaying;
          this.position = adjustedPos;
          this.notifySync({
            type: 'track',
            track: payload.track,
            position: adjustedPos,
            isPlaying: !!payload.isPlaying,
          });
        }
        break;
      }

      case 'PLAY_STATE': {
        if (this.isHost) return;
        const latency = (Date.now() - (payload.timestamp || Date.now())) / 1000;
        const adjustedPos = Math.max(0, (payload.position || 0) + (payload.isPlaying ? latency : 0));
        this.isPlaying = !!payload.isPlaying;
        this.position = adjustedPos;
        this.notifySync({
          type: 'playState',
          isPlaying: !!payload.isPlaying,
          position: adjustedPos,
        });
        break;
      }

      case 'SEEK': {
        if (this.isHost) return;
        const latency = (Date.now() - (payload.timestamp || Date.now())) / 1000;
        const adjustedPos = Math.max(0, (payload.position || 0) + (payload.isPlaying ? latency : 0));
        this.position = adjustedPos;
        this.notifySync({
          type: 'seek',
          position: adjustedPos,
          isPlaying: !!payload.isPlaying,
        });
        break;
      }

      case 'TIMELINE_SYNC': {
        if (this.isHost) return;
        const latency = (Date.now() - (payload.timestamp || Date.now())) / 1000;
        const targetPos = Math.max(0, (payload.position || 0) + (payload.isPlaying ? latency : 0));
        this.notifySync({
          type: 'timelineSync',
          position: targetPos,
          isPlaying: !!payload.isPlaying,
        });
        break;
      }

      case 'REACTION': {
        if (payload.reaction) {
          this.notifySync({
            type: 'reaction',
            reaction: payload.reaction,
          });
        }
        break;
      }
    }
  }
}

export const partyService = new PartyService();
