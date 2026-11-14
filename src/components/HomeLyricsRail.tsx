import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { MediaTrack, TrackLyrics } from '../types';
import { fetchLyrics } from '../services/lyrics';
import { LyricsIcon } from './LyricsIcon';
import { useExitTransition } from './useExitTransition';

interface HomeLyricsRailProps {
  isOpen: boolean;
  track: MediaTrack | null;
  position: number;
  onSeek: (seconds: number) => void;
  onClose: () => void;
}

// Lyrics slider for Home's right slot: swaps in where Up Next lives.
export const HomeLyricsRail: React.FC<HomeLyricsRailProps> = ({
  isOpen,
  track,
  position,
  onSeek,
  onClose,
}) => {
  const [lyrics, setLyrics] = useState<TrackLyrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const { visible, closing } = useExitTransition(isOpen, 240);

  useEffect(() => {
    if (!track) {
      setLyrics(null);
      return;
    }
    let alive = true;
    setIsLoading(true);
    fetchLyrics(track.id, track.title, track.artist, track.album, track.durationSeconds).then(res => {
      if (alive) {
        setLyrics(res);
        setIsLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [track?.id]);

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [position]);

  const currentMs = position * 1000;
  let activeIndex = -1;
  if (lyrics?.synced && lyrics.synced.length > 0) {
    for (let i = 0; i < lyrics.synced.length; i++) {
      if (currentMs >= lyrics.synced[i].timeMs) activeIndex = i;
      else break;
    }
  }

  if (!visible) return null;

  return (
    <aside
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: 0,
        width: '300px',
        margin: 0,
        borderRadius: 0,
        backgroundColor: 'rgba(18, 20, 31, 0.6)',
        backdropFilter: 'blur(16px) saturate(160%)',
        WebkitBackdropFilter: 'blur(16px) saturate(160%)',
        border: 'none',
        borderLeft: '1px solid rgba(255, 255, 255, 0.09)',
        boxShadow: '-16px 0 48px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.10)',
        padding: '20px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        overflow: 'hidden',
        zIndex: 30,
        animation: closing
          ? 'freqSlideOutRight 0.22s ease'
          : 'freqSlideInRight 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LyricsIcon size={15} color="#fff" />
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', letterSpacing: '0.4px' }}>
            {lyrics?.synced && lyrics.synced.length > 0 ? 'Synchronized Lyrics' : 'Lyrics'}
          </span>
        </div>
        <button
          onClick={onClose}
          title="Back to Up Next"
          style={{ color: 'var(--text-muted)', padding: '4px', display: 'flex' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <X size={15} />
        </button>
      </div>

      {track && (
        <div style={{ padding: '0 6px', fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {track.title} • {track.artist}
        </div>
      )}

      <div
        ref={containerRef}
        className="no-scrollbar"
        style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0, padding: '2px 6px' }}
      >
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '13px' }}>
            <span>Finding lyrics...</span>
          </div>
        ) : lyrics && lyrics.synced && lyrics.synced.length > 0 ? (
          lyrics.synced.map((cue, idx) => {
            const active = idx === activeIndex;
            return (
              <div
                key={idx}
                ref={active ? activeRef : null}
                onClick={() => onSeek(cue.timeMs / 1000)}
                style={{
                  fontSize: active ? '16px' : '13px',
                  fontWeight: active ? 800 : 500,
                  color: active ? '#fff' : 'var(--text-secondary)',
                  opacity: active ? 1 : 0.6,
                  lineHeight: 1.45,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  textShadow: active ? '0 0 18px rgba(255, 255, 255, 0.4)' : 'none',
                }}
              >
                {cue.text}
              </div>
            );
          })
        ) : lyrics && lyrics.lines && lyrics.lines.length > 0 ? (
          lyrics.lines.map((line, idx) => (
            <p key={idx} style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              {line}
            </p>
          ))
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '13px' }}>
            <span>No lyrics available for this song</span>
          </div>
        )}
      </div>
    </aside>
  );
};
