import React from 'react';
import { Volume2, HardDrive, ShieldCheck, DownloadCloud, RefreshCw, FileUp, FileDown, Copy, Globe2, Keyboard, Check, Palette, Sparkles, AlertTriangle, Terminal, Code2, RotateCcw, Lock, Unlock, Key } from 'lucide-react';
import { AudioMode, UserPlaylist, DuplicateGroup } from '../types';
import { REGIONS, regionDef } from '../services/regions';
import { libraryStore, SHORTCUT_ACTIONS, prettyShortcut, ShortcutAction } from '../services/libraryStore';
import { audioEngine } from '../services/audioEngine';
import { THEME_PRESETS, applyTheme, getThemeId, getThemePreset } from '../services/theme';
import freqIcon from '../assets/freq-icon.png';
import { FlatScrubber } from '../components/FlatScrubber';
import { QUALITY_PRESET_EVENT } from '../components/PlayerBar';

const formatCacheBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
};

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
  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '12px', fontWeight: 550, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
        {valueLabel}
      </span>
    </div>
    <FlatScrubber
      value={value}
      min={min}
      max={max}
      step={step}
      height={4}
      ariaLabel={label}
      onSeek={onChange}
    />
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
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
  duplicates?: DuplicateGroup[];
  onCleanDuplicates?: () => void;
  onExportJSON?: () => void;
  onExportM3U?: () => void;
  onImportFile?: (f: File) => void;
  region?: string;
  onRegionChange?: (code: string) => void;
  privateMode?: boolean;
  onTogglePrivate?: () => void;
  onOpenWhatsNew?: () => void;
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
  duplicates = [],
  onCleanDuplicates,
  onExportJSON,
  onExportM3U,
  onImportFile,
  region = 'IN',
  onRegionChange,
  privateMode = false,
  onTogglePrivate,
  onOpenWhatsNew,
}) => {
  const DEV_PASSKEY = '2580';
  const [devUnlocked, setDevUnlocked] = React.useState<boolean>(false);
  const [passKeyInput, setPassKeyInput] = React.useState('');
  const [passKeyError, setPassKeyError] = React.useState<string | null>(null);

  const handleUnlockDev = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (passKeyInput.trim() === DEV_PASSKEY) {
      setDevUnlocked(true);
      setPassKeyError(null);
      setPassKeyInput('');
    } else {
      setPassKeyError('Incorrect pass key. Access denied.');
    }
  };

  const handleLockDev = () => {
    setDevUnlocked(false);
    setPassKeyInput('');
    setPassKeyError(null);
  };

  const [snrRate, setSnrRate] = React.useState(() => audioEngine.getSnrRate());
  const [snrReverb, setSnrReverb] = React.useState(() => audioEngine.getSnrReverb());
  const [nightcoreRate, setNightcoreRate] = React.useState(() => audioEngine.getNightcoreRate());
  const [bassBoost, setBassBoost] = React.useState(() => audioEngine.getBassBoost());
  const [stereoWidth, setStereoWidth] = React.useState(() => audioEngine.getStereoWidth());
  const [hdClarity, setHdClarity] = React.useState(() => audioEngine.getHdClarity());
  const [shortcuts, setShortcuts] = React.useState(() => libraryStore.getShortcuts());
  const [recording, setRecording] = React.useState<ShortcutAction | null>(null);
  const [themeId, setThemeId] = React.useState(() => getThemeId());
  const [cacheInfo, setCacheInfo] = React.useState<{ files: number; bytes: number } | null>(null);
  const [cacheClearing, setCacheClearing] = React.useState(false);

  const pickTheme = (id: string) => {
    applyTheme(id);
    setThemeId(id);
  };

  // Installer files left behind by the updater. FreQ sweeps them on startup;
  // this row reports the result and lets the user reclaim space immediately.
  const refreshCacheInfo = () => {
    const api = window.electronAPI;
    if (!api?.getUpdateCacheInfo) {
      setCacheInfo(null);
      return;
    }
    api.getUpdateCacheInfo().then(setCacheInfo).catch(() => setCacheInfo(null));
  };

  React.useEffect(() => {
    refreshCacheInfo();
  }, []);

  const handleClearCache = async () => {
    const api = window.electronAPI;
    if (!api?.clearUpdateCache) return;
    setCacheClearing(true);
    try {
      await api.clearUpdateCache();
    } catch {
      // A locked file simply gets retried on the next launch.
    }
    setCacheClearing(false);
    refreshCacheInfo();
  };

  // The HD 3D / QHD 4D chip lives in the player bar and rewrites both sliders,
  // so keep these controls in sync while Settings stays open.
  React.useEffect(() => {
    const sync = () => {
      setHdClarity(audioEngine.getHdClarity());
      setStereoWidth(audioEngine.getStereoWidth());
    };
    window.addEventListener(QUALITY_PRESET_EVENT, sync);
    return () => window.removeEventListener(QUALITY_PRESET_EVENT, sync);
  }, []);

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
    <div className="fq-view view-enter" style={{ display: 'flex', flexDirection: 'column', gap: '26px', paddingTop: '18px' }}>
      <header className="fq-page-head" style={{ paddingBottom: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span className="fq-kicker">Preferences</span>
          <h1 className="fq-h1">Settings</h1>
        </div>
      </header>

      <div className="fq-settings">
        {/* Update */}
        <section className={`fq-set-section${hasUpdate ? ' is-alert' : ''}`}>
          <div className="fq-set-head">
            <span className="fq-set-icon" style={hasUpdate ? { color: '#f87171', borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.1)' } : undefined}>
              {hasUpdate ? <DownloadCloud size={16} /> : <RefreshCw size={16} />}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 className="fq-set-title">Software update</h2>
              <p
                title={updateError || undefined}
                className="fq-set-desc"
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {hasUpdate
                  ? updateReady
                    ? `Version ${updateInfo?.version || 'unknown'} is ready to install.`
                    : `Version ${updateInfo?.version || 'unknown'} is available.`
                  : updateChecking
                    ? 'Checking GitHub releases…'
                    : updateError
                      ? 'Could not check for updates. Try again.'
                      : updateIgnored
                        ? 'Update skipped. Check again whenever you like.'
                        : 'FreQ is up to date.'}
              </p>
            </div>

            {!hasUpdate && (
              <div style={{ display: 'flex', gap: '8px' }}>
                {onOpenWhatsNew && (
                  <button className="fq-btn" onClick={onOpenWhatsNew} title="View release notes and what's new">
                    <Sparkles size={13} color="var(--accent-cyan)" /> What's new
                  </button>
                )}
                <button className="fq-btn" onClick={onCheckUpdate} disabled={updateChecking}>
                  <RefreshCw size={13} style={{ animation: updateChecking ? 'freqSpin 0.9s linear infinite' : 'none' }} />
                  {updateChecking ? 'Checking…' : 'Check'}
                </button>
              </div>
            )}

            {hasUpdate && !updateDownloading && !updateReady && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="fq-btn fq-btn-ghost" onClick={onIgnoreUpdate}>Ignore</button>
                <button className="fq-btn fq-btn-primary" onClick={onDownloadUpdate}>Download</button>
              </div>
            )}

            {hasUpdate && updateDownloading && !updateReady && (
              <span className="fq-chip" style={{ color: 'var(--text-primary)' }}>
                {updateProgress ? `${Math.round(updateProgress)}%` : 'Downloading…'}
              </span>
            )}

            {hasUpdate && updateReady && (
              <button className="fq-btn fq-btn-primary" onClick={onInstallUpdate}>
                <Check size={13} />
                Restart & install
              </button>
            )}
          </div>

          {hasUpdate && updateDownloading && (
            <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${updateProgress || 0}%`, background: 'var(--accent-cyan)', transition: 'width 0.25s ease' }} />
            </div>
          )}

          {/* Installer cache — swept automatically once an update is applied. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              paddingTop: '12px',
              borderTop: '1px solid var(--line)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Downloaded installers
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                {cacheInfo === null
                  ? 'Checking…'
                  : cacheInfo.files > 0
                    ? `${formatCacheBytes(cacheInfo.bytes)} left over — removed automatically after an update finishes.`
                    : 'Nothing left behind. FreQ deletes installers once they are applied.'}
              </span>
            </div>
            <button
              className="fq-btn"
              onClick={handleClearCache}
              disabled={cacheClearing || !cacheInfo || cacheInfo.files === 0}
              style={{ flexShrink: 0 }}
            >
              {cacheClearing ? 'Clearing…' : 'Clear'}
            </button>
          </div>
        </section>

        {/* Audio flavors */}
        <section className="fq-set-section">
          <div className="fq-set-head">
            <span className="fq-set-icon"><Volume2 size={16} /></span>
            <div style={{ flex: 1 }}>
              <h2 className="fq-set-title">Audio engine</h2>
              <p className="fq-set-desc">Tune each flavour. Switch between SnR, Studio and Nightcore from the rail or player.</p>
            </div>
            <span className="fq-chip fq-chip-accent">{audioMode}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px 36px' }}>
            <FlavorSlider
              label="Bass booster (sub & punch)"
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
              label="HD definition & clarity"
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
              label="3D stereo spatializer"
              valueLabel={stereoWidth <= 0 ? 'Off' : Math.round(stereoWidth * 100) + '%'}
              min={0}
              max={1}
              step={0.05}
              minLabel="Normal"
              maxLabel="Ultra-wide"
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

          <p className="fq-set-desc">
            Bass booster, HD definition and 3D spatialisation apply across every flavour with a zero-distortion limiter.
          </p>
        </section>

        {/* Accent theme */}
        <section className="fq-set-section">
          <div className="fq-set-head">
            <span className="fq-set-icon"><Palette size={16} /></span>
            <div style={{ flex: 1 }}>
              <h2 className="fq-set-title">Accent theme</h2>
              <p className="fq-set-desc">Pick the signal colour that tints controls, highlights and lyrics — one of the rainbow hues.</p>
            </div>
            <span className="fq-chip fq-chip-accent">{getThemePreset(themeId).name}</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {THEME_PRESETS.map(t => {
              const active = t.id === themeId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pickTheme(t.id)}
                  title={t.name}
                  aria-label={`${t.name} accent`}
                  aria-pressed={active}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: t.accent,
                    border: active ? '2px solid #fff' : '2px solid rgba(255,255,255,0.12)',
                    boxShadow: active ? `0 0 0 3px rgba(${t.rgb}, 0.35), 0 6px 16px rgba(${t.rgb}, 0.3)` : 'none',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                    transition: 'transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast)',
                    transform: active ? 'scale(1.05)' : 'none',
                  }}
                >
                  {active && <Check size={16} strokeWidth={3} color={t.ink} />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Region */}
        <section className="fq-set-section">
          <div className="fq-set-head">
            <span className="fq-set-icon"><Globe2 size={16} /></span>
            <div style={{ flex: 1 }}>
              <h2 className="fq-set-title">Listening region</h2>
              <p className="fq-set-desc">
                Home suggestions follow your country — currently <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{regionDef(region).name}</strong>.
              </p>
            </div>
            <select className="fq-select" value={region} onChange={e => onRegionChange?.(e.target.value)} aria-label="Listening region">
              {REGIONS.map(r => (
                <option key={r.code} value={r.code}>{r.name}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Data & privacy */}
        <section className="fq-set-section">
          <div className="fq-set-head">
            <span className="fq-set-icon"><HardDrive size={16} /></span>
            <div style={{ flex: 1 }}>
              <h2 className="fq-set-title">Data & privacy</h2>
              <p className="fq-set-desc">Everything lives on this machine in freq_library.json.</p>
            </div>
            <ShieldCheck size={15} color="var(--accent-cyan)" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
            {[
              { value: likedCount, label: 'Liked songs' },
              { value: playlistCount, label: 'Playlists' },
              { value: historyCount, label: 'History entries' },
            ].map(s => (
              <div key={s.label} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--line)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="fq-stat-value" style={{ fontSize: '26px' }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <button
            className="fq-set-row"
            onClick={onTogglePrivate}
            title="Pause history, stats and Discord track presence"
            style={{ textAlign: 'left' }}
          >
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>Private listening</span>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>No history, no stats, Discord shows browsing</span>
            </span>
            <span className="fq-switch" style={{ background: privateMode ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.14)' }}>
              <i style={{ left: privateMode ? '19px' : '2px', background: privateMode ? 'var(--accent-ink)' : '#fff' }} />
            </span>
          </button>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="fq-btn" onClick={onExportJSON} title="Download your library as JSON">
              <FileDown size={13} /> Export JSON
            </button>
            <button className="fq-btn" onClick={onExportM3U} title="Download your library as M3U">
              <FileDown size={13} /> Export M3U
            </button>
            <label className="fq-btn" title="Import a FreQ JSON or M3U file" style={{ cursor: 'pointer' }}>
              <FileUp size={13} /> Import
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

          <div className="fq-set-row">
            <span style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
              <Copy size={14} color="var(--text-muted)" />
              <span style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: 550 }}>
                {duplicates.length === 0
                  ? 'No duplicate songs found'
                  : `${duplicates.length} duplicated song${duplicates.length === 1 ? '' : 's'}`}
              </span>
            </span>
            {duplicates.length > 0 && (
              <button className="fq-btn" onClick={onCleanDuplicates}>Remove duplicates</button>
            )}
          </div>

          {duplicates.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '150px', overflowY: 'auto', padding: '0 4px' }}>
              {duplicates.slice(0, 10).map(d => (
                <span key={d.key} className="fq-tsub">
                  {d.title} — {d.artist} <span style={{ color: 'var(--text-muted)' }}>× {d.copies}</span>
                </span>
              ))}
            </div>
          )}

          <button
            onClick={onClearHistory}
            className="fq-btn"
            style={{ alignSelf: 'flex-start', color: '#f87171', borderColor: 'rgba(248,113,113,0.26)', background: 'rgba(248,113,113,0.07)' }}
          >
            Clear listening & search history
          </button>
        </section>

        {/* Shortcuts */}
        <section className="fq-set-section">
          <div className="fq-set-head">
            <span className="fq-set-icon"><Keyboard size={16} /></span>
            <div style={{ flex: 1 }}>
              <h2 className="fq-set-title">Keyboard shortcuts</h2>
              <p className="fq-set-desc">Click a binding, then press any key combo. Esc closes dialogs.</p>
            </div>
            <button
              className="fq-btn fq-btn-ghost"
              onClick={() => {
                libraryStore.resetShortcuts();
                setShortcuts(libraryStore.getShortcuts());
              }}
            >
              Reset
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '8px' }}>
            {SHORTCUT_ACTIONS.map(a => {
              const active = recording === a.id;
              return (
                <div key={a.id} className="fq-set-row" style={{ padding: '9px 12px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 520, color: 'var(--text-secondary)' }}>{a.label}</span>
                  <button
                    className={`fq-kbd${active ? ' is-recording' : ''}`}
                    onClick={() => setRecording(active ? null : a.id)}
                  >
                    {active ? 'Press a key…' : prettyShortcut(shortcuts[a.id])}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Developer Mode */}
        {!devUnlocked ? (
          <section className="fq-set-section">
            <div className="fq-set-head">
              <span className="fq-set-icon" style={{ color: 'var(--text-muted)' }}>
                <Lock size={16} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 className="fq-set-title">Developer mode</h2>
                  <span className="fq-chip" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Locked
                  </span>
                </div>
                <p className="fq-set-desc">Protected panel. Enter pass key to unlock developer tools and diagnostics.</p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '11px',
                padding: '11px 14px',
                borderRadius: '9px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#fca5a5',
                fontSize: '12px',
                lineHeight: 1.55,
              }}
            >
              <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: '2px', color: '#ef4444' }} />
              <div>
                <strong style={{ color: '#fff', display: 'block', marginBottom: '2px' }}>
                  Warning: Use only if you are a developer!
                </strong>
                This section is restricted to developers. Modifying developer options or inspecting internal states can cause unexpected behavior, break audio playback, or crash the application if used unknowingly.
              </div>
            </div>

            <form onSubmit={handleUnlockDev} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', maxWidth: '320px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                    <Key size={13} />
                  </span>
                  <input
                    type="password"
                    value={passKeyInput}
                    onChange={e => {
                      setPassKeyInput(e.target.value);
                      if (passKeyError) setPassKeyError(null);
                    }}
                    placeholder="Enter pass key…"
                    maxLength={12}
                    style={{
                      width: '100%',
                      padding: '8px 10px 8px 30px',
                      borderRadius: '8px',
                      border: passKeyError ? '1px solid #ef4444' : '1px solid var(--line-strong)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff',
                      fontSize: '12.5px',
                      outline: 'none',
                      letterSpacing: '0.1em',
                    }}
                  />
                </div>
                <button type="submit" className="fq-btn fq-btn-primary" style={{ padding: '8px 14px', fontSize: '12px' }}>
                  <Unlock size={12} /> Unlock
                </button>
              </div>
              {passKeyError && (
                <span style={{ fontSize: '11.5px', color: '#ef4444', fontWeight: 550 }}>
                  {passKeyError}
                </span>
              )}
            </form>
          </section>
        ) : (
          <section
            className="fq-set-section"
            style={{ borderColor: 'rgba(239, 68, 68, 0.35)', background: 'rgba(239, 68, 68, 0.03)' }}
          >
            <div className="fq-set-head">
              <span
                className="fq-set-icon"
                style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.12)' }}
              >
                <Code2 size={16} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 className="fq-set-title">Developer mode</h2>
                  <span className="fq-chip" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)' }}>
                    Unlocked
                  </span>
                </div>
                <p className="fq-set-desc">Authorized session active. Internal inspection tools, DevTools debugger &amp; diagnostics.</p>
              </div>
              <button
                className="fq-btn fq-btn-ghost"
                onClick={handleLockDev}
                title="Lock Developer Mode"
                style={{ fontSize: '11.5px', padding: '5px 10px' }}
              >
                <Lock size={12} /> Lock
              </button>
            </div>

            {/* Explicit Developer Warning Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '11px',
                padding: '11px 14px',
                borderRadius: '9px',
                background: 'rgba(239, 68, 68, 0.09)',
                border: '1px solid rgba(239, 68, 68, 0.28)',
                color: '#fca5a5',
                fontSize: '12px',
                lineHeight: 1.55,
              }}
            >
              <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: '2px', color: '#ef4444' }} />
              <div>
                <strong style={{ color: '#fff', display: 'block', marginBottom: '2px' }}>
                  Warning: Use only if you are a developer!
                </strong>
                This section is intended solely for developers and debugging. Modifying developer options or inspecting internal states can cause unexpected behavior, break audio playback, or crash the app if used unknowingly.
              </div>
            </div>

            {/* Dev Mode Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span className="fq-chip">Electron {window.electronAPI ? 'Desktop Shell' : 'Browser Web'}</span>
                <span className="fq-chip">Output Sink: {audioEngine.getOutputDeviceId() || 'default'}</span>
                <span className="fq-chip">Stereo Multiplier: {(1.0 + Math.pow(audioEngine.getStereoWidth(), 0.85) * 1.85).toFixed(2)}x</span>
                <span className="fq-chip">Storage Keys: {localStorage.length}</span>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="fq-btn"
                  onClick={() => {
                    if (window.electronAPI?.openDevTools) {
                      window.electronAPI.openDevTools();
                    } else {
                      alert('DevTools not supported in this shell context');
                    }
                  }}
                  title="Open Chrome DevTools inspector"
                >
                  <Terminal size={13} /> Open DevTools
                </button>

                <button
                  className="fq-btn"
                  onClick={() => {
                    const dump = {
                      localStorageKeys: Object.keys(localStorage),
                      audioOutput: audioEngine.getOutputDeviceId(),
                      stereoWidth: audioEngine.getStereoWidth(),
                      hdClarity: audioEngine.getHdClarity(),
                      bassBoost: audioEngine.getBassBoost(),
                      appVersion: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.5.0',
                      timestamp: new Date().toISOString(),
                    };
                    console.log('[FreQ Dev Diagnostic Dump]', dump);
                    try {
                      navigator.clipboard?.writeText?.(JSON.stringify(dump, null, 2));
                      alert('Diagnostic dump logged to DevTools console and copied to clipboard.');
                    } catch {
                      alert('Diagnostic dump logged to DevTools console.');
                    }
                  }}
                  title="Copy diagnostics to clipboard and log to console"
                >
                  <Copy size={13} /> Dump Diagnostics
                </button>

                {onOpenWhatsNew && (
                  <button
                    className="fq-btn"
                    onClick={onOpenWhatsNew}
                    title="Force show the What's New changelog dialog"
                  >
                    <Sparkles size={13} /> Test What's New Dialog
                  </button>
                )}

                <button
                  className="fq-btn"
                  onClick={() => {
                    if (confirm('Reload the application window?')) {
                      window.location.reload();
                    }
                  }}
                  title="Reload application window"
                  style={{ color: '#f87171' }}
                >
                  <RotateCcw size={13} /> Reload Window
                </button>
              </div>
            </div>
          </section>
        )}

        {/* About */}
        <section className="fq-set-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img
              src={freqIcon}
              alt="FreQ"
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '15px',
                objectFit: 'cover',
                flexShrink: 0,
                border: '1px solid var(--line-strong)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <h2 className="fq-set-title" style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 400 }}>
                FreQ Desktop
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="fq-chip fq-chip-accent">{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.5.0'} (Stable)</span>
                {onOpenWhatsNew && (
                  <button
                    className="fq-btn fq-btn-ghost"
                    onClick={onOpenWhatsNew}
                    style={{ fontSize: '11px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    title="View changelog catalog"
                  >
                    <Sparkles size={11} color="var(--accent-cyan)" />
                    <span>Changelog</span>
                  </button>
                )}
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Made by GRESSEY &amp; OPENCODE. All rights reserved.
                </span>
              </div>
            </div>
          </div>

          <p style={{ fontSize: '12.5px', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
            FreQ is free software licensed under GPL v3.0. A music app that simply respects you: no ads, no
            subscriptions, no accounts, no tracking. Your library never leaves your device.
          </p>
        </section>
      </div>
    </div>
  );
};

export const SettingsView = React.memo(SettingsViewComponent);
