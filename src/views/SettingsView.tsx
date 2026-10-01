import React from 'react';
import { Volume2, Sparkles, HardDrive, ShieldCheck } from 'lucide-react';
import { AudioMode } from '../types';
import { audioEngine } from '../services/audioEngine';
import { libraryStore } from '../services/libraryStore';
import freqIcon from '../assets/freq-icon.png';
import { FlatScrubber } from '../components/FlatScrubber';

const FlavorSlider: React.FC<{
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  minLabel?: string;
  maxLabel?: string;
}> = ({ label, valueLabel, min, max, step, value, onChange, minLabel, maxLabel }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
        {label}
      </span>
      <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
        {valueLabel}
      </span>
    </div>
    <FlatScrubber
      value={value}
      max={max}
      step={step}
      height={5}
      ariaLabel={label}
      onSeek={onChange}
    />
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
      <span>{minLabel ?? `${min.toFixed(2)}x`}</span>
      <span>{maxLabel ?? `${max.toFixed(2)}x`}</span>
    </div>
  </div>
);

interface SettingsViewProps {
  audioMode: AudioMode;
  onAudioModeChange: (mode: AudioMode) => void;
  likedCount: number;
  playlistCount: number;
  historyCount: number;
  onClearHistory: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  audioMode,
  onAudioModeChange,
  likedCount,
  playlistCount,
  historyCount,
  onClearHistory,
}) => {
  const [snrRate, setSnrRate] = React.useState(() => audioEngine.getSnrRate());
  const [snrReverb, setSnrReverb] = React.useState(() => audioEngine.getSnrReverb());
  const [nightcoreRate, setNightcoreRate] = React.useState(() => audioEngine.getNightcoreRate());
  const [bassBoost, setBassBoost] = React.useState(() => audioEngine.getBassBoost());
  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '800px' }} className="view-enter">
      <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)' }}>
        Settings & Audio Engine
      </h1>

      {/* Audio Engine Configuration */}
      <section
        style={{
          borderRadius: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Volume2 size={20} color="#fff" />
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Custom Audio Flavors
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Tune each flavor below. Switch flavors from the player or sidebar:
          </span>

          {/* Custom SnR sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '6px' }}>
            <FlavorSlider
              label="Slowed tempo"
              valueLabel={`${snrRate.toFixed(1)}x`}
              min={0.5}
              max={1.0}
              step={0.1}
              value={snrRate}
              onChange={v => {
                setSnrRate(v);
                audioEngine.setSnrRate(v);
                libraryStore.setSnrRate(v);
              }}
            />
            <FlavorSlider
              label="Reverb amount"
              valueLabel={`${Math.round(snrReverb * 100)}%`}
              min={0}
              max={1}
              step={0.1}
              minLabel="Dry"
              maxLabel="Wet"
              value={snrReverb}
              onChange={v => {
                setSnrReverb(v);
                audioEngine.setSnrReverb(v);
                libraryStore.setSnrReverb(v);
              }}
            />
            <FlavorSlider
              label="Nightcore speed"
              valueLabel={`${nightcoreRate.toFixed(1)}x`}
              min={1.0}
              max={1.5}
              step={0.1}
              value={nightcoreRate}
              onChange={v => {
                setNightcoreRate(v);
                audioEngine.setNightcoreRate(v);
                libraryStore.setNightcoreRate(v);
              }}
            />
            <FlavorSlider
              label="Bass booster"
              valueLabel={bassBoost <= 0 ? 'Off' : `+${Math.round(bassBoost * 12)} dB`}
              min={0}
              max={1}
              step={0.1}
              minLabel="Off"
              maxLabel="+12 dB"
              value={bassBoost}
              onChange={v => {
                setBassBoost(v);
                audioEngine.setBassBoost(v);
                libraryStore.setBassBoost(v);
              }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Sliders tune SnR and Nightcore. Normal always plays pure 1.0x —
              unaltered. Bass boost applies to SnR and Nightcore only.
            </span>
          </div>
        </div>
      </section>

      {/* Local Storage & Privacy */}
      <section
        style={{
          borderRadius: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <HardDrive size={20} color="var(--accent-violet)" />
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Data & Privacy
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '24px' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{likedCount}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Liked Songs</div>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{playlistCount}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Playlists</div>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{historyCount}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Listening History</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} color="var(--accent-teal)" />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            All library items and preferences live entirely on this machine in <code>freq_library.json</code>.
          </span>
        </div>

        <button
          onClick={onClearHistory}
          style={{
            alignSelf: 'flex-start',
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#ef4444',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          Clear Listening & Search History
        </button>
      </section>

      {/* About FreQ */}
      <section
        style={{
          borderRadius: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={freqIcon}
            alt="FreQ"
            style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.12)' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
              About FreQ Desktop
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Version v1.3 Stable. Made by GRESSEY & OPENCODE. All rights reserved.
            </span>
          </div>
        </div>

        <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
          FreQ is free software licensed under GPL v3.0. A music app that simply respects you:
          no ads, no subscriptions, no accounts, and no tracking. Your library never leaves your device.
        </p>
      </section>
    </div>
  );
};
