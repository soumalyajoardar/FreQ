import React from 'react';
import { X, Sparkles, Trash2, Play } from 'lucide-react';
import { MediaTrack } from '../types';
import { formatTime } from './PlayerBar';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: MediaTrack | null;
  queue: MediaTrack[];
  queueIndex: number;
  onSelectTrack: (index: number) => void;
  onRemoveTrack: (index: number) => void;
  onClearQueue: () => void;
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
}) => {
  if (!isOpen) return null;

  const upcomingTracks = queue.slice(queueIndex + 1);

  return (
    <div
      style={{
        position: 'fixed',
        top: 'var(--titlebar-height)',
        right: 0,
        bottom: 'var(--playerbar-height)',
        width: '380px',
        backgroundColor: 'rgba(14, 16, 24, 0.88)',
        backdropFilter: 'blur(36px)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 8000,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.5)',
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
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Up Next Queue</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {upcomingTracks.length > 0 && (
            <button
              onClick={onClearQueue}
              title="Clear Queue"
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                padding: '4px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
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
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Now Playing
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px',
                marginTop: '8px',
                borderRadius: '12px',
                background: 'rgba(0, 229, 255, 0.1)',
                border: '1px solid rgba(0, 229, 255, 0.25)',
              }}
            >
              <img
                src={currentTrack.artworkUrl || ''}
                alt={currentTrack.title}
                style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentTrack.title}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentTrack.artist}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {formatTime(currentTrack.durationSeconds)}
              </span>
            </div>
          </div>
        )}

        {/* Up Next List */}
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Next In Queue ({upcomingTracks.length})
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
            {upcomingTracks.map((track, i) => {
              const actualIndex = queueIndex + 1 + i;
              return (
                <div
                  key={`${track.id}_${actualIndex}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'; }}
                >
                  <img
                    src={track.artworkUrl || ''}
                    alt={track.title}
                    style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }}
                  />
                  <div
                    onClick={() => onSelectTrack(actualIndex)}
                    style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {track.title}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {track.artist}
                    </span>
                  </div>

                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatTime(track.durationSeconds)}
                  </span>

                  <button
                    onClick={() => onRemoveTrack(actualIndex)}
                    title="Remove from queue"
                    style={{
                      color: 'var(--text-muted)',
                      padding: '4px',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}

            {upcomingTracks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '13px' }}>
                Queue is empty. Vibe-aware autoplay will automatically generate suggestions!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
