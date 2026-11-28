import React, { useEffect, useRef, useState } from 'react';
import { Search, ArrowRight, Play, User, Sparkles, Headphones, Volume2, Tv, ChevronDown, Check } from 'lucide-react';
import { MediaTrack } from '../types';
import { ytMusicService } from '../services/ytmusic';
import { audioEngine } from '../services/audioEngine';
import { SquareArt } from './SquareArt';
import { useExitTransition } from './useExitTransition';

interface GlobalSearchProps {
  onSearchSubmit: (query: string) => void;
  onPlayTrack: (track: MediaTrack) => void;
  placeholder?: string;
}

// Global command bar: search lives in the app chrome so it is reachable from
// every view, not just Home.
export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  onSearchSubmit,
  onPlayTrack,
  placeholder = 'Search songs, artists, albums…',
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState<MediaTrack[]>([]);
  const [outputOpen, setOutputOpen] = useState(false);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputId, setOutputId] = useState(() => audioEngine.getOutputDeviceId());
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const refreshOutputs = async () => {
    const devices = await audioEngine.listOutputDevices();
    setOutputDevices(devices);

    // A device saved by an older build may have been folded into the merged
    // "System default" entry. Fall back to default instead of leaving the
    // picker with nothing selected.
    const current = audioEngine.getOutputDeviceId();
    if (
      current !== 'default' &&
      devices.length > 0 &&
      devices.every(d => d.deviceId) &&
      !devices.some(d => d.deviceId === current)
    ) {
      await audioEngine.setOutputDevice('default');
      setOutputId('default');
    }
  };

  useEffect(() => {
    void refreshOutputs();
    const media = navigator.mediaDevices;
    if (!media?.addEventListener) return;
    const onChange = () => void refreshOutputs();
    media.addEventListener('devicechange', onChange);
    return () => media.removeEventListener('devicechange', onChange);
  }, []);

  useEffect(() => {
    if (!outputOpen) return;
    const onDocDown = (e: MouseEvent) => {
      if (outputRef.current && !outputRef.current.contains(e.target as Node)) {
        setOutputOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [outputOpen]);

  // Clean Windows driver artifacts while preserving distinct device identity
  const cleanDeviceLabel = (label: string, isDefault = false) => {
    if (!label) return '';
    let clean = label.replace(/^(Default|Communications)\s*-\s*/i, '').trim();
    clean = clean.replace(/\(R\)/gi, '').replace(/\(TM\)/gi, '').replace(/\s+/g, ' ').trim();
    if (isDefault) {
      const baseName = clean.replace(/\s*\(.*\)\s*$/, '').trim();
      return baseName ? `System default — ${baseName}` : 'System default';
    }
    return clean;
  };

  const renderDeviceIcon = (label: string, size = 13) => {
    const l = (label || '').toLowerCase();
    if (l.includes('speaker')) {
      return <Volume2 size={size} style={{ opacity: 0.8 }} />;
    }
    if (l.includes('tv') || l.includes('hdmi') || l.includes('display') || l.includes('monitor')) {
      return <Tv size={size} style={{ opacity: 0.8 }} />;
    }
    return <Headphones size={size} style={{ opacity: 0.8 }} />;
  };

  const outputLabel = (device: MediaDeviceInfo, index: number) => {
    const isDefault = device.deviceId === 'default';
    const cleaned = cleanDeviceLabel(device.label || '', isDefault);
    if (cleaned) return cleaned;
    return isDefault ? 'System default' : `Output ${index + 1}`;
  };

  const currentOutputLabel = (() => {
    const device = outputDevices.find(d => d.deviceId === outputId);
    if (device) return outputLabel(device, outputDevices.indexOf(device));
    return outputId === 'default' ? 'System default' : 'Output device';
  })();

  const anim = useExitTransition(open && query.trim().length >= 2, 160);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setTracks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(() => {
      ytMusicService
        .search(trimmed)
        .then(res => {
          setTracks(res.slice(0, 8));
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 280);
    return () => clearTimeout(timeout);
  }, [query]);

  // "/" focuses search from anywhere, Escape leaves it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (!typing && (e.key === '/' || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey)))) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = (value?: string) => {
    const q = (value ?? query).trim();
    if (!q) return;
    setOpen(false);
    setQuery(q);
    onSearchSubmit(q);
  };

  const artists = Array.from(
    tracks.reduce((map, t) => {
      const name = (t.artist || '').trim();
      if (name && name !== 'Unknown Artist' && !map.has(name)) {
        map.set(name, { name, artworkUrl: t.artworkUrl });
      }
      return map;
    }, new Map<string, { name: string; artworkUrl: string | null }>()).values()
  ).slice(0, 2);

  return (
    <div className="fq-topbar">
      <form
        className="fq-search"
        onSubmit={e => {
          e.preventDefault();
          submit();
        }}
      >
        <span className="fq-search-icon">
          <Search size={17} strokeWidth={2} />
        </span>

        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              setOpen(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
          spellCheck={false}
          autoComplete="off"
        />

        <div className="fq-search-tail">
          <span className="fq-atmos-badge" style={{ height: '22px', pointerEvents: 'none' }} title="Origin Sounds spatial audio">
            <Sparkles size={10} color="#c4b5fd" />
            <span>Powered by Origin Sounds</span>
          </span>
          <button type="submit" className="fq-search-go" title="Search">
            <ArrowRight size={16} strokeWidth={2.4} />
          </button>
        </div>

        {anim.visible && (
          <div
            className="fq-suggest"
            style={anim.closing ? { animation: 'freqFadeScaleOut 0.14s ease forwards' } : undefined}
          >
            {artists.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', padding: '12px 12px 2px' }}>
                {artists.map(a => (
                  <button
                    key={a.name}
                    type="button"
                    onClick={() => submit(a.name)}
                    className="fq-chip"
                    style={{ height: '30px', paddingRight: '12px' }}
                  >
                    {a.artworkUrl ? (
                      <SquareArt
                        src={a.artworkUrl}
                        alt={a.name}
                        style={{ width: '22px', height: '22px', borderRadius: '50%' }}
                      />
                    ) : (
                      <User size={13} />
                    )}
                    <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', padding: '6px' }}>
              {loading && tracks.length === 0 && (
                <div style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Finding matches…
                </div>
              )}

              {tracks.slice(0, 6).map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onPlayTrack(t);
                  }}
                  className="fq-suggest-row"
                >
                  <SquareArt
                    src={t.artworkUrl}
                    videoId={t.id}
                    alt={t.title}
                    style={{ width: '38px', height: '38px', borderRadius: '9px', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t.title}
                    </span>
                    <span
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t.artist}
                    </span>
                  </span>
                  <Play size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                </button>
              ))}

              {!loading && tracks.length === 0 && (
                <div style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  No quick matches — press Enter for full search
                </div>
              )}
            </div>
          </div>
        )}
      </form>

      <div className="fq-topbar-actions">
        <span className="fq-keyhint">
          <kbd>/</kbd>
          <span>to search</span>
        </span>
        <span className="fq-topbar-div" />

        <div className="fq-topbar-output" ref={outputRef}>
          <button
            type="button"
            onClick={() => {
              setOutputOpen(prev => !prev);
              if (!outputOpen) void refreshOutputs();
            }}
            className={`fq-topbar-party${outputOpen ? ' is-open' : ''}`}
            title={`Audio output — ${currentOutputLabel}`}
            aria-haspopup="menu"
            aria-expanded={outputOpen}
          >
            {renderDeviceIcon(currentOutputLabel, 14)}
            <span>{currentOutputLabel}</span>
            <ChevronDown
              size={12}
              style={{
                opacity: 0.7,
                transform: outputOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform var(--transition-fast)',
              }}
            />
          </button>

          {outputOpen && (
            <div className="fq-output-menu" role="menu">
              <span className="fq-output-menu-head">Playback device</span>
              {outputDevices.length === 0 && (
                <span className="fq-output-empty">No audio outputs found. Connect a device and reopen.</span>
              )}
              {outputDevices.map((device, index) => {
                const label = outputLabel(device, index);
                const active = device.deviceId === outputId;
                return (
                  <button
                    key={device.deviceId || `out-${index}`}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    className={`fq-output-item${active ? ' is-active' : ''}`}
                    onClick={async () => {
                      setOutputId(device.deviceId);
                      await audioEngine.setOutputDevice(device.deviceId);
                      setOutputOpen(false);
                    }}
                  >
                    {renderDeviceIcon(label, 13)}
                    <span>{label}</span>
                    {active && <Check size={13} color="var(--accent-cyan)" />}
                  </button>
                );
              })}
              <span className="fq-output-note">Switches playback instantly between speakers, headphones and virtual devices.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
