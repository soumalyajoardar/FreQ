import React from 'react';
import { ChevronUp, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { MediaTrack } from '../types';
import { FlatScrubber } from './FlatScrubber';
import { SquareArt } from './SquareArt';

interface MiniPlayerProps {
  currentTrack: MediaTrack | null;
  isPlaying: boolean;
  isLoading?: boolean;
  position: number;
  duration: number;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (v: number) => void;
  onExpand: () => void;
  onClose: () => void;
  onOpenNowPlaying: () => void;
}

const fmt = (sec: number): string => {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// Compact always-on-top player. It is the same window in "mini mode", so the
// audio engine, queue and React state are never duplicated.
export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  currentTrack,
  isPlaying,
  isLoading = false,
  position,
  duration,
  onPlayPause,
  onPrev,
  onNext,
  onSeek,
  onExpand,
  onClose,
  onOpenNowPlaying,
}) => {
  const drag = { WebkitAppRegion: 'drag' } as React.CSSProperties;
  const noDrag = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

  const iconBtn: React.CSSProperties = {
    width: 26,
    height: 26,
    borderRadius: 8,
    display: 'grid',
    placeItems: 'center',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.045)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    flexShrink: 0,
    ...noDrag,
  };

  const transport: React.CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    flexShrink: 0,
  };

  return (
    <div className="fq-mini" style={{ height: '100vh', width: '100vw', padding: 8 }}>
      <div className="fq-mini-card">
        {/* Drag strip: the whole top bar moves the frameless window. */}
        <div className="fq-mini-bar" style={drag}>
          <span className="fq-mini-brand">
            <i aria-hidden="true" />
            FreQ
          </span>
          <span className="fq-mini-live" title={isPlaying ? 'Playing' : 'Paused'}>
            <b className={isPlaying ? 'is-on' : ''} />
            {isLoading ? 'Loading' : isPlaying ? 'Playing' : 'Paused'}
          </span>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            <button type="button" title="Back to full window" aria-label="Back to full window" style={iconBtn} onClick={onExpand}>
              <ChevronUp size={14} />
            </button>
            <button type="button" title="Close" aria-label="Close" style={iconBtn} onClick={onClose}>
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="fq-mini-body">
          <button
            type="button"
            className="fq-mini-art"
            title="Open now playing"
            onClick={onOpenNowPlaying}
            style={noDrag}
          >
            <SquareArt
              src={currentTrack?.artworkUrl || null}
              videoId={currentTrack?.id}
              alt={currentTrack?.title || 'Artwork'}
              style={{ width: 58, height: 58, borderRadius: 12 }}
            />
          </button>

          <div className="fq-mini-meta">
            <div className="fq-mini-title" title={currentTrack?.title || 'Nothing playing'}>
              {currentTrack?.title || 'Nothing playing'}
            </div>
            <div className="fq-mini-artist" title={currentTrack?.artist || 'Pick a track to start'}>
              {currentTrack?.artist || 'Pick a track to start'}
            </div>
            <div className="fq-mini-controls" style={noDrag}>
              <button type="button" aria-label="Previous" title="Previous" style={transport} onClick={onPrev}>
                <SkipBack size={14} fill="currentColor" />
              </button>
              <button
                type="button"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                title={isPlaying ? 'Pause' : 'Play'}
                style={{
                  ...transport,
                  background: 'var(--accent-cyan)',
                  borderColor: 'transparent',
                  color: 'var(--accent-ink, #09090f)',
                  width: 38,
                  height: 38,
                }}
                onClick={onPlayPause}
              >
                {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" style={{ marginLeft: 2 }} />}
              </button>
              <button type="button" aria-label="Next" title="Next" style={transport} onClick={onNext}>
                <SkipForward size={14} fill="currentColor" />
              </button>
            </div>
          </div>
        </div>

        <div className="fq-mini-progress" style={noDrag}>
          <span>{fmt(position)}</span>
          <FlatScrubber
            value={position}
            max={duration || currentTrack?.durationSeconds || 0}
            onSeek={onSeek}
            height={3}
            ariaLabel="Seek"
            disabled={!currentTrack}
          />
          <span>{fmt(duration || currentTrack?.durationSeconds || 0)}</span>
        </div>
      </div>
    </div>
  );
};
