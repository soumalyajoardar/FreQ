import React, { useEffect, useRef } from 'react';
import { Play, Plus, ListPlus, Heart, PlaySquare, Minus, RotateCcw, Download, Trash2, Check } from 'lucide-react';
import { MediaTrack } from '../types';

interface TrackContextMenuProps {
  x: number;
  y: number;
  track: MediaTrack;
  isLiked: boolean;
  trimDb?: number;
  isDownloaded?: boolean;
  downloadPct?: number | null;
  onClose: () => void;
  onPlay: () => void;
  onPlayNext: () => void;
  onAddToQueue: () => void;
  onAddToPlaylist: () => void;
  onToggleLike: () => void;
  onTrimAdjust?: (deltaDb: number) => void;
  onTrimReset?: () => void;
  onDownload?: () => void;
  onRemoveDownload?: () => void;
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({
  x, y, track, isLiked, trimDb = 0, isDownloaded = false, downloadPct = null, onClose, onPlay, onPlayNext, onAddToQueue, onAddToPlaylist, onToggleLike, onTrimAdjust, onTrimReset, onDownload, onRemoveDownload
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const style: React.CSSProperties = {
    position: 'fixed',
    top: Math.max(12, Math.min(y, window.innerHeight - 468)),
    left: Math.min(x, window.innerWidth - 236),
    width: '228px',
    backgroundColor: 'rgba(12, 12, 17, 0.97)',
    backdropFilter: 'blur(24px) saturate(150%)',
    WebkitBackdropFilter: 'blur(24px) saturate(150%)',
    border: '1px solid var(--line-strong)',
    borderRadius: '14px',
    boxShadow: '0 26px 64px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    padding: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    zIndex: 99999,
    animation: 'freqPopIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    height: '34px',
    padding: '0 10px',
    fontSize: '12.5px',
    fontWeight: 520,
    letterSpacing: '-0.005em',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'background 0.12s ease',
  };

  const enter = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
  };
  const leave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.backgroundColor = 'transparent';
  };

  const divider = <div style={{ height: '1px', backgroundColor: 'var(--line)', margin: '5px 8px' }} />;

  return (
    <div ref={ref} style={style} onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}>
      <div style={{ padding: '8px 10px 9px', display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
        <span
          style={{
            fontSize: '12.5px',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {track.title}
        </span>
        <span
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {track.artist}
        </span>
      </div>

      {divider}

      <div style={itemStyle} onMouseEnter={enter} onMouseLeave={leave} onClick={() => { onPlay(); onClose(); }}>
        <Play size={14} />
        Play now
      </div>
      <div style={itemStyle} onMouseEnter={enter} onMouseLeave={leave} onClick={() => { onPlayNext(); onClose(); }}>
        <PlaySquare size={14} />
        Play next
      </div>
      <div style={itemStyle} onMouseEnter={enter} onMouseLeave={leave} onClick={() => { onAddToQueue(); onClose(); }}>
        <ListPlus size={14} />
        Add to queue
      </div>

      {divider}

      <div style={itemStyle} onMouseEnter={enter} onMouseLeave={leave} onClick={() => { onAddToPlaylist(); onClose(); }}>
        <Plus size={14} />
        Add to playlist
      </div>
      <div style={itemStyle} onMouseEnter={enter} onMouseLeave={leave} onClick={() => { onToggleLike(); onClose(); }}>
        <Heart size={14} fill={isLiked ? 'var(--accent-cyan)' : 'none'} color={isLiked ? 'var(--accent-cyan)' : 'currentColor'} />
        {isLiked ? 'Remove from Liked' : 'Save to Liked'}
      </div>

      {onTrimAdjust && (
        <>
          {divider}
          <div style={{ ...itemStyle, cursor: 'default', justifyContent: 'space-between', height: '38px' }}>
            <span style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
              Trim {trimDb > 0 ? '+' : ''}{trimDb.toFixed(1)} dB
            </span>
            <span style={{ display: 'flex', gap: '3px' }}>
              <button
                onClick={() => onTrimAdjust(-1)}
                title="Quieter"
                className="fq-icon-btn"
                style={{ width: '24px', height: '24px', borderRadius: '6px' }}
              >
                <Minus size={12} />
              </button>
              <button
                onClick={() => onTrimAdjust(1)}
                title="Louder"
                className="fq-icon-btn"
                style={{ width: '24px', height: '24px', borderRadius: '6px' }}
              >
                <Plus size={12} />
              </button>
              {trimDb !== 0 && onTrimReset && (
                <button
                  onClick={onTrimReset}
                  title="Reset trim"
                  className="fq-icon-btn"
                  style={{ width: '24px', height: '24px', borderRadius: '6px' }}
                >
                  <RotateCcw size={12} />
                </button>
              )}
            </span>
          </div>
        </>
      )}

      {(onDownload || onRemoveDownload) && (
        <>
          {divider}
          {downloadPct != null ? (
            <div style={{ ...itemStyle, cursor: 'default', color: 'var(--text-secondary)' }}>
              <Download size={14} />
              Downloading {Math.round(downloadPct)}%
            </div>
          ) : isDownloaded ? (
            <div style={itemStyle} onMouseEnter={enter} onMouseLeave={leave} onClick={() => { onRemoveDownload?.(); onClose(); }}>
              <Trash2 size={14} />
              Remove download
            </div>
          ) : (
            <div style={itemStyle} onMouseEnter={enter} onMouseLeave={leave} onClick={() => { onDownload?.(); onClose(); }}>
              <Download size={14} />
              Download offline
            </div>
          )}
          {isDownloaded && downloadPct == null && (
            <div style={{ ...itemStyle, cursor: 'default', color: 'var(--text-muted)', height: '28px', fontSize: '11.5px' }}>
              <Check size={13} />
              Available offline
            </div>
          )}
        </>
      )}
    </div>
  );
};
