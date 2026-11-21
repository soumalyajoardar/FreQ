import React, { useEffect, useRef, useState } from 'react';
import { Zap, X, Activity, Radio, Cpu, RotateCcw, AlertTriangle } from 'lucide-react';
import { GlassModal } from './FreqDialogs';
import { useExitTransition } from './useExitTransition';

interface VtslModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TECHNO_LOGS = [
  '[VTSL-CORE] Initializing Virtual Temporal Spectral Lattice (VTSL)...',
  '[QUANTUM-DSP] Engaging 768 kHz 64-bit float dither matrix...',
  '[PHASE] Baryonic jitter suppression locked at ±0.0001 ps.',
  '[ANALOG-EMU] Pre-heating 12AX7 vacuum tube virtual filaments...',
  '[FLUX] Harmonic resonance flux capacitor calibrated: 99.984% coherence.',
  '[CALIBRATION] Aligning sub-atomic tape saturation curve...',
  '[STATUS] High-Fi acoustic spatializer overclocked by 320%.',
  '[COSMIC] Filtering background cosmic radiation from audio stream...',
  '[NYQUIST] Folding imaginary frequencies across temporal fold...',
  '[MATRIX] NOTE: 100% Pure High-Fi aesthetic simulation. Zero audio harmed. LOL.',
  '[SUPER-CON] Cryogenic superconductivity simulated at 4.2 Kelvin.',
  '[HYSTERESIS] Magnetic domain flutter stabilized at 15 IPS.',
  '[HARMONICS] Third-order triode harmonics synthesized into ethereal spectrum.',
  '[AUDIO-VIBE] High-Fi status: LEGENDARY. Placebo coefficient: MAXIMAL.',
];

export const VtslModal: React.FC<VtslModalProps> = ({ isOpen, onClose }) => {
  const { visible, closing } = useExitTransition(isOpen, 180);
  const staticCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const oscCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [intensity, setIntensity] = useState<'NORMAL' | 'HIGH' | 'HYPER'>('HIGH');
  const [showStatic, setShowStatic] = useState(true);
  const [logs, setLogs] = useState<string[]>(TECHNO_LOGS.slice(0, 5));
  const [meterValues, setMeterValues] = useState<number[]>(() =>
    Array.from({ length: 24 }, () => Math.random())
  );
  const [ledStates, setLedStates] = useState<boolean[]>(() =>
    Array.from({ length: 8 }, () => Math.random() > 0.5)
  );

  // Animated Static Canvas
  useEffect(() => {
    if (!visible || !showStatic) return;
    const canvas = staticCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const width = 160;
    const height = 90;
    canvas.width = width;
    canvas.height = height;

    const imgData = ctx.createImageData(width, height);
    const buf32 = new Uint32Array(imgData.data.buffer);

    const render = () => {
      const len = buf32.length;
      for (let i = 0; i < len; i++) {
        // High-fi static noise with occasional scanline banding
        const noise = Math.random() < 0.03 ? 240 : Math.floor(Math.random() * 85);
        // RGBA (little endian ABGR)
        buf32[i] = (255 << 24) | (noise << 16) | ((noise + 15) << 8) | (noise + 10);
      }
      ctx.putImageData(imgData, 0, 0);
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [visible, showStatic]);

  // Animated Oscilloscope & Lissajous Canvas
  useEffect(() => {
    if (!visible) return;
    const canvas = oscCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = 'rgba(7, 10, 16, 0.28)';
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < w; x += 25) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y < h; y += 20) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      const speed = intensity === 'HYPER' ? 0.18 : intensity === 'HIGH' ? 0.09 : 0.05;
      phase += speed;

      // Primary cyan waveform
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 10;
      ctx.beginPath();

      const cy = h / 2;
      for (let x = 0; x < w; x += 3) {
        const normX = x / w;
        const wave1 = Math.sin(normX * 12 + phase) * (h * 0.22);
        const wave2 = Math.sin(normX * 28 - phase * 1.8) * (h * 0.1);
        const noise = (Math.random() - 0.5) * (intensity === 'HYPER' ? 18 : 6);
        const y = cy + wave1 + wave2 + noise;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Secondary magenta harmonic trace
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let x = 0; x < w; x += 4) {
        const normX = x / w;
        const wave = Math.cos(normX * 8 - phase * 1.2) * (h * 0.28);
        const flutter = (Math.random() - 0.5) * 5;
        const y = cy + wave + flutter;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [visible, intensity]);

  // Blinking LEDs & Fast VU Meters
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setMeterValues(prev =>
        prev.map(v => {
          const delta = (Math.random() - 0.48) * (intensity === 'HYPER' ? 0.45 : 0.25);
          return Math.min(1, Math.max(0.05, v + delta));
        })
      );
      setLedStates(prev => prev.map(() => Math.random() > 0.35));
    }, intensity === 'HYPER' ? 45 : intensity === 'HIGH' ? 80 : 130);

    return () => clearInterval(interval);
  }, [visible, intensity]);

  // Rolling techno babble logs
  useEffect(() => {
    if (!visible) return;
    const logInterval = setInterval(() => {
      const nextLog = TECHNO_LOGS[Math.floor(Math.random() * TECHNO_LOGS.length)];
      setLogs(prev => [...prev.slice(-6), nextLog]);
    }, 1200);

    return () => clearInterval(logInterval);
  }, [visible]);

  if (!visible) return null;

  return (
    <GlassModal onClose={onClose} maxWidth={640} closing={closing}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(34,211,238,0.25), rgba(236,72,153,0.25))',
              border: '1px solid rgba(34,211,238,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#22d3ee',
              boxShadow: '0 0 16px rgba(34,211,238,0.35)',
            }}
          >
            <Activity size={18} style={{ animation: 'freqSpin 4s linear infinite' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.08em', color: '#fff', margin: 0, textTransform: 'uppercase' }}>
                VTSL Hyper-Matrix
              </h3>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: 6,
                  background: 'rgba(34,211,238,0.18)',
                  color: '#22d3ee',
                  border: '1px solid rgba(34,211,238,0.3)',
                  letterSpacing: '0.06em',
                }}
              >
                SIMULATION
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, letterSpacing: '0.02em' }}>
              Virtual Temporal Spectral Lattice • Placebo High-Fi Calibration Unit
            </p>
          </div>
        </div>

        <button onClick={onClose} className="fq-icon-btn" aria-label="Close VTSL" style={{ width: 30, height: 30, borderRadius: 8 }}>
          <X size={16} />
        </button>
      </div>

      {/* Main High-Fi Display Deck */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Blinking Annunciator LEDs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            background: 'rgba(0, 0, 0, 0.45)',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {[
            { label: 'PHASE LOCK', color: '#22c55e', state: ledStates[0] },
            { label: 'QUANTUM FLUX', color: '#22d3ee', state: ledStates[1] },
            { label: 'TUBE WARMTH', color: '#f59e0b', state: ledStates[2] },
            { label: 'DE-JITTER', color: '#a855f7', state: ledStates[3] },
            { label: 'HARMONIC 432', color: '#ec4899', state: ledStates[4] },
            { label: 'LATTICE DITHER', color: '#06b6d4', state: ledStates[5] },
            { label: 'CRYOGENIC', color: '#38bdf8', state: ledStates[6] },
            { label: 'OVERDRIVE', color: '#ef4444', state: ledStates[7] },
          ].map((led, i) => (
            <div
              key={led.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 10.5,
                fontWeight: 700,
                color: led.state ? '#fff' : 'rgba(255,255,255,0.3)',
                letterSpacing: '0.05em',
              }}
            >
              <div
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  backgroundColor: led.state ? led.color : 'rgba(255,255,255,0.1)',
                  boxShadow: led.state ? `0 0 10px ${led.color}, 0 0 4px #fff` : 'none',
                  transition: 'background-color 0.08s ease, box-shadow 0.08s ease',
                }}
              />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{led.label}</span>
            </div>
          ))}
        </div>

        {/* Oscilloscope + Static CRT Screen */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 10 }}>
          {/* Oscilloscope */}
          <div
            style={{
              position: 'relative',
              height: 140,
              background: '#070a10',
              borderRadius: 10,
              overflow: 'hidden',
              border: '1px solid rgba(34,211,238,0.25)',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8), 0 0 15px rgba(34,211,238,0.12)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 6,
                left: 9,
                fontSize: 9.5,
                fontWeight: 800,
                letterSpacing: '0.1em',
                color: 'rgba(34,211,238,0.7)',
                zIndex: 2,
                textTransform: 'uppercase',
              }}
            >
              OSCILLOSCOPE • 192 kHz VIRTUAL PROBE
            </div>
            <canvas ref={oscCanvasRef} width={340} height={140} style={{ width: '100%', height: '100%', display: 'block' }} />
          </div>

          {/* Analog TV Static Tube */}
          <div
            style={{
              position: 'relative',
              height: 140,
              background: '#040608',
              borderRadius: 10,
              overflow: 'hidden',
              border: '1px solid rgba(236,72,153,0.25)',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8), 0 0 15px rgba(236,72,153,0.12)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 6,
                left: 9,
                fontSize: 9.5,
                fontWeight: 800,
                letterSpacing: '0.1em',
                color: 'rgba(236,72,153,0.8)',
                zIndex: 2,
                textTransform: 'uppercase',
              }}
            >
              STATIC NOISE TUBE
            </div>
            {showStatic ? (
              <canvas
                ref={staticCanvasRef}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  filter: 'contrast(160%) brightness(120%)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  fontSize: 11,
                }}
              >
                STATIC DISABLED
              </div>
            )}
          </div>
        </div>

        {/* 24-Band Animated VU Light Racks */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.45)',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            <span>SPECTRAL DENSITY MATRIX (32 Hz – 48 kHz)</span>
            <span style={{ color: '#22d3ee' }}>SIMULATED HARMONIC PEAK: +8.4 dB</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${meterValues.length}, 1fr)`, gap: 3, height: 48, alignItems: 'flex-end' }}>
            {meterValues.map((val, idx) => {
              const heightPct = Math.round(val * 100);
              const color =
                heightPct > 85
                  ? '#ef4444'
                  : heightPct > 70
                  ? '#f59e0b'
                  : heightPct > 40
                  ? '#22d3ee'
                  : '#10b981';
              return (
                <div
                  key={idx}
                  style={{
                    height: '100%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'flex-end',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: `${heightPct}%`,
                      backgroundColor: color,
                      boxShadow: `0 0 6px ${color}`,
                      transition: 'height 0.06s ease',
                      borderRadius: 2,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Real-time Techno-Babble Terminal */}
        <div
          style={{
            background: '#05070a',
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid rgba(255, 255, 255, 0.06)',
            fontFamily: 'monospace',
            fontSize: 10.5,
            color: '#22d3ee',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            maxHeight: 75,
            overflowY: 'hidden',
          }}
        >
          {logs.map((log, i) => (
            <div key={i} style={{ opacity: i === logs.length - 1 ? 1 : 0.65 + i * 0.07, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {log}
            </div>
          ))}
        </div>

        {/* Simulation Controls & LOL Disclaimer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 4 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="fq-btn fq-btn-ghost"
              style={{ fontSize: 11, padding: '5px 10px' }}
              onClick={() => {
                const modes: ('NORMAL' | 'HIGH' | 'HYPER')[] = ['NORMAL', 'HIGH', 'HYPER'];
                const next = modes[(modes.indexOf(intensity) + 1) % modes.length];
                setIntensity(next);
              }}
            >
              <Zap size={12} color="#22d3ee" />
              Warp: {intensity}
            </button>
            <button
              className="fq-btn fq-btn-ghost"
              style={{ fontSize: 11, padding: '5px 10px' }}
              onClick={() => setShowStatic(s => !s)}
            >
              <Radio size={12} color="#ec4899" />
              Static: {showStatic ? 'ON' : 'OFF'}
            </button>
          </div>

          <button onClick={onClose} className="fq-btn fq-btn-primary" style={{ padding: '6px 16px', fontSize: 12 }}>
            Disengage VTSL
          </button>
        </div>
      </div>
    </GlassModal>
  );
};
