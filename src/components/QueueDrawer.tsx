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
        top: 'var(--titlebar-height)',
        right: 0,
        bottom: 'var(--playerbar-height)',
        width: '400px',
        backgroundColor: 'rgba(13, 15, 24, 0.92)',
        backdropFilter: 'blur(36px)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 8000,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-12px 0 40px rgba(0, 0, 0, 0.55)',
        animation: closing
          ? 'freqSlideOutRight 0.22s ease'
          : 'freqSlideInRight 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="var(--accent-cyan)" />
          <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>Up Next Queue</span>
          <span style={{
            fontSize: 11, fontWeight: 700, color: 'var(--accent-cyan)',
            background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.25)',
            padding: '2px 8px', borderRadius: 999,
          }}>
            {upcomingTracks.length}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {upcomingTracks.length > 0 && (
            <button
              onClick={onClearQueue}
              title="Clear Up Next"
              style={{
                fontSize: '11px', fontWeight: 700,
                color: 'var(--text-muted)',
                padding: '5px 10px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            title="Close"
            style={{
              color: 'var(--text-secondary)',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.05)',
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Now Playing section */}
        {currentTrack && (
          <div style={{ marginBottom: '20px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Now Playing
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                marginTop: '8px',
                borderRadius: '14px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.10)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}
            >
              <SquareArt
                src={currentTrack.artworkUrl}
                videoId={currentTrack.id}
                alt={currentTrack.title}
                style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentTrack.title}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentTrack.artist}
                </span>
              </div>
              {/* EQ bars */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 18 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 3, height: 18, borderRadius: 2,
                    background: 'var(--accent-cyan)',
                    transformOrigin: 'bottom',
                    animation: `freqEq 0.9s ease-in-out ${i * 0.15}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Up Next List */}
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Next In Queue ({upcomingTracks.length})
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
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
                    padding: '8px 10px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.07)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'; }}
                >
                  <SquareArt
                    src={track.artworkUrl}
                    videoId={track.id}
                    alt={track.title}
                    style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div
                    onClick={() => onSelectTrack(actualIndex)}
                    title="Play now"
                    style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {track.title}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {track.artist} • {formatTime(track.durationSeconds)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {onMoveTrack && (
                      <>
                        <button
                          onClick={() => !isFirst && onMoveTrack(actualIndex, actualIndex - 1)}
                          disabled={isFirst}
                          title="Move up"
                          style={{ color: isFirst ? 'rgba(255,255,255,0.15)' : 'var(--text-muted)', padding: 4 }}
                        >
                          <ChevronUp size={15} />
                        </button>
                        <button
                          onClick={() => !isLast && onMoveTrack(actualIndex, actualIndex + 1)}
                          disabled={isLast}
                          title="Move down"
                          style={{ color: isLast ? 'rgba(255,255,255,0.15)' : 'var(--text-muted)', padding: 4 }}
                        >
                          <ChevronDown size={15} />
                        </button>
                      </>
                    )}
                    {onPlayNext && !isFirst && (
                      <button
                        onClick={() => onPlayNext(actualIndex)}
                        title="Play next"
                        style={{ color: 'var(--accent-cyan)', padding: 4 }}
                      >
                        <ListPlus size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => onSelectTrack(actualIndex)}
                      title="Play"
                      style={{ color: 'var(--text-muted)', padding: 4 }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                      <Play size={14} />
                    </button>
                    <button
                      onClick={() => onRemoveTrack(actualIndex)}
                      title="Remove"
                      style={{ color: 'var(--text-muted)', padding: 4 }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}

            {upcomingTracks.length === 0 && (
              <div style={{
                textAlign: 'center', padding: '28px 14px',
                borderRadius: 14, background: 'rgba(255,255,255,0.02)',
                border: '1px dashed rgba(255,255,255,0.10)',
                color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5,
              }}>
                Queue is empty.<br />Vibe-aware autoplay will fill Up Next as you listen.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
