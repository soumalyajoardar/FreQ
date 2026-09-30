import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Sparkles,
  RotateCcw,
  ListMusic,
  PlusCircle,
} from 'lucide-react';
import { AudioMode, MediaTrack, RepeatMode, TrackLyrics } from '../types';
import { fetchLyrics } from '../services/lyrics';
import { formatTime } from './PlayerBar';

interface NowPlayingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: MediaTrack | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  audioMode: AudioMode;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  isLiked: boolean;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLike: () => void;
  onAudioModeChange: (mode: AudioMode) => void;
  onOpenAddToPlaylist: (track: MediaTrack) => void;
  onToggleQueue: () => void;
}

export const NowPlayingModal: React.FC<NowPlayingModalProps> = ({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  position,
  duration,
  audioMode,
  isShuffle,
  repeatMode,
  isLiked,
  onPlayPause,
  onPrev,
  onNext,
  onSeek,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLike,
  onAudioModeChange,
  onOpenAddToPlaylist,
  onToggleQueue,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [lyrics, setLyrics] = useState<TrackLyrics | null>(null);
  const [isLyricsLoading, setIsLyricsLoading] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const activeLyricRef = useRef<HTMLDivElement>(null);

  // Fetch lyrics whenever current track changes or card flips
  useEffect(() => {
    if (!currentTrack) {
      setLyrics(null);
      return;
    }

    let isMounted = true;
    setIsLyricsLoading(true);

    fetchLyrics(
      currentTrack.id,
      currentTrack.title,
      currentTrack.artist,
      currentTrack.album,
      currentTrack.durationSeconds
    ).then(res => {
      if (isMounted) {
        setLyrics(res);
        setIsLyricsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentTrack?.id]);

  // Reset flip card state when track changes
  useEffect(() => {
    setIsFlipped(false);
  }, [currentTrack?.id]);

  // Auto-scroll synced lyrics to active line
  useEffect(() => {
    if (isFlipped && activeLyricRef.current && lyricsContainerRef.current) {
      activeLyricRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [position, isFlipped]);

  if (!isOpen || !currentTrack) return null;

  const currentMs = position * 1000;
  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  // Find active synced lyric index
  let activeLyricIndex = -1;
  if (lyrics?.synced && lyrics.synced.length > 0) {
    for (let i = 0; i < lyrics.synced.length; i++) {
      if (currentMs >= lyrics.synced[i].timeMs) {
        activeLyricIndex = i;
      } else {
        break;
      }
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 'var(--titlebar-height)',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9000,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#090A0F',
        overflow: 'hidden',
      }}
    >
      {/* 1. Dynamic Blurred Artwork Atmospheric Background */}
      {currentTrack.artworkUrl && (
        <div
          className="ambient-pulse"
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-20%',
            width: '140%',
            height: '140%',
            backgroundImage: `url(${currentTrack.artworkUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(54px) brightness(0.38) saturate(1.8)',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Dark Readability Scrim & Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, rgba(9, 10, 15, 0.45) 0%, rgba(9, 10, 15, 0.88) 100%)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />

      {/* Foreground Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '16px 36px 28px 36px',
        }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <button
            onClick={onClose}
            title="Collapse Player"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#fff',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; }}
          >
            <ChevronDown size={22} />
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Playing from {currentTrack.album || 'Single'}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              FreQ High Fidelity
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => onOpenAddToPlaylist(currentTrack)}
              title="Add to Playlist"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; }}
            >
              <PlusCircle size={19} />
            </button>
            <button
              onClick={onToggleQueue}
              title="Queue"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; }}
            >
              <ListMusic size={20} />
            </button>
          </div>
        </div>

        {/* Center: 3D Tap-To-Flip Card (Artwork <-> Lyrics) */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 0,
            padding: '8px 0',
          }}
        >
          <div
            className="flip-card-container"
            style={{
              width: 'min(440px, 45vh)',
              height: 'min(440px, 45vh)',
            }}
          >
            <div className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}>
              {/* Front: High-Res Album Artwork */}
              <div
                className="flip-card-front"
                onClick={() => setIsFlipped(true)}
                style={{
                  cursor: 'pointer',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  position: 'relative',
                  backgroundColor: '#12141f',
                }}
              >
                {currentTrack.artworkUrl ? (
                  <img
                    src={currentTrack.artworkUrl}
                    alt={currentTrack.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1b1e2e, #0e1018)' }} />
                )}

                {/* Tap to Flip lyrics badge */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '14px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(9, 10, 15, 0.75)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '999px',
                    padding: '6px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--text-secondary)',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  <Sparkles size={12} color="var(--accent-cyan)" />
                  <span>Tap artwork for Synced Lyrics</span>
                </div>
              </div>

              {/* Back: Synced Lyrics Card */}
              <div
                className="flip-card-back glass-floating"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '24px',
                  backgroundColor: 'rgba(18, 20, 31, 0.88)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={15} color="var(--accent-cyan)" />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      {lyrics?.synced && lyrics.synced.length > 0 ? 'Synchronized Lyrics' : 'Track Lyrics'}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsFlipped(false)}
                    title="Flip back to Artwork"
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>

                {/* Lyrics Content */}
                <div
                  ref={lyricsContainerRef}
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingRight: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {isLyricsLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                      <span>Finding lyrics on LRCLIB...</span>
                    </div>
                  ) : lyrics && lyrics.synced && lyrics.synced.length > 0 ? (
                    lyrics.synced.map((cue, idx) => {
                      const isActive = idx === activeLyricIndex;
                      return (
                        <div
                          key={idx}
                          ref={isActive ? activeLyricRef : null}
                          onClick={() => onSeek(cue.timeMs / 1000)}
                          style={{
                            fontSize: isActive ? '18px' : '15px',
                            fontWeight: isActive ? 800 : 500,
                            color: isActive ? '#00e5ff' : 'var(--text-secondary)',
                            opacity: isActive ? 1 : 0.6,
                            lineHeight: 1.4,
                            cursor: 'pointer',
                            transform: isActive ? 'scale(1.03)' : 'scale(1)',
                            transformOrigin: 'left center',
                            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                            textShadow: isActive ? '0 0 20px rgba(0, 229, 255, 0.6)' : 'none',
                          }}
                        >
                          {cue.text}
                        </div>
                      );
                    })
                  ) : lyrics && lyrics.lines && lyrics.lines.length > 0 ? (
                    lyrics.lines.map((line, idx) => (
                      <p key={idx} style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                        {line}
                      </p>
                    ))
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                      <span>No lyrics available for this song</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Song identity, flavors, timeline, controls */}
        <div style={{ width: '100%', maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Identity & Heart */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                {currentTrack.title}
              </h2>
              <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {currentTrack.artist}
              </span>
            </div>

            <button
              onClick={onToggleLike}
              title={isLiked ? 'Liked' : 'Like'}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isLiked ? '#ec4899' : 'var(--text-secondary)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <Heart size={22} fill={isLiked ? '#ec4899' : 'transparent'} />
            </button>
          </div>

          {/* Audio Flavor Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Audio Flavor:
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => onAudioModeChange('NORMAL')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: audioMode === 'NORMAL' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.06)',
                  color: audioMode === 'NORMAL' ? '#090A0F' : 'var(--text-secondary)',
                  border: '1px solid ' + (audioMode === 'NORMAL' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.1)'),
                  boxShadow: audioMode === 'NORMAL' ? '0 0 12px rgba(0, 229, 255, 0.5)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                Normal (1.0x)
              </button>
              <button
                onClick={() => onAudioModeChange('SNR')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: audioMode === 'SNR' ? 'var(--accent-violet)' : 'rgba(255, 255, 255, 0.06)',
                  color: audioMode === 'SNR' ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid ' + (audioMode === 'SNR' ? 'var(--accent-violet)' : 'rgba(255, 255, 255, 0.1)'),
                  boxShadow: audioMode === 'SNR' ? '0 0 12px rgba(139, 92, 246, 0.5)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                SnR (Slowed + Reverb)
              </button>
              <button
                onClick={() => onAudioModeChange('NIGHTCORE')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: audioMode === 'NIGHTCORE' ? 'var(--accent-pink)' : 'rgba(255, 255, 255, 0.06)',
                  color: audioMode === 'NIGHTCORE' ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid ' + (audioMode === 'NIGHTCORE' ? 'var(--accent-pink)' : 'rgba(255, 255, 255, 0.1)'),
                  boxShadow: audioMode === 'NIGHTCORE' ? '0 0 12px rgba(236, 72, 153, 0.5)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                Nightcore (Sped Up)
              </button>
            </div>
          </div>

          {/* Scrubber Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <input
              type="range"
              min="0"
              max={duration > 0 ? duration : 100}
              step="0.5"
              value={position}
              onChange={e => onSeek(parseFloat(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                appearance: 'none',
                WebkitAppearance: 'none',
                background: `linear-gradient(to right, #00e5ff 0%, #8b5cf6 ${progressPercent}%, rgba(255, 255, 255, 0.15) ${progressPercent}%, rgba(255, 255, 255, 0.15) 100%)`,
                borderRadius: '999px',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>{formatTime(position)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Primary Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '28px' }}>
            <button
              onClick={onToggleShuffle}
              style={{
                color: isShuffle ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                transition: 'color 0.15s',
              }}
            >
              <Shuffle size={20} />
            </button>

            <button
              onClick={onPrev}
              style={{
                color: 'var(--text-primary)',
                transition: 'transform 0.1s',
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.9)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <SkipBack size={26} fill="currentColor" />
            </button>

            <button
              onClick={onPlayPause}
              style={{
                width: '58px',
                height: '58px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00e5ff 0%, #8b5cf6 100%)',
                color: '#090A0F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 24px rgba(0, 229, 255, 0.6)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.08)';
                e.currentTarget.style.boxShadow = '0 0 32px rgba(0, 229, 255, 0.8)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 0 24px rgba(0, 229, 255, 0.6)';
              }}
            >
              {isPlaying ? <Pause size={28} fill="#090A0F" /> : <Play size={28} fill="#090A0F" style={{ marginLeft: '4px' }} />}
            </button>

            <button
              onClick={onNext}
              style={{
                color: 'var(--text-primary)',
                transition: 'transform 0.1s',
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.9)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <SkipForward size={26} fill="currentColor" />
            </button>

            <button
              onClick={onToggleRepeat}
              style={{
                color: repeatMode !== 'OFF' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                transition: 'color 0.15s',
              }}
            >
              {repeatMode === 'ONE' ? <Repeat1 size={22} /> : <Repeat size={22} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
