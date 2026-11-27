import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Search } from 'lucide-react';
import { MediaTrack } from '../types';
import { SquareArt } from './SquareArt';

export interface PaletteCommand {
  id: string;
  label: string;
  hint?: string;
  keywords?: string;
  icon?: React.ReactNode;
  run: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: PaletteCommand[];
  tracks: MediaTrack[];
  currentTrackId?: string | null;
  onPlayTrack: (track: MediaTrack) => void;
}

interface Row {
  kind: 'command' | 'track';
  key: string;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  track?: MediaTrack;
  run: () => void;
}

// Ctrl+K action layer: navigation, transport, flavours and the local library in
// one searchable list. Everything it runs is an existing app action.
export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  commands,
  tracks,
  currentTrackId,
  onPlayTrack,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setActiveIndex(0);
    // Wait for the overlay to mount before grabbing focus.
    const id = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(id);
  }, [isOpen]);

  const normalized = query.trim().toLowerCase();

  const commandRows = useMemo<Row[]>(() => {
    const matched = commands.filter(c => {
      if (!normalized) return true;
      const haystack = `${c.label} ${c.hint || ''} ${c.keywords || ''}`.toLowerCase();
      return haystack.includes(normalized);
    });
    return matched.slice(0, normalized ? 8 : 9).map(c => ({
      kind: 'command' as const,
      key: `cmd:${c.id}`,
      label: c.label,
      hint: c.hint,
      icon: c.icon,
      run: c.run,
    }));
  }, [commands, normalized]);

  const trackRows = useMemo<Row[]>(() => {
    const seen = new Set<string>();
    const source = tracks.filter(t => {
      if (!t?.id || seen.has(t.id)) return false;
      seen.add(t.id);
      if (!normalized) return true;
      return `${t.title} ${t.artist}`.toLowerCase().includes(normalized);
    });
    return source.slice(0, normalized ? 7 : 5).map(t => ({
      kind: 'track' as const,
      key: `trk:${t.id}`,
      label: t.title || 'Unknown track',
      hint: t.artist || 'Unknown artist',
      track: t,
      run: () => onPlayTrack(t),
    }));
  }, [tracks, normalized, onPlayTrack]);

  const rows = useMemo(() => [...commandRows, ...trackRows], [commandRows, trackRows]);
  const total = rows.length;
  const safeIndex = total === 0 ? 0 : Math.min(activeIndex, total - 1);

  useEffect(() => {
    setActiveIndex(0);
  }, [normalized]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [safeIndex, isOpen]);

  if (!isOpen) return null;

  const execute = (row: Row | undefined) => {
    if (!row) return;
    onClose();
    // Defer so the dialog is gone before a command opens another surface.
    window.setTimeout(() => row.run(), 0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => (total ? (i + 1) % total : 0));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (total ? (i - 1 + total) % total : 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      execute(rows[safeIndex]);
    }
  };

  let index = -1;
  const renderRow = (row: Row) => {
    index += 1;
    const i = index;
    const active = i === safeIndex;
    const isTrack = row.kind === 'track';
    return (
      <div
        key={row.key}
        ref={active ? activeRef : undefined}
        role="option"
        aria-selected={active}
        className={`fq-cmdk-item${active ? ' is-active' : ''}`}
        onMouseEnter={() => setActiveIndex(i)}
        onClick={() => execute(row)}
      >
        <span className="fq-cmdk-item-icon">
          {isTrack ? (
            <SquareArt
              src={row.track?.artworkUrl || null}
              videoId={row.track?.id}
              alt=""
              style={{ width: 28, height: 28, borderRadius: 7 }}
            />
          ) : (
            row.icon || <Search size={14} />
          )}
        </span>
        <span className="fq-cmdk-item-text">
          <span className="fq-cmdk-item-label">
            {row.label}
            {row.track && row.track.id === currentTrackId ? <i className="fq-cmdk-now">playing</i> : null}
          </span>
          {row.hint ? <span className="fq-cmdk-item-hint">{row.hint}</span> : null}
        </span>
        {active ? <CornerDownLeft size={13} className="fq-cmdk-enter" /> : null}
      </div>
    );
  };

  return (
    <div className="fq-cmdk-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fq-cmdk-panel" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="fq-cmdk-search">
          <Search size={16} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search actions, songs, albums…"
            aria-label="Command palette search"
            spellCheck={false}
            autoComplete="off"
          />
          <span className="fq-cmdk-esc">Esc</span>
        </div>

        <div className="fq-cmdk-list" role="listbox">
          {commandRows.length > 0 && <div className="fq-cmdk-section">Actions</div>}
          {commandRows.map(renderRow)}
          {trackRows.length > 0 && <div className="fq-cmdk-section">Library</div>}
          {trackRows.map(renderRow)}
          {total === 0 && (
            <div className="fq-cmdk-empty">
              No matches for “{query}”. Try a song name, artist, or “mini”.
            </div>
          )}
        </div>

        <div className="fq-cmdk-foot">
          <span><b>↑↓</b> navigate</span>
          <span><b>↵</b> run</span>
          <span><b>Ctrl K</b> toggle</span>
        </div>
      </div>
    </div>
  );
};
