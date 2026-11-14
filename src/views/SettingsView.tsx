import React from 'react';
import { Volume2, Sparkles, HardDrive, ShieldCheck, DownloadCloud, RefreshCw, CheckCircle2, AlarmClock, FileUp, FileDown, Copy, Globe2, Keyboard } from 'lucide-react';
import { AudioMode, UserPlaylist, DuplicateGroup } from '../types';
import { REGIONS, regionDef } from '../services/regions';
import { libraryStore, SHORTCUT_ACTIONS, prettyShortcut, ShortcutAction } from '../services/libraryStore';
import { audioEngine } from '../services/audioEngine';
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
      min={min}
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
  hasUpdate?: boolean;
  updateInfo?: any;
  updateChecking?: boolean;
  updateError?: string | null;
  updateIgnored?: boolean;
  updateDownloading?: boolean;
  updateProgress?: number;
  updateReady?: boolean;
  onDownloadUpdate?: () => void;
  onInstallUpdate?: () => void;
  onIgnoreUpdate?: () => void;
  onCheckUpdate?: () => void;
  alarm?: { enabled: boolean; time: string; playlistId: string };
  alarmPlaylists?: { id: string; title: string }[];
  onAlarmChange?: (a: { enabled: boolean; time: string; playlistId: string }) => void;
  duplicates?: DuplicateGroup[];
  onCleanDuplicates?: () => void;
  onExportJSON?: () => void;
  onExportM3U?: () => void;
  onImportFile?: (f: File) => void;
  region?: string;
  onRegionChange?: (code: string) => void;
  privateMode?: boolean;
  onTogglePrivate?: () => void;
}

const SettingsViewComponent: React.FC<SettingsViewProps> = ({
  audioMode,
  onAudioModeChange,
  likedCount,
  playlistCount,
  historyCount,
  onClearHistory,
  hasUpdate,
  updateInfo,
  updateChecking,
  updateError,
  updateIgnored,
  updateDownloading,
  updateProgress,
  updateReady,
  onDownloadUpdate,
  onInstallUpdate,
  onIgnoreUpdate,
  onCheckUpdate,
  alarm = { enabled: false, time: '07:00', playlistId: 'liked' },
  alarmPlaylists = [],
  onAlarmChange,
  duplicates = [],
  onCleanDuplicates,
  onExportJSON,
  onExportM3U,
  onImportFile,
  region = 'IN',
  onRegionChange,
  privateMode = false,
  onTogglePrivate,
}) => {
  const [snrRate, setSnrRate] = React.useState(() => audioEngine.getSnrRate());
  const [snrReverb, setSnrReverb] = React.useState(() => audioEngine.getSnrReverb());
  const [nightcoreRate, setNightcoreRate] = React.useState(() => audioEngine.getNightcoreRate());
  const [bassBoost, setBassBoost] = React.useState(() => audioEngine.getBassBoost());
  const [stereoWidth, setStereoWidth] = React.useState(() => audioEngine.getStereoWidth());
  const [hdClarity, setHdClarity] = React.useState(() => audioEngine.getHdClarity());
  const [shortcuts, setShortcuts] = React.useState(() => libraryStore.getShortcuts());
  const [recording, setRecording] = React.useState<ShortcutAction | null>(null);

  // Key capture for remapping (capture phase beats the global handler).
  React.useEffect(() => {
    if (!recording) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setRecording(null);
        return;
      }
      libraryStore.setShortcut(recording, { code: e.code, ctrl: !!(e.ctrlKey || e.metaKey) });
      setShortcuts(libraryStore.getShortcuts());
      setRecording(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [recording]);

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '800px' }} className="view-enter">
      <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)' }}>
        Settings & Audio Engine
      </h1>

      {/* SOFTWARE UPDATER SECTION */}
      <section
        style={{
          borderRadius: '20px',
          backgroundColor: hasUpdate ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.03)',
          border: hasUpdate ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '12px', backgroundColor: hasUpdate ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: hasUpdate ? '#ef4444' : '#fff' }}>
            {hasUpdate ? <DownloadCloud size={20} /> : <RefreshCw size={20} />}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#fff' }}>
              Software Update
            </h2>
            <p
              title={updateError || undefined}
              style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {hasUpdate
                ? updateReady
                  ? 'Version ' + (updateInfo?.version || 'Unknown') + ' is ready to install.'
                  : 'Version ' + (updateInfo?.version || 'Unknown') + ' is available.'
                : updateChecking
                  ? 'Checking GitHub releases…'
                  : updateError
                    ? 'Could not check for updates. Try again.'
                    : updateIgnored
                      ? 'Update skipped. Check again whenever you like.'
                      : 'FreQ is currently up to date.'}
            </p>
          </div>
          
          {!hasUpdate && (
            <button
              onClick={onCheckUpdate}
              disabled={updateChecking}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: 'none', fontWeight: 600, fontSize: '13px', cursor: updateChecking ? 'default' : 'pointer', opacity: updateChecking ? 0.65 : 1 }}
              onMouseEnter={e => { if (!updateChecking) e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <RefreshCw size={14} style={{ animation: updateChecking ? 'freqSpin 0.9s linear infinite' : 'none' }} />
              {updateChecking ? 'Checking…' : 'Check for Updates'}
            </button>
          )}

          {hasUpdate && !updateDownloading && !updateReady && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={onIgnoreUpdate}
                style={{ padding: '8px 16px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                Ignore
              </button>
              <button
                onClick={onDownloadUpdate}
                style={{ padding: '8px 16px', borderRadius: '10px', backgroundColor: '#ef4444', color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                Download Update
              </button>
            </div>
          )}
          {hasUpdate && updateDownloading && !updateReady && (
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#ef4444' }}>
              Downloading... {updateProgress ? Math.round(updateProgress) + '%' : ''}
            </div>
          )}
          {hasUpdate && updateReady && (
            <button
              onClick={onInstallUpdate}
              style={{ padding: '8px 16px', borderRadius: '10px', backgroundColor: '#10b981', color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Restart & Install
            </button>
          )}
        </div>
        {hasUpdate && updateDownloading && (
          <div style={{ height: '4px', backgroundColor: 'rgba(239, 68, 68, 0.2)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: (updateProgress || 0) + '%', backgroundColor: '#ef4444', transition: 'width 0.2s ease' }} />
          </div>
        )}
      </section>

      {/* Custom Audio Flavors */}
      <section
        style={{
          borderRadius: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '6px' }}>
            <FlavorSlider
              label="Bass booster (Sub & Punch)"
              valueLabel={bassBoost <= 0 ? 'Off' : '+' + Math.round(bassBoost * 24) + ' dB'}
              min={0}
              max={1}
              step={0.04}
              minLabel="Off"
              maxLabel="+24 dB"
              value={bassBoost}
              onChange={v => {
                setBassBoost(v);
                audioEngine.setBassBoost(v);
                libraryStore.setBassBoost(v);
              }}
            />

            <FlavorSlider
              label="HD Definition & Clarity"
              valueLabel={hdClarity <= 0 ? 'Off' : Math.round(hdClarity * 100) + '%'}
              min={0}
              max={1}
              step={0.05}
              minLabel="Off"
              maxLabel="Ultra HD"
              value={hdClarity}
              onChange={v => {
                setHdClarity(v);
                audioEngine.setHdClarity(v);
                libraryStore.setHdClarity(v);
              }}
            />

            <FlavorSlider
              label="3D Stereo Spatializer"
              valueLabel={stereoWidth <= 0 ? 'Off' : Math.round(stereoWidth * 100) + '%'}
              min={0}
              max={1}
              step={0.05}
              minLabel="Normal"
              maxLabel="Ultra-Wide"
              value={stereoWidth}
              onChange={v => {
                setStereoWidth(v);
                audioEngine.setStereoWidth(v);
                libraryStore.setStereoWidth(v);
              }}
            />

            <FlavorSlider
              label="SnR tempo"
              valueLabel={snrRate.toFixed(2) + 'x'}
              min={0.5}
              max={1.0}
              step={0.05}
              minLabel="0.50x"
              maxLabel="1.00x"
              value={snrRate}
              onChange={v => {
                setSnrRate(v);
                audioEngine.setSnrRate(v);
                libraryStore.setSnrRate(v);
              }}
            />
            <FlavorSlider
              label="SnR reverb"
              valueLabel={Math.round(snrReverb * 100) + '%'}
              min={0}
              max={1}
              step={0.1}
              minLabel="Dry"
              maxLabel="Lush"
              value={snrReverb}
              onChange={v => {
                setSnrReverb(v);
                audioEngine.setSnrReverb(v);
                libraryStore.setSnrReverb(v);
              }}
            />
            <FlavorSlider
              label="Nightcore speed"
              valueLabel={nightcoreRate.toFixed(1) + 'x'}
              min={1.0}
              max={1.5}
              step={0.1}
              minLabel="1.0x"
              maxLabel="1.5x"
              value={nightcoreRate}
              onChange={v => {
                setNightcoreRate(v);
                audioEngine.setNightcoreRate(v);
                libraryStore.setNightcoreRate(v);
              }}
            />
          </div>

          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Bass Booster (up to +24 dB), HD Definition, and 3D Stereo spatialization enhance playback across all audio modes with zero-distortion limiter protection.
          </span>
        </div>
      </section>

      {/* Listening Region */}
      <section
        style={{
          borderRadius: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Globe2 size={20} color="#fff" />
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>
            Listening Region
          </h2>
        </div>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Home suggestions follow your country — currently <strong style={{ color: '#fff' }}>{regionDef(region).name}</strong>.
        </span>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px', maxWidth: '320px' }}>
          Country
          <select
            value={region}
            onChange={e => onRegionChange?.(e.target.value)}
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#fff', padding: '8px 12px', fontSize: '14px' }}
          >
            {REGIONS.map(r => (
              <option key={r.code} value={r.code} style={{ backgroundColor: '#12141f' }}>{r.name}</option>
            ))}
          </select>
        </label>
      </section>

      {/* Local Storage & Privacy */}
      <section
        style={{
          borderRadius: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
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
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1 }}>
            All library items and preferences live entirely on this machine in <code>freq_library.json</code>.
          </span>
        </div>

        <button
          onClick={onTogglePrivate}
          title="Pause history, stats and Discord track presence"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderRadius: '10px',
            backgroundColor: privateMode ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
            border: privateMode ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Private listening</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>No history, no stats, Discord shows browsing</span>
          </span>
          <span style={{
            width: '40px', height: '22px', borderRadius: '999px', position: 'relative',
            backgroundColor: privateMode ? '#f8fafc' : 'rgba(255,255,255,0.14)',
          }}>
            <span style={{
              position: 'absolute', top: '2px', left: privateMode ? '20px' : '2px',
              width: '18px', height: '18px', borderRadius: '50%',
              backgroundColor: privateMode ? '#090A0F' : '#fff',
            }} />
          </span>
        </button>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={onExportJSON}
            title="Download your library as JSON"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', fontSize: '12px', fontWeight: 700 }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
          >
            <FileDown size={14} /> Export JSON
          </button>
          <button
            onClick={onExportM3U}
            title="Download your library as M3U"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', fontSize: '12px', fontWeight: 700 }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
          >
            <FileDown size={14} /> Export M3U
          </button>
          <label
            title="Import a FreQ JSON or M3U file"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
          >
            <FileUp size={14} /> Import
            <input
              type="file"
              accept=".json,.m3u,.m3u8,application/json,audio/x-mpegurl"
              style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) onImportFile?.(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Copy size={16} color="var(--accent-violet)" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>
            {duplicates.length === 0 ? 'No duplicate songs found' : `${duplicates.length} duplicated song${duplicates.length === 1 ? '' : 's'} found`}
          </span>
          {duplicates.length > 0 && (
            <button
              onClick={onCleanDuplicates}
              style={{ padding: '6px 14px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', fontSize: '12px', fontWeight: 700 }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
            >
              Remove duplicates
            </button>
          )}
          {duplicates.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' }}>
              {duplicates.slice(0, 10).map(d => (
                <span key={d.key} style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.title} — {d.artist} <span style={{ color: 'var(--text-muted)' }}>× {d.copies}</span>
                </span>
              ))}
            </div>
          )}
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
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Clear Listening & Search History
        </button>
      </section>

      {/* Keyboard Shortcuts (cheat-sheet + remap) */}
      <section
        style={{
          borderRadius: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Keyboard size={20} color="#fff" />
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', flex: 1, margin: 0 }}>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={() => {
              libraryStore.resetShortcuts();
              setShortcuts(libraryStore.getShortcuts());
            }}
            style={{ padding: '6px 14px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            Reset
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {SHORTCUT_ACTIONS.map(a => {
            const active = recording === a.id;
            return (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {a.label}
                </span>
                <button
                  onClick={() => setRecording(active ? null : a.id)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '8px',
                    backgroundColor: active ? '#1ed760' : 'rgba(255,255,255,0.08)',
                    color: active ? '#000' : '#fff',
                    fontSize: '12px',
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    minWidth: '100px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: active ? '0 0 12px rgba(30, 215, 96, 0.4)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {active ? 'Press a key…' : prettyShortcut(shortcuts[a.id])}
                </button>
              </div>
            );
          })}
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Esc closes dialogs. Click a shortcut, then press any key combo.
        </span>
      </section>

      {/* About FreQ */}
      <section
        style={{
          borderRadius: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img
            src={freqIcon}
            alt="FreQ"
            style={{
              width: '60px',
              height: '60px',
              minWidth: '60px',
              minHeight: '60px',
              maxWidth: '60px',
              maxHeight: '60px',
              borderRadius: '16px',
              objectFit: 'cover',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5), 0 0 24px rgba(30, 215, 96, 0.15)',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px' }}>
              About FreQ Desktop
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#1ed760',
                  backgroundColor: 'rgba(30, 215, 96, 0.15)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(30, 215, 96, 0.3)',
                  letterSpacing: '0.4px',
                }}
              >
                2.1.0 (Stable)
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Made by GRESSEY & OPENCODE. All rights reserved.
              </span>
            </div>
          </div>
        </div>

        <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
          FreQ is free software licensed under GPL v3.0. A music app that simply respects you: no ads, no subscriptions, no accounts, and no tracking. Your library never leaves your device.
        </p>
      </section>
    </div>
  );
};

export const SettingsView = React.memo(SettingsViewComponent);



