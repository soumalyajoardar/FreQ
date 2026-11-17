import React, { useEffect, useRef, useState } from 'react';
import { Search, ArrowRight, Play, User, Sparkles, Radio } from 'lucide-react';
import { MediaTrack } from '../types';
import { ytMusicService } from '../services/ytmusic';
import { SquareArt } from './SquareArt';
import { useExitTransition } from './useExitTransition';

interface GlobalSearchProps {
  onSearchSubmit: (query: string) => void;
  onPlayTrack: (track: MediaTrack) => void;
  onOpenParty?: () => void;
  isInParty?: boolean;
  partyMembersCount?: number;
  placeholder?: string;
}

// Global command bar: search lives in the app chrome so it is reachable from
// every view, not just Home.
export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  onSearchSubmit,
  onPlayTrack,
  onOpenParty,
  isInParty = false,
  partyMembersCount = 0,
  placeholder = 'Search songs, artists, albums…',
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState<MediaTrack[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

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
          <span className="origin-sounds-badge" style={{ height: '22px', pointerEvents: 'none' }}>
            <Sparkles size={10} color="#a1a1aa" />
            <span>Powered by ORIGIN SOUNDS</span>
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
        {onOpenParty && (
          <button
            type="button"
            onClick={onOpenParty}
            className={`fq-topbar-party${isInParty ? ' is-live' : ''}`}
            title={isInParty ? `Party active — ${partyMembersCount}/5 listeners` : 'Listen together'}
          >
            <Radio size={14} />
            <span>{isInParty ? `Party ${partyMembersCount}/5` : 'Listen together'}</span>
            {isInParty && <span className="fq-live-dot" />}
          </button>
        )}
      </div>
    </div>
  );
};
