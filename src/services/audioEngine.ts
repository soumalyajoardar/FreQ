import { AudioMode, MediaTrack } from '../types';

type PlaybackCallback = () => void;
type TimeUpdateCallback = (position: number, duration: number) => void;
type TrackEndCallback = () => void;
type ErrorCallback = (error: string) => void;

class AudioEngine {
  private audio: HTMLAudioElement;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private bassNode: BiquadFilterNode | null = null;
  private dryGainNode: GainNode | null = null;
  private wetGainNode: GainNode | null = null;
  private convolverNode: ConvolverNode | null = null;
  private masterGainNode: GainNode | null = null;
  private isAudioGraphReady = false;

  private currentTrack: MediaTrack | null = null;
  private audioMode: AudioMode = 'SNR';
  private volume: number = 0.85;
  // Custom flavor parameters (tunable from Settings, persisted in library)
  private snrRate: number = 0.8;
  private snrReverb: number = 0.55;
  private nightcoreRate: number = 1.2;
  // Bass booster (0–1 → 0–+12 dB low shelf). Heard in SnR/Nightcore
  // only — Normal always plays pure and unaltered.
  private bassBoost: number = 0;

  private onPlayListeners: PlaybackCallback[] = [];
  private onPauseListeners: PlaybackCallback[] = [];
  private onTimeUpdateListeners: TimeUpdateCallback[] = [];
  private onTrackEndListeners: TrackEndCallback[] = [];
  private onErrorListeners: ErrorCallback[] = [];

  // Smooth timeline clock (10fps rAF) — timeupdate alone fires ~4Hz,
  // which makes the scrubber step and freeze position up to 250ms stale.
  private rafId: number | null = null;
  private lastTick: number = 0;

  private emitTime() {
    const pos = this.audio.currentTime || 0;
    const dur = this.audio.duration || 0;
    this.onTimeUpdateListeners.forEach(cb => cb(pos, dur));
    this.updateMediaSessionPosition(pos, dur);
  }

  private startSmoothClock() {
    this.stopSmoothClock();
    this.lastTick = 0;
    const loop = (t: number) => {
      if (t - this.lastTick >= 100) {
        this.lastTick = t;
        this.emitTime();
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private stopSmoothClock() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.volume = this.volume;

    this.setupAudioListeners();
  }

  private initAudioGraph() {
    if (this.isAudioGraphReady) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.audioCtx = new AudioCtxClass();
      this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);

      // Bass booster: low shelf feeding both dry and reverb paths
      this.bassNode = this.audioCtx.createBiquadFilter();
      this.bassNode.type = 'lowshelf';
      this.bassNode.frequency.value = 120;
      this.bassNode.gain.value = 0;

      this.masterGainNode = this.audioCtx.createGain();
      this.masterGainNode.gain.value = 1.0;

      this.dryGainNode = this.audioCtx.createGain();
      this.dryGainNode.gain.value = 1.0;

      this.wetGainNode = this.audioCtx.createGain();
      this.wetGainNode.gain.value = 0.0;

      this.convolverNode = this.audioCtx.createConvolver();
      this.convolverNode.buffer = this.createReverbImpulse(this.audioCtx, 2.5, 2.0);

      // Route dry signal: source -> bass -> dryGain -> masterGain
      this.sourceNode.connect(this.bassNode);
      this.bassNode.connect(this.dryGainNode);
      this.dryGainNode.connect(this.masterGainNode);

      // Route wet reverb signal: bass -> convolver -> wetGain -> masterGain
      this.bassNode.connect(this.convolverNode);
      this.convolverNode.connect(this.wetGainNode);
      this.wetGainNode.connect(this.masterGainNode);

      this.masterGainNode.connect(this.audioCtx.destination);
      this.isAudioGraphReady = true;
    } catch (e) {
      console.warn('Web Audio DSP graph initialization fallback:', e);
    }
  }

  // Generates an authentic lush stereo reverb impulse response
  private createReverbImpulse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const factor = Math.exp(-n * decay * 3.5);
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }
    return impulse;
  }

  private setupAudioListeners() {
    this.audio.addEventListener('play', () => {
      this.onPlayListeners.forEach(cb => cb());
      this.updateMediaSessionPlaybackState('playing');
      this.emitTime();
      this.startSmoothClock();
    });

    this.audio.addEventListener('pause', () => {
      this.stopSmoothClock();
      // Exact freeze: timeupdate may lag a paused frame by ~250ms.
      this.emitTime();
      this.onPauseListeners.forEach(cb => cb());
      this.updateMediaSessionPlaybackState('paused');
    });

    this.audio.addEventListener('timeupdate', () => {
      this.emitTime();
    });

    // Metadata / seek landings report exact position immediately.
    this.audio.addEventListener('loadedmetadata', () => {
      this.emitTime();
    });

    this.audio.addEventListener('seeked', () => {
      this.emitTime();
    });

    this.audio.addEventListener('ended', () => {
      this.stopSmoothClock();
      this.onTrackEndListeners.forEach(cb => cb());
    });

    this.audio.addEventListener('error', () => {
      const err = this.audio.error?.message || 'Playback stream error';
      this.onErrorListeners.forEach(cb => cb(err));
    });
  }

  public async loadAndPlay(streamUrl: string, track: MediaTrack) {
    this.initAudioGraph();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    this.currentTrack = track;
    this.audio.src = streamUrl;
    this.applyAudioFlavor(this.audioMode);

    this.updateMediaSessionMetadata(track);

    try {
      await this.audio.play();
    } catch (e: any) {
      console.error('Failed to start audio playback:', e);
      throw e;
    }
  }

  public async play() {
    this.initAudioGraph();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
    return this.audio.play();
  }

  public pause() {
    this.audio.pause();
  }

  public seek(seconds: number) {
    if (!isNaN(seconds)) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration || seconds));
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(val, 1));
    this.audio.volume = this.volume;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setAudioMode(mode: AudioMode) {
    this.audioMode = mode;
    this.applyAudioFlavor(mode);
  }

  public getAudioMode(): AudioMode {
    return this.audioMode;
  }

  // Custom SnR tempo (0.5–1.0). Applies live when SnR is active.
  public setSnrRate(rate: number) {
    this.snrRate = Math.min(1, Math.max(0.5, rate));
    if (this.audioMode === 'SNR') this.applyAudioFlavor('SNR');
  }

  public getSnrRate(): number {
    return this.snrRate;
  }

  // Custom SnR reverb send (0–1). Applies live when SnR is active.
  public setSnrReverb(amount: number) {
    this.snrReverb = Math.min(1, Math.max(0, amount));
    if (this.audioMode === 'SNR') this.applyAudioFlavor('SNR');
  }

  public getSnrReverb(): number {
    return this.snrReverb;
  }

  // Custom Nightcore speed (1.0–1.5). Applies live when Nightcore is active.
  public setNightcoreRate(rate: number) {
    this.nightcoreRate = Math.min(1.5, Math.max(1.0, rate));
    if (this.audioMode === 'NIGHTCORE') this.applyAudioFlavor('NIGHTCORE');
  }

  public getNightcoreRate(): number {
    return this.nightcoreRate;
  }

  // Bass booster amount (0–1). Heard in SnR/Nightcore only —
  // Normal always plays pure and unaltered.
  public setBassBoost(amount: number) {
    this.bassBoost = Math.min(1, Math.max(0, amount));
    this.applyBass();
  }

  public getBassBoost(): number {
    return this.bassBoost;
  }

  private applyBass() {
    if (!this.bassNode || !this.audioCtx) return;
    const t = this.audioCtx.currentTime;
    const target = this.audioMode === 'NORMAL' ? 0 : this.bassBoost * 12;
    this.bassNode.gain.setTargetAtTime(target, t, 0.05);
  }

  private applyAudioFlavor(mode: AudioMode) {
    const audioEl = this.audio as any;

    if (mode === 'NORMAL') {
      this.audio.playbackRate = 1.0;
      if ('preservesPitch' in audioEl) audioEl.preservesPitch = true;
      if ('mozPreservesPitch' in audioEl) audioEl.mozPreservesPitch = true;
      if (this.dryGainNode) this.dryGainNode.gain.value = 1.0;
      if (this.wetGainNode) this.wetGainNode.gain.value = 0.0;
      this.applyBass();
    } else if (mode === 'SNR') {
      // SnR: custom slowed tempo + custom reverb send, pitched down
      this.audio.playbackRate = this.snrRate;
      if ('preservesPitch' in audioEl) audioEl.preservesPitch = false;
      if ('mozPreservesPitch' in audioEl) audioEl.mozPreservesPitch = false;
      if (this.dryGainNode) this.dryGainNode.gain.value = 0.85;
      if (this.wetGainNode) this.wetGainNode.gain.value = this.snrReverb * 0.9;
      this.applyBass();
    } else if (mode === 'NIGHTCORE') {
      // Nightcore: custom speed, pitched up with tempo, dry signal
      this.audio.playbackRate = this.nightcoreRate;
      if ('preservesPitch' in audioEl) audioEl.preservesPitch = false;
      if ('mozPreservesPitch' in audioEl) audioEl.mozPreservesPitch = false;
      if (this.dryGainNode) this.dryGainNode.gain.value = 1.0;
      if (this.wetGainNode) this.wetGainNode.gain.value = 0.0;
      this.applyBass();
    }
  }

  // Windows MediaSession API Integration (Taskbar / Lockscreen Controls & Media Keys)
  private updateMediaSessionMetadata(track: MediaTrack) {
    if ('mediaSession' in navigator && window.MediaMetadata) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album || 'FreQ Music',
        artwork: track.artworkUrl
          ? [
              { src: track.artworkUrl, sizes: '512x512', type: 'image/jpeg' },
              { src: track.artworkUrl, sizes: '256x256', type: 'image/jpeg' },
            ]
          : [],
      });
    }
  }

  private updateMediaSessionPlaybackState(state: 'playing' | 'paused') {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = state;
    }
  }

  private updateMediaSessionPosition(pos: number, dur: number) {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession && dur > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: dur,
          playbackRate: this.audio.playbackRate,
          position: Math.min(pos, dur),
        });
      } catch (_e) {
        // Ignored
      }
    }
  }

  public setMediaSessionActionHandlers(handlers: {
    onPlay: () => void;
    onPause: () => void;
    onPrev: () => void;
    onNext: () => void;
    onSeek: (pos: number) => void;
  }) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', handlers.onPlay);
      navigator.mediaSession.setActionHandler('pause', handlers.onPause);
      navigator.mediaSession.setActionHandler('previoustrack', handlers.onPrev);
      navigator.mediaSession.setActionHandler('nexttrack', handlers.onNext);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          handlers.onSeek(details.seekTime);
        }
      });
    }
  }

  public onPlay(cb: PlaybackCallback): () => void {
    this.onPlayListeners.push(cb);
    return () => { this.onPlayListeners = this.onPlayListeners.filter(l => l !== cb); };
  }

  public onPause(cb: PlaybackCallback): () => void {
    this.onPauseListeners.push(cb);
    return () => { this.onPauseListeners = this.onPauseListeners.filter(l => l !== cb); };
  }

  public onTimeUpdate(cb: TimeUpdateCallback): () => void {
    this.onTimeUpdateListeners.push(cb);
    return () => { this.onTimeUpdateListeners = this.onTimeUpdateListeners.filter(l => l !== cb); };
  }

  public onTrackEnd(cb: TrackEndCallback): () => void {
    this.onTrackEndListeners.push(cb);
    return () => { this.onTrackEndListeners = this.onTrackEndListeners.filter(l => l !== cb); };
  }

  public onError(cb: ErrorCallback): () => void {
    this.onErrorListeners.push(cb);
    return () => { this.onErrorListeners = this.onErrorListeners.filter(l => l !== cb); };
  }

  public getCurrentTime(): number {
    return this.audio.currentTime || 0;
  }

  public getDuration(): number {
    return this.audio.duration || 0;
  }

  public isPaused(): boolean {
    return this.audio.paused;
  }
}

export const audioEngine = new AudioEngine();
