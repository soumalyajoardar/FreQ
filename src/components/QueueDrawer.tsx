import React from 'react';
import { X, Sparkles, Trash2, Play, ChevronUp, ChevronDown, ListPlus } from 'lucide-react';
import { MediaTrack } from '../types';
import { formatTime } from './PlayerBar';
import { useExitTransition } from './useExitTransition';
import { SafeArtwork } from './SafeArtwork';
import { SquareArt } from './SquareArt';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: MediaTrack | null;
  queue: MediaTrack[];
  queueIndex: number;
  onSelectTrack: (index: number) => void;
  onRemoveTrack: (index: number) => void;
  onClearQueue: () => void;
  onMoveTrack?: (fromIndex: number, toIndex: number) => void;
  onPlayNext?: (index: number) => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  isOpen,
  onClose,
  currentTrack,
  queue,
  queueIndex,
  onSelectTrack,
  onRemoveTrack,
  onClearQueue,
  onMoveTrack,
  onPlayNext,
}) => {
  const { visible, closing } = useExitTransition(isOpen, 240);
  if (!visible) return null;

  const upcomingTracks = queue.slice(queueIndex + 1);

  return (
    <div
      className="liquid-bar"
      style={{
        position: 'fixed',
        top: 'calc(var(--titlebar-height) + 10px)',
        right: '10px',
        bottom: 'calc(var(--playerbar-height) + 4px)',
        width: '400px',
        backgroundColor: 'rgba(11, 11, 16, 0.94)',
        backdropFilter: 'blur(26px) saturate(150%)',
        WebkitBackdropFilter: 'blur(26px) saturate(150%)',
        border: '1px solid var(--line-strong)',
        borderRadius: '20px',
        zIndex: 8000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.65)',
        animation: closing
          ? 'freqSlideOutRight 0.22s ease'
          : 'freqSlideInRight 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 18px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <Sparkles size={14} color="var(--text-secondary)" />
          <span className="fq-h3">Up Next</span>
          <span className="fq-chip" style={{ height: '20px', fontSize: '9.5px' }}>
            {upcomingTracks.length}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {upcomingTracks.length > 0 && (
            <button className="fq-btn fq-btn-ghost" onClick={onClearQueue} title="Clear Up Next" style={{ height: '28px' }}>
              Clear
            </button>
          )}
          <button onClick={onClose} title="Close" className="fq-icon-btn" style={{ width: '28px', height: '28px', borderRadius: '8px' }}>
            <X size={15} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Now Playing section */}
        {currentTrack && (
          <div style={{ marginBottom: '20px' }}>
            <span className="fq-kicker" style={{ fontSize: '9px' }}>Now playing</span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '11px',
                padding: '9px 11px',
                marginTop: '8px',
                borderRadius: '13px',
                backgroundColor: 'rgba(var(--accent-rgb), 0.055)',
                border: '1px solid rgba(var(--accent-rgb), 0.2)',
              }}
            >
              <SquareArt
                src={currentTrack.artworkUrl}
                videoId={currentTrack.id}
                alt={currentTrack.title}
                fit="cover"
                style={{ width: '42px', height: '42px', borderRadius: '9px', objectFit: 'cover' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <span className="fq-ttitle" style={{ fontSize: '12.5px' }}>{currentTrack.title}</span>
                <span className="fq-tsub">{currentTrack.artist}</span>
              </div>
              <span className="fq-eq" style={{ position: 'static' }} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </div>
          </div>
        )}

        {/* Up Next List */}
        <div>
          <span className="fq-kicker" style={{ fontSize: '9px' }}>Next in queue</span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '10px' }}>
            {upcomingTracks.map((track, i) => {
              const actualIndex = queueIndex + 1 + i;
              const isFirst = i === 0;
              const isLast = i === upcomingTracks.length - 1;
              return (
                <div
                  key={`${track.id}_${actualIndex}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '7px 9px',
                    borderRadius: '11px',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <SquareArt
                    src={track.artworkUrl}
                    fit="cover"
                    videoId={track.id}
                    alt={track.title}
                    style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div
                    onClick={() => onSelectTrack(actualIndex)}
                    title="Play now"
                    style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, cursor: 'pointer' }}
                  >
                    <span className="fq-ttitle" style={{ fontSize: '12.5px' }}>{track.title}</span>
                    <span className="fq-tsub">{track.artist} · {formatTime(track.durationSeconds)}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {onMoveTrack && (
                      <>
                        <button
                          onClick={() => !isFirst && onMoveTrack(actualIndex, actualIndex - 1)}
                          disabled={isFirst}
                          title="Move up"
                          className="fq-icon-btn"
                          style={{ width: '24px', height: '24px', borderRadius: '6px', opacity: isFirst ? 0.3 : 1 }}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={() => !isLast && onMoveTrack(actualIndex, actualIndex + 1)}
                          disabled={isLast}
                          title="Move down"
                          className="fq-icon-btn"
                          style={{ width: '24px', height: '24px', borderRadius: '6px', opacity: isLast ? 0.3 : 1 }}
                        >
                          <ChevronDown size={14} />
                        </button>
                      </>
                    )}
                    {onPlayNext && !isFirst && (
                      <button
                        onClick={() => onPlayNext(actualIndex)}
                        title="Play next"
                        className="fq-icon-btn"
                        style={{ width: '24px', height: '24px', borderRadius: '6px', color: 'var(--accent-cyan)' }}
                      >
                        <ListPlus size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => onSelectTrack(actualIndex)}
                      title="Play"
                      className="fq-icon-btn"
                      style={{ width: '24px', height: '24px', borderRadius: '6px' }}
                    >
                      <Play size={13} />
                    </button>
                    <button
                      onClick={() => onRemoveTrack(actualIndex)}
                      title="Remove"
                      className="fq-icon-btn"
                      style={{ width: '24px', height: '24px', borderRadius: '6px' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = ''; }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}

            {upcomingTracks.length === 0 && (
              <div style={{
                textAlign: 'center', padding: '28px 14px',
                borderRadius: 14,
                border: '1px dashed var(--line-strong)',
                color: 'var(--text-muted)', fontSize: '12.5px', lineHeight: 1.6,
              }}>
                Queue is empty.<br />Vibe-aware autoplay fills Up Next as you listen.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
