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
    top: Math.min(y, window.innerHeight - 340),
    left: Math.min(x, window.innerWidth - 200),
    width: '200px',
    backgroundColor: 'rgba(20, 22, 33, 0.95)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    zIndex: 99999,
    animation: 'freqPopIn 0.15s ease',
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
    fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer',
    borderRadius: '6px', transition: 'background 0.1s',
  };

  return (
    <div ref={ref} style={style} onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}>
      <div 
        style={itemStyle} 
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        onClick={() => { onPlay(); onClose(); }}
      >
        <Play size={16} /> Play
      </div>
      <div 
        style={itemStyle} 
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        onClick={() => { onPlayNext(); onClose(); }}
      >
        <PlaySquare size={16} /> Play Next
      </div>
      <div 
        style={itemStyle} 
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        onClick={() => { onAddToQueue(); onClose(); }}
      >
        <ListPlus size={16} /> Add to Queue
      </div>
      <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
      <div 
        style={itemStyle} 
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        onClick={() => { onAddToPlaylist(); onClose(); }}
      >
        <Plus size={16} /> Add to Playlist...
      </div>
      <div 
        style={itemStyle} 
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        onClick={() => { onToggleLike(); onClose(); }}
      >
        <Heart size={16} fill={isLiked ? '#ef4444' : 'none'} color={isLiked ? '#ef4444' : '#fff'} /> 
        {isLiked ? 'Remove from Liked' : 'Like'}
      </div>
      {onTrimAdjust && (
        <>
          <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
          <div style={{ ...itemStyle, cursor: 'default', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>
              TRIM {trimDb > 0 ? '+' : ''}{trimDb.toFixed(1)} dB
            </span>
            <span style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => onTrimAdjust(-1)}
                title="Quieter"
                style={{ width: '26px', height: '26px', borderRadius: '7px', backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Minus size={13} />
              </button>
              <button
                onClick={() => onTrimAdjust(1)}
                title="Louder"
                style={{ width: '26px', height: '26px', borderRadius: '7px', backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Plus size={13} />
              </button>
              {trimDb !== 0 && onTrimReset && (
                <button
                  onClick={onTrimReset}
                  title="Reset trim"
                  style={{ width: '26px', height: '26px', borderRadius: '7px', backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <RotateCcw size={13} />
                </button>
              )}
            </span>
          </div>
        </>
      )}
      {(onDownload || onRemoveDownload) && (
        <>
          <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
          {downloadPct != null ? (
            <div style={{ ...itemStyle, cursor: 'default' }}>
              <Download size={16} />
              Downloading… {Math.round(downloadPct)}%
            </div>
          ) : isDownloaded ? (
            <div
              style={itemStyle}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              onClick={() => { onRemoveDownload?.(); onClose(); }}
            >
              <Trash2 size={16} /> Remove download
            </div>
          ) : (
            <div
              style={itemStyle}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              onClick={() => { onDownload?.(); onClose(); }}
            >
              <Download size={16} /> Download for offline
            </div>
          )}
          {isDownloaded && downloadPct == null && (
            <div style={{ ...itemStyle, cursor: 'default', color: 'var(--text-secondary)', fontSize: '12px' }}>
              <Check size={14} /> Available offline
            </div>
          )}
        </>
      )}
    </div>
  );
};
