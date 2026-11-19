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
        top: '10px',
        bottom: '10px',
        right: '10px',
        width: '320px',
        margin: 0,
        borderRadius: '20px',
        backgroundColor: 'rgba(11, 11, 16, 0.94)',
        backdropFilter: 'blur(26px) saturate(150%)',
        WebkitBackdropFilter: 'blur(26px) saturate(150%)',
        border: '1px solid var(--line-strong)',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.65)',
        padding: '18px 14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        overflow: 'hidden',
        zIndex: 30,
        animation: closing
          ? 'freqSlideOutRight 0.22s ease'
          : 'freqSlideInRight 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LyricsIcon size={14} color="var(--text-secondary)" />
          <span className="fq-kicker" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
            {lyrics?.synced && lyrics.synced.length > 0 ? 'Synchronized' : 'Lyrics'}
          </span>
        </div>
        <button
          onClick={onClose}
          title="Back to Up Next"
          className="fq-icon-btn"
          style={{ width: '26px', height: '26px', borderRadius: '7px' }}
        >
          <X size={14} />
        </button>
      </div>

      {track && (
        <div style={{ padding: '0 6px', display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', lineHeight: 1.05, letterSpacing: '-0.02em', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {track.title}
          </span>
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {track.artist}
          </span>
        </div>
      )}

      <div style={{ height: '1px', background: 'var(--line)', margin: '0 6px' }} />

      <div
        ref={containerRef}
        className="no-scrollbar fq-lyrics-rail-scroll"
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
                  fontFamily: active ? 'var(--font-serif)' : 'inherit',
                  fontSize: active ? '19px' : '13px',
                  fontWeight: active ? 400 : 500,
                  color: active ? '#fff' : 'var(--text-secondary)',
                  opacity: active ? 1 : 0.62,
                  lineHeight: 1.35,
                  letterSpacing: active ? '-0.01em' : '0',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  textShadow: active ? '0 0 22px rgba(var(--accent-rgb), 0.14)' : 'none',
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
