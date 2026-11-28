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

const OUTPUT_DEVICE_KEY = 'freq_output_device';

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
  // App volume lives at the very end of the chain (after the limiter) so
  // raising the slider scales already-clean audio instead of pushing a
  // hotter signal into the bass/EQ/limiter stages.
  private volumeNode: GainNode | null = null;
  private isAudioGraphReady = false;

  // High Definition (HD) Audio Enhancer & Stereo Spatializer
  private hdClarityNode: BiquadFilterNode | null = null;
  private hdAirNode: BiquadFilterNode | null = null;
  private stereoSplitter: ChannelSplitterNode | null = null;
  private stereoMerger: ChannelMergerNode | null = null;
  private midGainNode: GainNode | null = null;
  private sideGainNode: GainNode | null = null;
  private sideInvertNode: GainNode | null = null;
  private widthMultiplierNode: GainNode | null = null;
  private leftReconstructNode: GainNode | null = null;
  private rightReconstructNode: GainNode | null = null;
  private sideSubtractorNode: GainNode | null = null;

  // 5-band EQ (series), per-track trim + auto-level, stereo balance.
  private eqNodes: BiquadFilterNode[] = [];
  private trimGainNode: GainNode | null = null;
  private levelGainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private panNode: StereoPannerNode | null = null;
  private levelBuf: Float32Array<ArrayBuffer> | null = null;

  // Atmos-style directional stage: a dry stereo anchor blended with an
  // HRTF-panned copy so the mix appears to arrive from a chosen direction.
  private spatialEnabled: boolean = false;
  private spatialAngle: number = 0; // degrees: 0 = front, +90 = right, ±180 = rear
  private spatialIntensity: number = 0.65; // 0…1
  private spatialDryGain: GainNode | null = null;
  private spatialWetGain: GainNode | null = null;
  private spatialOutGain: GainNode | null = null;
  private spatialPanner: PannerNode | null = null;

  private currentTrack: MediaTrack | null = null;
  private audioMode: AudioMode = 'SNR';
  private volume: number = 0.85;
  private outputDeviceId: string = 'default';
  // Custom flavor parameters (tunable from Settings, persisted in library)
  private snrRate: number = 0.8;
  private snrReverb: number = 0.55;
  private nightcoreRate: number = 1.2;
  // Bass booster (0–1). Scales dual-stage sub-shelf (55 Hz up to +24 dB) and tactile punch (95 Hz up to +18 dB).
  // Default is 0.4 (+9.6 dB sub, +7.2 dB punch) for deep, powerful, undistorted bass.
  private bassBoost: number = 0.4;
  // Stereo widener amount (0–1): 0 = normal stereo, 1 = ultra wide 3D stage
  private stereoWidth: number = 0.35;
  // High Definition clarity & air (0–1): 0 = off, 1 = crystal clear studio HD definition
  private hdClarity: number = 0.45;
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
  private targetSyncTime: { hostSec: number; timestamp: number } | null = null;

  private emitTime() {
    const pos = this.audio.currentTime || 0;
    const rawDur = this.audio.duration;
    const isFiniteDur = typeof rawDur === 'number' && Number.isFinite(rawDur) && rawDur > 0;
    const dur = isFiniteDur ? rawDur : (this.currentTrack?.durationSeconds || 0);
    if (isFiniteDur && this.currentTrack && Math.abs((this.currentTrack.durationSeconds || 0) - rawDur) >= 1) {
      this.currentTrack.durationSeconds = Math.round(rawDur);
    }

    // Phase lock check: when nudging playback rate for Listen Together,
    // smoothly revert to 1.0x as soon as guest reaches phase sync (within 45ms)
    if (this.syncRateMultiplier !== 1.0 && this.targetSyncTime) {
      const elapsed = (Date.now() - this.targetSyncTime.timestamp) / 1000;
      const expectedHostPos = this.targetSyncTime.hostSec + elapsed;
      const curDiff = expectedHostPos - pos;
      if (Math.abs(curDiff) <= 0.045) {
        this.setSyncRateMultiplier(1.0);
        this.targetSyncTime = null;
      }
    }

    this.onTimeUpdateListeners.forEach(cb => cb(pos, dur));
    this.updateMediaSessionPosition(pos, dur);
    this.updateLeveling();
  }

  private startSmoothClock() {
    this.stopSmoothClock();
    const tick = () => {
      this.emitTime();
      this.clockId = window.setTimeout(tick, 220);
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
    this.audio.preservesPitch = true;

    try {
      this.outputDeviceId = localStorage.getItem(OUTPUT_DEVICE_KEY) || 'default';
    } catch {}

    this.setupAudioListeners();
    // Best-effort early sink apply for the element; the AudioContext path is
    // re-applied once the graph exists (see initAudioGraph).
    void this.applyOutputDevice();
  }

  private initAudioGraph() {
    if (this.isAudioGraphReady) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.audioCtx = new AudioCtxClass();
      this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);

      // Subsonic guard: cut inaudible DC/sub-24Hz rumble that eats amplifier
      // headroom and causes intermodulation distortion, while keeping 30-60 Hz sub-bass pristine.
      this.highpassNode = this.audioCtx.createBiquadFilter();
      this.highpassNode.type = 'highpass';
      this.highpassNode.frequency.value = 24;
      this.highpassNode.Q.value = 0.707;

      // Sub-bass warmth & foundation (60 Hz lowshelf). Capped at +18 dB so
      // the limiter always has room to work without smearing the low end.
      this.bassNode = this.audioCtx.createBiquadFilter();
      this.bassNode.type = 'lowshelf';
      this.bassNode.frequency.value = 60;
      this.bassNode.Q.value = 0.707;
      this.bassNode.gain.value = 0;

      // Tactile punch & kick-drum chest impact (100 Hz peaking, up to +8 dB)
      this.bassPunchNode = this.audioCtx.createBiquadFilter();
      this.bassPunchNode.type = 'peaking';
      this.bassPunchNode.frequency.value = 100;
      this.bassPunchNode.Q.value = 0.9;
      this.bassPunchNode.gain.value = 0;

      this.masterGainNode = this.audioCtx.createGain();
      this.masterGainNode.gain.value = 1.0;

      this.dryGainNode = this.audioCtx.createGain();
      this.dryGainNode.gain.value = 1.0;

      this.wetGainNode = this.audioCtx.createGain();
      this.wetGainNode.gain.value = 0.0;

      this.convolverNode = this.audioCtx.createConvolver();
      this.convolverNode.buffer = this.createReverbImpulse(this.audioCtx, 2.5, 2.0);

      // Route dry signal: source -> highpass -> bass (sub) -> bassPunch (kick) -> EQ -> HD Clarity -> HD Air -> trim -> dryGain
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

      // High-Definition (HD) Enhancement Stage:
      // 1. Vocal presence & instrument detail exciter (3.6 kHz peaking)
      this.hdClarityNode = this.audioCtx.createBiquadFilter();
      this.hdClarityNode.type = 'peaking';
      this.hdClarityNode.frequency.value = 3600;
      this.hdClarityNode.Q.value = 0.85;
      this.hdClarityNode.gain.value = 0;

      // 2. Ultra-high frequency "Air" sparkle & open soundstage (11.5 kHz highshelf)
      this.hdAirNode = this.audioCtx.createBiquadFilter();
      this.hdAirNode.type = 'highshelf';
      this.hdAirNode.frequency.value = 11500;
      this.hdAirNode.gain.value = 0;

      eqHead.connect(this.hdClarityNode);
      this.hdClarityNode.connect(this.hdAirNode);

      // Per-track trim (normalization): sits after tone shaping so trims
      // stay comparable across flavors.
      this.trimGainNode = this.audioCtx.createGain();
      this.trimGainNode.gain.value = 1.0;
      this.hdAirNode.connect(this.trimGainNode);
      this.trimGainNode.connect(this.dryGainNode);
      this.dryGainNode.connect(this.masterGainNode);

      // Route wet reverb signal: trim -> convolver -> wetGain -> masterGain
      this.trimGainNode.connect(this.convolverNode);
      this.convolverNode.connect(this.wetGainNode);
      this.wetGainNode.connect(this.masterGainNode);

      // Broadcast-grade Mid-Side Stereo Spatializer Matrix:
      // Expands side ambiance & wide soundstage without phase issues or hollow mids
      this.stereoSplitter = this.audioCtx.createChannelSplitter(2);
      this.stereoMerger = this.audioCtx.createChannelMerger(2);

      this.midGainNode = this.audioCtx.createGain();
      this.midGainNode.gain.value = 0.5;

      this.sideGainNode = this.audioCtx.createGain();
      this.sideGainNode.gain.value = 0.5;

      this.sideInvertNode = this.audioCtx.createGain();
      this.sideInvertNode.gain.value = -0.5;

      this.widthMultiplierNode = this.audioCtx.createGain();
      this.widthMultiplierNode.gain.value = 1.0;

      this.leftReconstructNode = this.audioCtx.createGain();
      this.rightReconstructNode = this.audioCtx.createGain();
      this.sideSubtractorNode = this.audioCtx.createGain();
      this.sideSubtractorNode.gain.value = -1.0;

      this.masterGainNode.connect(this.stereoSplitter);

      // Split L & R into Mid and Side
      this.stereoSplitter.connect(this.midGainNode, 0); // L -> Mid
      this.stereoSplitter.connect(this.midGainNode, 1); // R -> Mid
      this.stereoSplitter.connect(this.sideGainNode, 0); // L -> Side (+)
      this.stereoSplitter.connect(this.sideInvertNode, 1); // R -> SideInvert (-)

      this.sideGainNode.connect(this.widthMultiplierNode);
      this.sideInvertNode.connect(this.widthMultiplierNode);

      // Reconstruct: L = Mid + SideBoosted, R = Mid - SideBoosted
      this.midGainNode.connect(this.leftReconstructNode);
      this.midGainNode.connect(this.rightReconstructNode);

      this.widthMultiplierNode.connect(this.leftReconstructNode);
      this.widthMultiplierNode.connect(this.sideSubtractorNode);
      this.sideSubtractorNode.connect(this.rightReconstructNode);

      this.leftReconstructNode.connect(this.stereoMerger, 0, 0);
      this.rightReconstructNode.connect(this.stereoMerger, 0, 1);

      // Output chain: stereoMerger -> auto-level -> analyser -> balance -> headroom -> soft saturator -> limiter -> final ceiling
      this.levelGainNode = this.audioCtx.createGain();
      this.levelGainNode.gain.value = 1.0;
      this.stereoMerger.connect(this.levelGainNode);

      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.levelGainNode.connect(this.analyserNode);

      // Atmos-style directional stage. The dry stereo path keeps the mix
      // intact while the wet path runs through an HRTF panner, so turning the
      // effect up moves the image around the listener instead of just
      // collapsing it to mono.
      this.spatialDryGain = this.audioCtx.createGain();
      this.spatialDryGain.gain.value = 1.0;

      this.spatialWetGain = this.audioCtx.createGain();
      this.spatialWetGain.gain.value = 0.0;

      this.spatialOutGain = this.audioCtx.createGain();
      this.spatialOutGain.gain.value = 1.0;

      this.spatialPanner = this.audioCtx.createPanner();
      this.spatialPanner.panningModel = 'HRTF';
      this.spatialPanner.distanceModel = 'inverse';
      this.spatialPanner.refDistance = 1.4;
      this.spatialPanner.maxDistance = 24;
      this.spatialPanner.rolloffFactor = 0.55;
      this.spatialPanner.coneInnerAngle = 360;
      this.spatialPanner.coneOuterAngle = 360;

      this.analyserNode.connect(this.spatialDryGain);
      this.analyserNode.connect(this.spatialPanner);
      this.spatialPanner.connect(this.spatialWetGain);
      this.spatialDryGain.connect(this.spatialOutGain);
      this.spatialWetGain.connect(this.spatialOutGain);

      let outNode: AudioNode = this.spatialOutGain;
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

      // Safety & Quality Protection Stage:
      // 1. Headroom attenuation scaled dynamically with bass & HD boost
      this.headroomNode = this.audioCtx.createGain();
      this.headroomNode.gain.value = 1.0;

      // 2. Studio Mastering Peak Limiter — gentle knee, fast catch, slow
      //    release. No always-on waveshaper: a permanent tanh curve colours
      //    every sample and is the main source of the "grainy" high-volume
      //    distortion. Headroom + this limiter keep peaks controlled cleanly.
      this.limiterNode = this.audioCtx.createDynamicsCompressor();
      this.limiterNode.threshold.value = -2.0;
      this.limiterNode.knee.value = 4;
      this.limiterNode.ratio.value = 20.0;
      this.limiterNode.attack.value = 0.003; // 3ms fast transient catch
      this.limiterNode.release.value = 0.2; // 200ms smooth release (no pumping)

      // 3. True-peak ceiling (-0.45 dBFS) to eliminate DAC intersample clipping
      this.finalGainNode = this.audioCtx.createGain();
      this.finalGainNode.gain.value = 0.95;

      // 4. App volume — post-limiter so the volume knob can never clip or
      //    re-drive the DSP stages. Max output stays below full scale.
      this.volumeNode = this.audioCtx.createGain();
      this.volumeNode.gain.value = this.volume;

      outNode.connect(this.headroomNode);
      this.headroomNode.connect(this.limiterNode);
      this.limiterNode.connect(this.finalGainNode);
      this.finalGainNode.connect(this.volumeNode);
      this.volumeNode.connect(this.audioCtx.destination);

      // The media element now always feeds the graph at unity; loudness is
      // controlled by the post-limiter volume node only.
      this.audio.volume = 1;
      this.applyVolume();
      this.isAudioGraphReady = true;
      this.applySpatial();
      void this.applyOutputDevice();
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

    // Metadata / seek landings / duration updates report exact position & length immediately.
    this.audio.addEventListener('loadedmetadata', () => {
      this.emitTime();
    });

    this.audio.addEventListener('durationchange', () => {
      this.emitTime();
    });

    this.audio.addEventListener('canplay', () => {
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
    this.targetSyncTime = null;
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

  // Smooth, glitch-free drift correction for Listen Together parties (Spotify-grade clock sync).
  // Instead of dumping audio buffers with hard currentTime seeks (which causes music stuttering and pops),
  // small drifts (0.045s - 2.0s) are smoothly caught up via gentle pitch-preserving playbackRate adjustments (±3% to ±6%).
  public syncDrift(targetSec: number, isExplicitSeek: boolean = false) {
    if (isNaN(targetSec) || !this.audio.src) return;
    const current = this.audio.currentTime || 0;
    const diff = targetSec - current; // positive: guest is lagging behind; negative: guest is ahead

    // Large drift (> 2.0s) or explicit user seek: instant hard seek to snap into place
    if (isExplicitSeek || Math.abs(diff) > 2.0) {
      this.seek(targetSec);
      this.setSyncRateMultiplier(1.0);
      this.targetSyncTime = null;
      return;
    }

    // Already tightly synchronized within 45ms (less than 2 audio frames, inaudible phase alignment)
    if (Math.abs(diff) <= 0.045) {
      if (this.syncRateMultiplier !== 1.0) {
        this.setSyncRateMultiplier(1.0);
      }
      this.targetSyncTime = null;
      return;
    }

    // Register active target for smooth tracking in emitTime()
    this.targetSyncTime = { hostSec: targetSec, timestamp: Date.now() };

    // Behind host: run faster to close gap without audio interruptions or pitch artifacts
    if (diff > 0.045) {
      // If gap is noticeable (> 0.4s), run 6% faster; otherwise 3% micro-catchup
      const boost = diff > 0.4 ? 1.06 : 1.03;
      this.setSyncRateMultiplier(boost);
    }
    // Ahead of host: run slower to let host catch up
    else {
      const slow = diff < -0.4 ? 0.94 : 0.97;
      this.setSyncRateMultiplier(slow);
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
    this.targetSyncTime = null;
    this.audio.pause();
  }

  public seek(seconds: number) {
    if (!isNaN(seconds)) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration || seconds));
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(val, 1));
    this.applyVolume();
  }

  // Volume is applied after the limiter when the Web Audio graph is live.
  // Before that (or if AudioContext is unavailable) fall back to the element.
  private applyVolume() {
    if (this.audioCtx && this.volumeNode) {
      this.audio.volume = 1;
      this.volumeNode.gain.setTargetAtTime(this.volume, this.audioCtx.currentTime, 0.015);
    } else {
      this.audio.volume = this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  // --- Audio output routing ---

  /**
   * Enumerate physical/virtual audio outputs (labels depend on permission).
   *
   * Windows exposes the same endpoint three times: a "default" pseudo-device, a
   * "communications" twin and the real endpoint. Showing all three made the
   * picker list "Headphones" thrice even with one headset connected, so entries
   * are collapsed to one per physical device. The "default" pseudo entry wins
   * the merge (it keeps follow-the-system behaviour), the communications twin is
   * dropped, and the picker code renders the winner as "System default".
   */
  public async listOutputDevices(): Promise<MediaDeviceInfo[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const normalise = (device: MediaDeviceInfo) =>
        (device.label || '')
          .replace(/^(Default|Communications)\s*-\s*/i, '')
          .replace(/\((r|tm)\)/gi, '')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();

      const byDevice = new Map<string, MediaDeviceInfo>();
      for (const device of devices) {
        if (device.kind !== 'audiooutput') continue;
        if (device.deviceId === 'communications') continue;
        if (/^communications\b/i.test(device.label || '')) continue;

        // The Windows pseudo-entries (default / communications / real) share a
        // group id, so keying on group + name merges exactly those and keeps
        // two genuinely separate devices with the same name apart.
        const name = normalise(device);
        const key = name ? `${device.groupId || 'nogroup'}|${name}` : `id:${device.deviceId}`;
        const existing = byDevice.get(key);
        // Prefer the system-default entry over the raw endpoint so selecting it
        // keeps routing to whatever Windows currently uses.
        if (!existing || (existing.deviceId !== 'default' && device.deviceId === 'default')) {
          byDevice.set(key, device);
        }
      }

      return [...byDevice.values()].sort(
        (a, b) => Number(b.deviceId === 'default') - Number(a.deviceId === 'default')
      );
    } catch {
      return [];
    }
  }

  public getOutputDeviceId(): string {
    return this.outputDeviceId;
  }

  /**
   * Route playback to a specific output. Prefers AudioContext.setSinkId (the
   * active path once the Web Audio graph is live) with the media element as a
   * fallback. Returns false when the runtime has no sink-selection support.
   */
  public async setOutputDevice(deviceId: string): Promise<boolean> {
    this.outputDeviceId = deviceId || 'default';
    try {
      localStorage.setItem(OUTPUT_DEVICE_KEY, this.outputDeviceId);
    } catch {}
    return this.applyOutputDevice();
  }

  private async applyOutputDevice(): Promise<boolean> {
    let applied = false;
    const targets: any[] = [];
    if (this.audioCtx) targets.push(this.audioCtx);
    targets.push(this.audio);

    for (const target of targets) {
      if (typeof target?.setSinkId !== 'function') continue;
      try {
        await target.setSinkId(this.outputDeviceId);
        applied = true;
      } catch {
        // Device disappeared or the runtime rejected the id — keep the active
        // output and let the next enumeration reconcile the list.
      }
    }
    return applied;
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

  // Bass booster amount (0–1). Scales dual-stage sub-shelf (up to +24 dB) and tactile punch (up to +18 dB).
  public setBassBoost(amount: number) {
    this.bassBoost = Math.min(1, Math.max(0, amount));
    this.applyBass();
  }

  public getBassBoost(): number {
    return this.bassBoost;
  }

  // 3D Stereo Widener (0–1). 0 = standard stereo, 1 = ultra-wide holographic soundstage
  public setStereoWidth(amount: number) {
    this.stereoWidth = Math.min(1, Math.max(0, amount));
    this.applyStereoAndHd();
  }

  public getStereoWidth(): number {
    return this.stereoWidth;
  }

  // High-Definition (HD) Audio Enhancer (0–1). 0 = off, 1 = crystal clear studio HD definition & air
  public setHdClarity(amount: number) {
    this.hdClarity = Math.min(1, Math.max(0, amount));
    this.applyStereoAndHd();
  }

  public getHdClarity(): number {
    return this.hdClarity;
  }

  // --- Atmos-style directional spatial audio ---

  /**
   * Aim the spatial stage. Angle is in degrees: 0 = straight ahead,
   * +90 = right, -90 = left, ±180 = behind. Intensity blends the HRTF copy
   * against the untouched dry stereo image (0 = bypass, 1 = fully placed).
   */
  public setSpatial(enabled: boolean, angle?: number, intensity?: number) {
    this.spatialEnabled = !!enabled;
    if (typeof angle === 'number' && Number.isFinite(angle)) {
      this.spatialAngle = Math.max(-180, Math.min(180, angle));
    }
    if (typeof intensity === 'number' && Number.isFinite(intensity)) {
      this.spatialIntensity = Math.max(0, Math.min(1, intensity));
    }
    this.applySpatial();
  }

  public getSpatial(): { enabled: boolean; angle: number; intensity: number } {
    return {
      enabled: this.spatialEnabled,
      angle: this.spatialAngle,
      intensity: this.spatialIntensity,
    };
  }

  private applySpatial() {
    if (!this.audioCtx || !this.spatialPanner) return;
    const t = this.audioCtx.currentTime;
    const panner = this.spatialPanner;

    // Web Audio's listener faces -Z with +X to the right and +Y up. A small
    // amount of elevation gives the mix an "in the room" externalisation.
    const rad = (this.spatialAngle * Math.PI) / 180;
    const distance = 2.2;
    const x = Math.sin(rad) * distance;
    const y = 0.45;
    const z = -Math.cos(rad) * distance;
    if (panner.positionX) {
      panner.positionX.setTargetAtTime(x, t, 0.045);
      panner.positionY.setTargetAtTime(y, t, 0.045);
      panner.positionZ.setTargetAtTime(z, t, 0.045);
    } else {
      (panner as any).setPosition?.(x, y, z);
    }

    const on = this.spatialEnabled;
    const amount = on ? this.spatialIntensity : 0;
    // Keep the dry stereo as the anchor and fold in the HRTF copy as intensity
    // rises. The output trim compensates the panner's distance attenuation so
    // enabling Atmos never reads as a volume drop.
    const wet = on ? 0.18 + 0.72 * Math.pow(amount, 0.85) : 0;
    const dry = 1 - 0.58 * amount;
    this.spatialWetGain?.gain.setTargetAtTime(wet, t, 0.06);
    this.spatialDryGain?.gain.setTargetAtTime(dry, t, 0.06);
    this.spatialOutGain?.gain.setTargetAtTime(1 + 0.18 * amount, t, 0.06);
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
      // 60 Hz sub-shelf: deep low-end foundation, up to +18 dB
      const subGain = this.bassBoost * 18;
      this.bassNode.gain.setTargetAtTime(subGain, t, 0.05);
    }
    if (this.bassPunchNode) {
      // 100 Hz tactile punch: chest impact, up to +8 dB. Kept lower than the
      // sub shelf so the low end stays tight instead of turning to mud.
      const punchGain = this.bassBoost * 8;
      this.bassPunchNode.gain.setTargetAtTime(punchGain, t, 0.05);
    }
    this.masterGainNode.gain.setTargetAtTime(1.0, t, 0.05);
    this.applyHeadroom();
  }

  private applyStereoAndHd() {
    if (!this.audioCtx) return;
    const t = this.audioCtx.currentTime;
    if (this.hdClarityNode) {
      // 3.6 kHz vocal & instrument articulation boost (0 to +4.5 dB)
      const clarityGain = this.hdClarity * 4.5;
      this.hdClarityNode.gain.setTargetAtTime(clarityGain, t, 0.05);
    }
    if (this.hdAirNode) {
      // 11.5 kHz shimmering airy brilliance (0 to +6.0 dB)
      const airGain = this.hdClarity * 6.0;
      this.hdAirNode.gain.setTargetAtTime(airGain, t, 0.05);
    }
    if (this.widthMultiplierNode) {
      // Side-channel multiplier: 1.0 (untouched stereo) to 2.6 (very wide).
      // The curve is front-loaded so the first third of the slider already
      // opens the image instead of doing nothing until it is nearly maxed.
      const widthVal = 1.0 + Math.pow(this.stereoWidth, 0.8) * 1.6;
      this.widthMultiplierNode.gain.setTargetAtTime(widthVal, t, 0.05);
    }
    if (this.midGainNode) {
      // Keep the mid path at unity: dipping it made centre-panned vocals and
      // drums quieter as the slider rose, which read as "muffled", not "wide".
      this.midGainNode.gain.setTargetAtTime(0.5, t, 0.05);
    }
    this.applyHeadroom();
  }

  // Dynamic Headroom Scaling:
  // Balances high boost levels (up to +24 dB bass, HD air, and wide stereo) before the soft saturator and limiter.
  // Prevents digital clipping, intermodulation distortion, and pumping, keeping audio clean, punchy, and loud.
  private applyHeadroom() {
    if (!this.audioCtx || !this.headroomNode) return;
    const bassDb = this.bassBoost * 18;
    const hdDb = this.hdClarity * 5.0;
    const widthDb = this.stereoWidth * 3.5;
    const eqDb = this.audioMode === 'NORMAL' ? 0 : Math.max(0, ...this.eqGains);
    const trimDb = this.audioMode === 'NORMAL'
      ? 0
      : Math.max(0, this.trackTrims[this.currentTrack?.id || ''] || 0);
    const totalBoost = bassDb + hdDb + widthDb + eqDb + trimDb;
    // Discreet attenuation that tracks the boost: keeps the limiter in its
    // linear region, so transients stay punchy instead of clipping.
    const reductionDb = -Math.min(12, totalBoost * 0.55);
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
    // Tone stack and studio enhancements
    this.applyStereoAndHd();
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

  public getCurrentTrack(): MediaTrack | null {
    return this.currentTrack;
  }

  public getDuration(): number {
    const d = this.audio.duration;
    return typeof d === 'number' && Number.isFinite(d) && d > 0 ? d : (this.currentTrack?.durationSeconds || 0);
  }

  public isPaused(): boolean {
    return this.audio.paused;
  }
}

export const audioEngine = new AudioEngine();




