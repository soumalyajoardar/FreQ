import React from 'react';
import { ChevronUp, X } from 'lucide-react';
import { MediaTrack } from '../types';
import { SquareArt } from './SquareArt';

interface MiniPlayerProps {
  currentTrack: MediaTrack | null;
  onExpand: () => void;
  onClose: () => void;
  onOpenNowPlaying: () => void;
}

// Slim always-on-top Now Playing strip. Reuses the same window in mini mode so
// audio and React state stay untouched.
export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  currentTrack,
  onExpand,
  onClose,
  onOpenNowPlaying,
}) => {
  const drag = { WebkitAppRegion: 'drag' } as React.CSSProperties;
  const noDrag = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

  return (
    <div className="fq-mini" style={{ height: '100vh', width: '100vw', padding: 6 }}>
      <div className="fq-mini-card" style={drag} onDoubleClick={onExpand}>
        <button
          type="button"
          className="fq-mini-art"
          title="Open full player"
          onClick={onOpenNowPlaying}
          style={noDrag}
        >
          <SquareArt
            src={currentTrack?.artworkUrl || null}
            videoId={currentTrack?.id}
            alt={currentTrack?.title || 'Artwork'}
            style={{ width: 52, height: 52, borderRadius: 10 }}
          />
        </button>

        <div className="fq-mini-meta">
          <div className="fq-mini-title" title={currentTrack?.title || 'Nothing playing'}>
            {currentTrack?.title || 'Nothing playing'}
          </div>
          <div className="fq-mini-artist" title={currentTrack?.artist || 'Pick a track to start'}>
            {currentTrack?.artist || 'Pick a track to start'}
          </div>
          <div className="fq-mini-album" title={currentTrack?.album || ''}>
            {currentTrack?.album || (currentTrack ? 'Single' : 'FreQ Desktop')}
          </div>
        </div>

        <div className="fq-mini-right">
          <span className="fq-mini-brand">
            <i aria-hidden="true" />
            FreQ
          </span>
          <div className="fq-mini-actions" style={noDrag}>
            <button
              type="button"
              className="fq-mini-btn"
              title="Back to full window"
              aria-label="Back to full window"
              onClick={onExpand}
            >
              <ChevronUp size={13} />
            </button>
            <button
              type="button"
              className="fq-mini-btn"
              title="Close"
              aria-label="Close"
              onClick={onClose}
            >
              <X size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
