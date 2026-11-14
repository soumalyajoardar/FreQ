import { AudioMode, MediaTrack } from '../types';

type PlaybackCallback = () => void;
type TimeUpdateCallback = (position: number, duration: number) => void;
type TrackEndCallback = () => void;
type ErrorCallback = (error: string) => void;

// 5-band EQ layout: sub lowshelf, three peaking mids, air highshelf.
export const EQ_BAND_LABELS = ['60 Hz', '230 Hz', '910 Hz', '3.6 kHz', '14 kHz'];
const EQ_DEFS: { type: BiquadFilterType; freq: number }[] = [
  { type: 'lowshelf', freq: 60 },
  { type: 'peaking', freq: 230 },
  { type: 'peaking', freq: 910 },
  { type: 'peaking', freq: 3600 },
  { type: 'highshelf', freq: 14000 },
];
export const EQ_MIN_DB = -12;
export const EQ_MAX_DB = 12;

// Auto-level target: gentle RMS leveling toward broadcast-ish loudness.
const LEVEL_TARGET_DB = -20;
const LEVEL_MIN_GAIN = 0.25;
const LEVEL_MAX_GAIN = 4;

class AudioEngine {
  private audio: HTMLAudioElement;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private highpassNode: BiquadFilterNode | null = null;
  private bassNode: BiquadFilterNode | null = null;
  private bassPunchNode: BiquadFilterNode | null = null;
  private dryGainNode: GainNode | null = null;
  private wetGainNode: GainNode | null = null;
  private convolverNode: ConvolverNode | null = null;
  private masterGainNode: GainNode | null = null;
  private headroomNode: GainNode | null = null;
  private limiterNode: DynamicsCompressorNode | null = null;
  private finalGainNode: GainNode | null = null;
  private isAudioGraphReady = false;
  // 5-band EQ (series), per-track trim + auto-level, stereo balance.
  private eqNodes: BiquadFilterNode[] = [];
  private trimGainNode: GainNode | null = null;
  private levelGainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private panNode: StereoPannerNode | null = null;
  private levelBuf: Float32Array<ArrayBuffer> | null = null;

  private currentTrack: MediaTrack | null = null;
  private audioMode: AudioMode = 'SNR';
  private volume: number = 0.85;
  // Custom flavor parameters (tunable from Settings, persisted in library)
  private snrRate: number = 0.8;
  private snrReverb: number = 0.55;
  private nightcoreRate: number = 1.2;
  // Bass booster (0–1). Scales dual-stage sub-shelf (65 Hz) and tactile punch (105 Hz).
  // Default is 0.4 (+3.6 dB sub, +2.8 dB punch) for rich, punchy, feelable bass out-of-the-box.
  private bassBoost: number = 0.4;
  // 5-band EQ gains in dB (-12…+12). Flat-forced in Normal.
  private eqGains: number[] = [0, 0, 0, 0, 0];
  // Stereo balance (-1 left … +1 right). Center-forced in Normal.
  private balance: number = 0;
  // Auto volume leveling on/off. Bypassed in Normal.
  private autoLevel: boolean = false;
  // Per-track volume trim in dB (normalization). Ignored in Normal.
  private trackTrims: Record<string, number> = {};

  private onPlayListeners: PlaybackCallback[] = [];
  private onPauseListeners: PlaybackCallback[] = [];
  private onTimeUpdateListeners: TimeUpdateCallback[] = [];
  private onTrackEndListeners: TrackEndCallback[] = [];
  private onErrorListeners: ErrorCallback[] = [];

  // Smooth timeline clock (~4-5 Hz) — smooth enough for scrubber and timers
  // while cutting React reconciliation passes and main thread work by 60%.
  private clockId: number | null = null;
  private syncRateMultiplier: number = 1.0;

  private emitTime() {
    const pos = this.audio.currentTime || 0;
    const dur = this.audio.duration || 0;
    this.onTimeUpdateListeners.forEach(cb => cb(pos, dur));
    this.updateMediaSessionPosition(pos, dur);
    this.updateLeveling();
  }

  private startSmoothClock() {
    this.stopSmoothClock();
    const tick = () => {
      this.emitTime();
      const idle = document.hidden || !document.hasFocus();
      this.clockId = window.setTimeout(tick, idle ? 1000 : 220);
    };
    this.clockId = window.setTimeout(tick, 220);
  }

  private stopSmoothClock() {
    if (this.clockId !== null) {
      clearTimeout(this.clockId);
      this.clockId = null;
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

      // Subsonic guard: cut inaudible DC/sub-20Hz rumble that eats amplifier
      // headroom and causes intermodulation distortion, while keeping 30-50 Hz sub-bass pure.
      this.highpassNode = this.audioCtx.createBiquadFilter();
      this.highpassNode.type = 'highpass';
      this.highpassNode.frequency.value = 22;
      this.highpassNode.Q.value = 0.707;

      // Sub-bass warmth & foundation (65 Hz lowshelf)
      this.bassNode = this.audioCtx.createBiquadFilter();
      this.bassNode.type = 'lowshelf';
      this.bassNode.frequency.value = 65;
      this.bassNode.Q.value = 0.707;
      this.bassNode.gain.value = 0;

      // Tactile punch & kick-drum chest impact (105 Hz peaking)
      // This is the critical frequency band for feeling the bass on all headphones and speakers.
      this.bassPunchNode = this.audioCtx.createBiquadFilter();
      this.bassPunchNode.type = 'peaking';
      this.bassPunchNode.frequency.value = 105;
      this.bassPunchNode.Q.value = 1.2;
      this.bassPunchNode.gain.value = 0;

      this.masterGainNode = this.audioCtx.createGain();
      this.masterGainNode.gain.value = 1.0;

      this.dryGainNode = this.audioCtx.createGain();
      this.dryGainNode.gain.value = 1.0;

      this.wetGainNode = this.audioCtx.createGain();
      this.wetGainNode.gain.value = 0.0;

      this.convolverNode = this.audioCtx.createConvolver();
      this.convolverNode.buffer = this.createReverbImpulse(this.audioCtx, 2.5, 2.0);

      // Route dry signal: source -> highpass -> bass (sub) -> bassPunch (kick) -> EQ -> trim -> dryGain
      this.sourceNode.connect(this.highpassNode);
      this.highpassNode.connect(this.bassNode);
      this.bassNode.connect(this.bassPunchNode);
      let eqHead: AudioNode = this.bassPunchNode;
      this.eqNodes = EQ_DEFS.map(def => {
        const f = this.audioCtx!.createBiquadFilter();
        f.type = def.type;
        f.frequency.value = def.freq;
        if (def.type === 'peaking') f.Q.value = 1;
        f.gain.value = 0;
        eqHead.connect(f);
        eqHead = f;
        return f;
      });

      // Per-track trim (normalization): sits after tone shaping so trims
      // stay comparable across flavors.
      this.trimGainNode = this.audioCtx.createGain();
      this.trimGainNode.gain.value = 1.0;
      eqHead.connect(this.trimGainNode);
      this.trimGainNode.connect(this.dryGainNode);
      this.dryGainNode.connect(this.masterGainNode);

      // Route wet reverb signal: trim -> convolver -> wetGain -> masterGain
      this.trimGainNode.connect(this.convolverNode);
      this.convolverNode.connect(this.wetGainNode);
      this.wetGainNode.connect(this.masterGainNode);

      // Output chain: master -> auto-level -> analyser -> balance -> limiter.
      this.levelGainNode = this.audioCtx.createGain();
      this.levelGainNode.gain.value = 1.0;
      this.masterGainNode.connect(this.levelGainNode);

      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.levelGainNode.connect(this.analyserNode);

      let outNode: AudioNode = this.analyserNode;
      try {
        if (typeof this.audioCtx.createStereoPanner === 'function') {
          this.panNode = this.audioCtx.createStereoPanner();
          this.panNode.pan.value = 0;
          outNode.connect(this.panNode);
          outNode = this.panNode;
        }
      } catch (_e) {
        // No panner: stay centered, everything else still works.
      }

      // Safety stage: auto headroom (scaled with active boosts) -> transparent soft-knee
      // limiter -> fixed true-peak ceiling. Delivers massive, tactile bass with ZERO clipping/distortion.
      this.headroomNode = this.audioCtx.createGain();
      this.headroomNode.gain.value = 1.0;
      this.limiterNode = this.audioCtx.createDynamicsCompressor();
      this.limiterNode.threshold.value = -1.2;
      this.limiterNode.knee.value = 12;
      this.limiterNode.ratio.value = 5.0;
      this.limiterNode.attack.value = 0.012; // 12ms attack preserves punchy kick transient attack
      this.limiterNode.release.value = 0.15; // 150ms release prevents pumping
      this.finalGainNode = this.audioCtx.createGain();
      this.finalGainNode.gain.value = 0.98; // True-peak ceiling (-0.18 dBFS) prevents DAC intersample distortion

        outNode.connect(this.headroomNode);
        this.headroomNode.connect(this.limiterNode);
        this.limiterNode.connect(this.finalGainNode);
        this.finalGainNode.connect(this.audioCtx.destination);
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

  public async loadAndPlay(streamUrl: string, track: MediaTrack, startAtSec: number = 0) {
    this.initAudioGraph();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    this.currentTrack = track;
    this.syncRateMultiplier = 1.0;
    this.audio.src = streamUrl;
    if (startAtSec > 0) {
      try {
        this.audio.currentTime = startAtSec;
      } catch {}
    }
    this.applyAudioFlavor(this.audioMode);

    this.updateMediaSessionMetadata(track);

    try {
      await this.audio.play();
      if (startAtSec > 0 && Math.abs((this.audio.currentTime || 0) - startAtSec) > 0.6) {
        this.audio.currentTime = startAtSec;
      }
    } catch (e: any) {
      console.error('Failed to start audio playback:', e);
      throw e;
    }
  }

  public setSyncRateMultiplier(multiplier: number) {
    this.syncRateMultiplier = Math.max(0.85, Math.min(1.15, multiplier));
    this.updateEffectivePlaybackRate();
  }

  public getSyncRateMultiplier(): number {
    return this.syncRateMultiplier;
  }

  public updateEffectivePlaybackRate() {
    let base = 1.0;
    if (this.audioMode === 'SNR') base = this.snrRate;
    else if (this.audioMode === 'NIGHTCORE') base = this.nightcoreRate;

    const targetRate = base * this.syncRateMultiplier;
    if (Math.abs(this.audio.playbackRate - targetRate) > 0.005) {
      this.audio.playbackRate = targetRate;
    }
  }

  // Smooth, glitch-free drift correction for Listen Together parties.
  // Instead of dumping audio buffers with hard currentTime seeks (which causes music stuttering),
  // small drifts (0.2s - 3.5s) are smoothly caught up via gentle pitch-preserving playbackRate adjustments (±4%).
  public syncDrift(targetSec: number, isExplicitSeek: boolean = false) {
    if (isNaN(targetSec) || !this.audio.src) return;
    const current = this.audio.currentTime || 0;
    const diff = targetSec - current;

    if (isExplicitSeek || Math.abs(diff) > 3.5) {
      this.seek(targetSec);
      this.setSyncRateMultiplier(1.0);
      return;
    }

    // Already tightly synchronized within 200ms
    if (Math.abs(diff) < 0.20) {
      if (this.syncRateMultiplier !== 1.0) {
        this.setSyncRateMultiplier(1.0);
      }
      return;
    }

    // Behind host: gently run 4% faster to close gap without audio interruptions
    if (diff >= 0.20) {
      this.setSyncRateMultiplier(1.04);
    }
    // Ahead of host: gently run 4% slower
    else if (diff <= -0.20) {
      this.setSyncRateMultiplier(0.96);
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

  // 5-band EQ gains in dB. Heard in SnR/Nightcore — Normal stays flat.
  public setEqGains(gains: number[]) {
    this.eqGains = [0, 1, 2, 3, 4].map(i =>
      Number.isFinite(gains[i]) ? Math.min(EQ_MAX_DB, Math.max(EQ_MIN_DB, gains[i])) : 0,
    );
    this.applyEq();
  }

  public getEqGains(): number[] {
    return [...this.eqGains];
  }

  // Stereo balance (-1…+1). Heard in SnR/Nightcore — Normal stays centered.
  public setBalance(pan: number) {
    this.balance = Number.isFinite(pan) ? Math.min(1, Math.max(-1, pan)) : 0;
    this.applyBalance();
  }

  public getBalance(): number {
    return this.balance;
  }

  // Auto volume leveling. Bypassed in Normal.
  public setAutoLevel(on: boolean) {
    this.autoLevel = !!on;
  }

  public getAutoLevel(): boolean {
    return this.autoLevel;
  }

  // Per-track volume trim in dB (-12…+12). Ignored in Normal.
  public setTrackTrims(trims: Record<string, number>) {
    this.trackTrims = { ...(trims || {}) };
    this.applyTrim();
  }

  public getTrackTrim(trackId: string): number {
    return this.trackTrims[trackId] || 0;
  }

  private applyBass() {
    if (!this.audioCtx || !this.masterGainNode) return;
    const t = this.audioCtx.currentTime;
    if (this.bassNode) {
      // 65 Hz sub shelf for deep, rich low-end foundation (up to +9 dB)
      this.bassNode.gain.setTargetAtTime(this.bassBoost * 9, t, 0.05);
    }
    if (this.bassPunchNode) {
      // 105 Hz punch filter for tactile kick-drum impact you can physically feel (up to +7 dB)
      this.bassPunchNode.gain.setTargetAtTime(this.bassBoost * 7, t, 0.05);
    }
    this.masterGainNode.gain.setTargetAtTime(1.0, t, 0.05);
    this.applyHeadroom();
  }

  // Transparent headroom scaling: balances boosted energy before the limiter stage,
  // preventing volume ducking while keeping the bass loud, punchy, and 100% distortion-free.
  private applyHeadroom() {
    if (!this.audioCtx || !this.headroomNode) return;
    const bassDb = this.bassBoost * 9;
    const eqDb = this.audioMode === 'NORMAL' ? 0 : Math.max(0, ...this.eqGains);
    const trimDb = this.audioMode === 'NORMAL'
      ? 0
      : Math.max(0, this.trackTrims[this.currentTrack?.id || ''] || 0);
    const boostDb = Math.max(0, bassDb + eqDb + trimDb);
    // Moderate reduction: protects against digital clipping while preserving track punch and presence
    const reductionDb = -Math.min(3.0, boostDb * 0.15);
    this.headroomNode.gain.setTargetAtTime(
      Math.pow(10, reductionDb / 20),
      this.audioCtx.currentTime,
      0.05,
    );
  }

  // 5-band EQ. Normal forces flat (pure); flavors apply user gains.
  private applyEq() {
    if (!this.audioCtx || this.eqNodes.length !== EQ_DEFS.length) return;
    const t = this.audioCtx.currentTime;
    const gains = this.audioMode === 'NORMAL' ? [0, 0, 0, 0, 0] : this.eqGains;
    this.eqNodes.forEach((node, i) => {
      const g = Math.min(EQ_MAX_DB, Math.max(EQ_MIN_DB, gains[i] || 0));
      node.gain.setTargetAtTime(g, t, 0.05);
    });
    this.applyHeadroom();
  }

  // Stereo balance. Normal forces center (pure).
  private applyBalance() {
    if (!this.audioCtx || !this.panNode) return;
    const pan = this.audioMode === 'NORMAL' ? 0 : Math.min(1, Math.max(-1, this.balance));
    this.panNode.pan.setTargetAtTime(pan, this.audioCtx.currentTime, 0.05);
  }

  // Per-track trim (normalization). Ignored in Normal (pure).
  private applyTrim() {
    if (!this.audioCtx || !this.trimGainNode) return;
    const id = this.currentTrack?.id || '';
    const db = this.audioMode === 'NORMAL' ? 0 : (this.trackTrims[id] || 0);
    const linear = Math.pow(10, Math.min(12, Math.max(-12, db)) / 20);
    this.trimGainNode.gain.setTargetAtTime(linear, this.audioCtx.currentTime, 0.05);
    this.applyHeadroom();
  }

  // Beat-reactive visualizer state (kick onset in the 40–170 Hz band).
  private beatBuf: Float32Array<ArrayBuffer> | null = null;
  private beatHistory: number[] = [];
  private beatLevel = 0;
  private lastBeatAt = 0;

  /**
   * 0..1 pulse following the kick/bass onset. Call once per animation
   * frame; internally decayed so the UI gets a smooth envelope.
   */
  public getBeatLevel(): number {
    if (!this.analyserNode) return 0;
    const bins = this.analyserNode.frequencyBinCount;
    if (!this.beatBuf || this.beatBuf.length !== bins) {
      this.beatBuf = new Float32Array(bins);
    }
    this.analyserNode.getFloatFrequencyData(this.beatBuf);
    const sampleRate = this.audioCtx?.sampleRate || 44100;
    const binHz = sampleRate / this.analyserNode.fftSize;
    const lo = Math.max(1, Math.floor(40 / binHz));
    const hi = Math.min(bins - 1, Math.ceil(170 / binHz));
    let sum = 0;
    let n = 0;
    for (let i = lo; i <= hi; i++) {
      const db = this.beatBuf[i];
      if (Number.isFinite(db)) {
        sum += Math.min(1, Math.max(0, (db + 90) / 60));
        n += 1;
      }
    }
    const energy = n > 0 ? sum / n : 0;
    this.beatHistory.push(energy);
    if (this.beatHistory.length > 24) this.beatHistory.shift();
    const avg = this.beatHistory.reduce((a, b) => a + b, 0) / this.beatHistory.length;
    const now = performance.now();
    if (energy > 0.12 && energy > avg * 1.5 && now - this.lastBeatAt > 240) {
      this.lastBeatAt = now;
      this.beatLevel = Math.min(1, 0.4 + energy);
    } else {
      this.beatLevel *= 0.93;
      if (this.beatLevel < 0.01) this.beatLevel = 0;
    }
    return this.beatLevel;
  }
  private updateLeveling() {
    if (!this.analyserNode || !this.levelGainNode || !this.audioCtx) return;
    const t = this.audioCtx.currentTime;
    const active = this.autoLevel && this.audioMode !== 'NORMAL' && !this.audio.paused;
    if (!active) {
      if (Math.abs(this.levelGainNode.gain.value - 1) > 0.01) {
        this.levelGainNode.gain.setTargetAtTime(1, t, 0.2);
      }
      return;
    }
    if (!this.levelBuf || this.levelBuf.length !== this.analyserNode.fftSize) {
      this.levelBuf = new Float32Array(this.analyserNode.fftSize);
    }
    this.analyserNode.getFloatTimeDomainData(this.levelBuf);
    let sum = 0;
    for (let i = 0; i < this.levelBuf.length; i++) sum += this.levelBuf[i] * this.levelBuf[i];
    const rms = Math.sqrt(sum / this.levelBuf.length);
    const levelDb = 20 * Math.log10(rms + 1e-6);
    const err = LEVEL_TARGET_DB - levelDb;
    if (Math.abs(err) < 1) return;
    const stepDb = Math.min(2, Math.max(-2, err)) / 2;
    const cur = this.levelGainNode.gain.value;
    const next = Math.min(LEVEL_MAX_GAIN, Math.max(LEVEL_MIN_GAIN, cur * Math.pow(10, stepDb / 20)));
    this.levelGainNode.gain.setTargetAtTime(next, t, 0.4);
  }

  private applyAudioFlavor(mode: AudioMode) {
    const audioEl = this.audio as any;
    this.updateEffectivePlaybackRate();

    if (mode === 'NORMAL') {
      if ('preservesPitch' in audioEl) audioEl.preservesPitch = true;
      if ('mozPreservesPitch' in audioEl) audioEl.mozPreservesPitch = true;
      if (this.dryGainNode) this.dryGainNode.gain.value = 1.0;
      if (this.wetGainNode) this.wetGainNode.gain.value = 0.0;
      this.applyBass();
    } else if (mode === 'SNR') {
      // SnR: custom slowed tempo + custom reverb send, pitched down
      if ('preservesPitch' in audioEl) audioEl.preservesPitch = false;
      if ('mozPreservesPitch' in audioEl) audioEl.mozPreservesPitch = false;
      if (this.dryGainNode) this.dryGainNode.gain.value = 0.85;
      if (this.wetGainNode) this.wetGainNode.gain.value = this.snrReverb * 0.9;
      this.applyBass();
    } else if (mode === 'NIGHTCORE') {
      // Nightcore: custom speed, pitched up with tempo, dry signal
      if ('preservesPitch' in audioEl) audioEl.preservesPitch = false;
      if ('mozPreservesPitch' in audioEl) audioEl.mozPreservesPitch = false;
      if (this.dryGainNode) this.dryGainNode.gain.value = 1.0;
      if (this.wetGainNode) this.wetGainNode.gain.value = 0.0;
      this.applyBass();
    }
    // Tone stack follows the flavor: pure in Normal, user-tuned otherwise.
    this.applyEq();
    this.applyBalance();
    this.applyTrim();
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




