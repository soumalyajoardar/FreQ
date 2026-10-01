import React from 'react';
import { ListMusic, Play, Trash2, Music2 } from 'lucide-react';
import { MediaTrack } from '../types';
import { formatTime } from './PlayerBar';
import { SafeArtwork } from './SafeArtwork';
import { SquareArt } from './SquareArt';

interface HomeQueueRailProps {
  currentTrack: MediaTrack | null;
  queue: MediaTrack[];
  queueIndex: number;
  onSelectTrack: (index: number) => void;
  onRemoveTrack: (index: number) => void;
  onClearQueue: () => void;
}

// Persistent Up Next rail: always a layout part of Home.
export const HomeQueueRail: React.FC<HomeQueueRailProps> = ({
  currentTrack,
  queue,
  queueIndex,
  onSelectTrack,
  onRemoveTrack,
  onClearQueue,
}) => {
  const upcoming = queue.slice(queueIndex + 1);

  return (
    <aside
      style={{
        width: '300px',
        flexShrink: 0,
        alignSelf: 'stretch',
        margin: 0,
        borderRadius: 0,
        backgroundColor: 'rgba(18, 20, 31, 0.6)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        border: 'none',
        borderLeft: '1px solid rgba(255, 255, 255, 0.09)',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.10)',
        padding: '20px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        overflow: 'hidden',
        animation: 'freqRiseIn 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ListMusic size={15} color="#fff" />
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', letterSpacing: '0.4px' }}>
            Up Next
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
            padding: '1px 8px', borderRadius: 999,
          }}>
            {upcoming.length}
          </span>
        </div>
        {upcoming.length > 0 && (
          <button
            onClick={onClearQueue}
            style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', padding: '4px 8px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)' }}
          >
            Clear
          </button>
        )}
      </div>

      {currentTrack && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '9px 10px', borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.07)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#1b1e2e' }}>
            <SquareArt src={currentTrack.artworkUrl} videoId={currentTrack.id} alt={currentTrack.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentTrack.title}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--accent-teal)', fontWeight: 700 }}>NOW PLAYING</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16, flexShrink: 0 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 3, height: 16, borderRadius: 2, background: '#fff', transformOrigin: 'bottom', animation: `freqEq 0.9s ease-in-out ${i * 0.15}s infinite` }} />
            ))}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', minHeight: 0 }}>
        {upcoming.map((track, i) => {
          const actualIndex = queueIndex + 1 + i;
          return (
            <div
              key={`${track.id}_${actualIndex}`}
              onClick={() => onSelectTrack(actualIndex)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '7px 8px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid transparent',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.07)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'; }}
            >
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#1b1e2e' }}>
                <SquareArt src={track.artworkUrl} videoId={track.id} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {track.title}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {track.artist} • {formatTime(track.durationSeconds)}
                </span>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onRemoveTrack(actualIndex); }}
                title="Remove"
                style={{ color: 'var(--text-muted)', padding: '4px', flexShrink: 0, display: 'flex' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
        {upcoming.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '24px 12px', borderRadius: '14px',
            background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.10)',
            color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.6,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
          }}>
            <Music2 size={20} color="var(--text-muted)" />
            <span>Nothing queued.<br />Play anything to fill this rail.</span>
          </div>
        )}
      </div>

      {upcoming.length > 0 && (
        <button
          onClick={() => onSelectTrack(queueIndex + 1)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '10px', borderRadius: '12px',
            backgroundColor: '#f8fafc', color: '#090A0F',
            fontSize: '13px', fontWeight: 800,
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.4)',
          }}
        >
          <Play size={14} fill="#090A0F" />
          <span>Play Next</span>
        </button>
      )}
    </aside>
  );
};
