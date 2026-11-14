import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  ListMusic,
  PlusCircle,
  X,
  PanelRight,
  Droplets,
  Timer,
  Share2,
} from 'lucide-react';
import { LyricsIcon } from './LyricsIcon';
import { AudioMode, MediaTrack, RepeatMode, TrackLyrics } from '../types';
import { audioEngine } from '../services/audioEngine';
import { fetchLyrics } from '../services/lyrics';
import { formatTime } from './PlayerBar';
import { FlatScrubber } from './FlatScrubber';
import { SquareArt } from './SquareArt';
import { SafeArtwork } from './SafeArtwork';
import freqIcon from '../assets/freq-icon.png';
import { useExitTransition } from './useExitTransition';

interface NowPlayingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: MediaTrack | null;
  isPlaying: boolean;
  isLoading?: boolean;
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
  queue?: MediaTrack[];
  queueIndex?: number;
  onSelectQueueTrack?: (index: number) => void;
  onRemoveQueueTrack?: (index: number) => void;
  onMoveQueueTrack?: (from: number, to: number) => void;
  volume?: number;
  isMuted?: boolean;
  sleepMode?: 'off' | 'timer' | 'end';
  sleepRemainingSec?: number;
  onSetSleep?: (minutes: number | null | 'end') => void;
  onShare?: () => void;
}

export const NowPlayingModal: React.FC<NowPlayingModalProps> = ({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  isLoading = false,
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
  queue = [],
  queueIndex = 0,
  onSelectQueueTrack,
  onRemoveQueueTrack,
  onMoveQueueTrack,
  volume = 0.85,
  isMuted = false,
  sleepMode = 'off',
  sleepRemainingSec = 0,
  onSetSleep,
  onShare,
}) => {
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showSleep, setShowSleep] = useState(false);
  // Tint visualizer: white wash whose strength follows the volume.
  // Persisted so the choice survives restarts.
  const [tintViz, setTintViz] = useState<boolean>(() => {
    try {
      return localStorage.getItem('freq_tint_viz') !== '0';
    } catch {
      return true;
    }
  });
  const toggleTintViz = () => {
    setTintViz(v => {
      const next = !v;
      try {
        localStorage.setItem('freq_tint_viz', next ? '1' : '0');
      } catch {
        // Ignored.
      }
      return next;
    });
  };
  const [lyrics, setLyrics] = useState<TrackLyrics | null>(null);
  const [isLyricsLoading, setIsLyricsLoading] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const activeLyricRef = useRef<HTMLDivElement>(null);
  const lastLyricScrollRef = useRef(-1);
  const tintRef = useRef<HTMLDivElement>(null);

  // Fetch lyrics whenever current track changes
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

  // Auto-scroll synced lyrics only when the active line changes. The clock
  // fires 10x/sec, and re-triggering smooth scroll every tick fights itself.
  useEffect(() => {
    if (!showLyrics || !lyrics?.synced?.length) {
      lastLyricScrollRef.current = -1;
      return;
    }
    const ms = position * 1000;
    let index = -1;
    for (let i = 0; i < lyrics.synced.length; i++) {
      if (ms >= lyrics.synced[i].timeMs) index = i;
      else break;
    }
    if (index === lastLyricScrollRef.current) return;
    lastLyricScrollRef.current = index;
    if (activeLyricRef.current && lyricsContainerRef.current) {
      activeLyricRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [position, showLyrics, lyrics]);

  // Beat-reactive tint: per-frame analyser pulse written straight to the
  // overlay (no re-renders). Louder volume = stronger flashes.
  useEffect(() => {
    if (!tintViz || !isOpen) {
      if (tintRef.current) tintRef.current.style.opacity = '0';
      return;
    }
    let raf = 0;
    let last = 0;
    let running = true;
    const loop = (t: number) => {
      // Stop completely while another window (e.g. a game) is focused.
      if (document.hidden || !document.hasFocus()) {
        if (tintRef.current) tintRef.current.style.opacity = '0';
        running = false;
        return;
      }
      // 30 fps is plenty for a tint pulse.
      if (t - last >= 33) {
        last = t;
        const beat = audioEngine.getBeatLevel();
        const vol = isMuted ? 0 : Math.min(Math.max(volume, 0), 1);
        const opacity = Math.min(0.8, vol * 0.12 + beat * (0.25 + 0.45 * vol));
        if (tintRef.current) tintRef.current.style.opacity = opacity.toFixed(3);
      }
      raf = requestAnimationFrame(loop);
    };
    const resume = () => {
      if (!running && !document.hidden && document.hasFocus()) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [tintViz, isOpen, isMuted, volume, currentTrack?.id]);
  const { visible: modalVisible, closing: modalClosing } = useExitTransition(isOpen, 220);
  const { visible: panelVisible, closing: panelClosing } = useExitTransition(showQueue, 240);
  if (!modalVisible || !currentTrack) return null;

  const currentMs = position * 1000;

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

  const upcoming = queue.slice(queueIndex + 1);

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
        animation: modalClosing
          ? 'freqSlideDownOut 0.2s ease'
          : 'freqSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* 1. Dynamic Blurred Artwork Atmospheric Background */}
      {currentTrack.artworkUrl && (
        <div
          className="np-atmosphere"
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-20%',
            width: '140%',
            height: '140%',
            backgroundImage: `url(${currentTrack.artworkUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(38px) brightness(0.45) saturate(1.35)',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Dark Readability Scrim */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(9, 10, 15, 0.42)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />

      {/* Tint Visualizer: beat-reactive white wash, driven per-frame */}
      <div
        ref={tintRef}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#ffffff',
          opacity: 0,
          zIndex: 5,
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
          minHeight: 0,
          padding: '16px 36px 28px 36px',
          animation: 'freqRiseIn 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Top Header */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexShrink: 0, minHeight: '40px' }}>
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
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.10)',
              color: '#fff',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; }}
          >
            <ChevronDown size={22} />
          </button>

          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Now Playing
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
              FreQ High Fidelity
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onToggleLike}
              title={isLiked ? 'Liked' : 'Like'}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.10)',
                color: isLiked ? '#ec4899' : '#fff',
                transition: 'background 0.15s ease, transform 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <Heart
                key={String(isLiked)}
                size={19}
                fill={isLiked ? '#ec4899' : 'transparent'}
                style={{ animation: 'freqHeartPop 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
              />
            </button>
            <button
              onClick={() => setShowLyrics(v => !v)}
              title={showLyrics ? 'Hide Lyrics' : 'Show Lyrics'}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: showLyrics ? '#f8fafc' : 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid ' + (showLyrics ? '#f8fafc' : 'rgba(255, 255, 255, 0.10)'),
                color: showLyrics ? '#090A0F' : '#fff',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { if (!showLyrics) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'; }}
              onMouseLeave={e => { if (!showLyrics) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; }}
            >
              <LyricsIcon
                size={19}
                style={showLyrics ? { filter: 'drop-shadow(0 0 7px rgba(255, 255, 255, 0.9))' } : undefined}
              />
            </button>
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
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.10)',
                color: '#fff',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; }}
            >
              <PlusCircle size={19} />
            </button>
            <button
              onClick={() => setShowQueue((v: boolean) => !v)}
              title={showQueue ? 'Hide Up Next' : 'Up Next'}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: showQueue ? '#f8fafc' : 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid ' + (showQueue ? '#f8fafc' : 'rgba(255, 255, 255, 0.10)'),
                color: showQueue ? '#090A0F' : '#fff',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { if (!showQueue) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'; }}
              onMouseLeave={e => { if (!showQueue) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; }}
            >
              <PanelRight size={19} />
            </button>
            {onShare && (
              <button
                onClick={onShare}
                title="Save share card"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.10)',
                  color: '#fff',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; }}
              >
                <Share2 size={19} />
              </button>
            )}
            <button
              onClick={toggleTintViz}
              title={tintViz ? 'Turn tint visualizer off' : 'Turn tint visualizer on'}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: tintViz ? '#f8fafc' : 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid ' + (tintViz ? '#f8fafc' : 'rgba(255, 255, 255, 0.10)'),
                color: tintViz ? '#090A0F' : '#fff',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { if (!tintViz) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'; }}
              onMouseLeave={e => { if (!tintViz) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; }}
            >
              <Droplets size={19} />
            </button>
          </div>
        </div>

        {/* Center: player column (always centered) + floating right panel */}
        <div className="np-body">
          {/* Left: artwork, title, artist, timeline, controls */}
          <div className="np-left">
            {/* Artwork square / Lyrics (boxless when lyrics open) */}
            <div
              key={currentTrack.id + (showLyrics ? '-lyrics' : '')}
              className={showLyrics ? 'no-scrollbar' : undefined}
              style={showLyrics ? {
                width: 'clamp(240px, 38vh, 360px)',
                height: 'clamp(240px, 38vh, 360px)',
                flexShrink: 0,
                overflowY: 'auto',
                animation: 'freqFadeIn 0.25s ease',
              } : {
                width: 'clamp(240px, 38vh, 360px)',
                height: 'clamp(240px, 38vh, 360px)',
                flexShrink: 0,
                borderRadius: '20px',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: '#12141f',
                animation: 'freqArtIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {showLyrics ? (
                <div
                  ref={lyricsContainerRef}
                  className="no-scrollbar"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    padding: '4px 6px 12px 2px',
                    overflowY: 'auto',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '1px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {lyrics?.synced && lyrics.synced.length > 0 ? 'Synchronized Lyrics' : 'Track Lyrics'}
                  </span>
                  {isLyricsLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', fontSize: '15px', minHeight: '120px' }}>
                      <span>Finding lyrics...</span>
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
                            fontSize: isActive ? '19px' : '15px',
                            fontWeight: isActive ? 800 : 500,
                            color: isActive ? '#fff' : 'var(--text-secondary)',
                            opacity: isActive ? 1 : 0.6,
                            lineHeight: 1.5,
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.25s ease',
                            textShadow: isActive ? '0 0 18px rgba(255, 255, 255, 0.45)' : 'none',
                          }}
                        >
                          {cue.text}
                        </div>
                      );
                    })
                  ) : lyrics && lyrics.lines && lyrics.lines.length > 0 ? (
                    lyrics.lines.map((line, idx) => (
                      <p key={idx} style={{ fontSize: '15px', lineHeight: 1.65, color: 'var(--text-secondary)', textAlign: 'center' }}>
                        {line}
                      </p>
                    ))
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', fontSize: '15px', minHeight: '120px' }}>
                      <span>No lyrics available for this song</span>
                    </div>
                  )}
                </div>
              ) : currentTrack.artworkUrl ? (
                <>
                  {/* Blurred ambience fill: covers any aspect-ratio gaps */}
                  <SafeArtwork src={currentTrack.artworkUrl} videoId={currentTrack.id} alt="" style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: 'blur(28px) brightness(0.65) saturate(1.4)',
                      transform: 'scale(1.25)',
                      pointerEvents: 'none',
                    }} />
                  <SafeArtwork src={currentTrack.artworkUrl} videoId={currentTrack.id} alt={currentTrack.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                </>
              ) : (
                <img
                  src={freqIcon}
                  alt="FreQ"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>

            {/* Title + artist */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden', width: '100%', gap: '4px', padding: '2px 0' }}>
              <h2 style={{ fontSize: '23px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                {currentTrack.title}
              </h2>
              <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {currentTrack.artist}
              </span>
            </div>

            {/* Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              <FlatScrubber
                value={position}
                max={duration}
                height={6}
                ariaLabel="Seek track position"
                onSeek={v => onSeek(v)}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                <span>{formatTime(position)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Primary Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '28px', padding: '2px 0' }}>
              <button
                onClick={onToggleShuffle}
                title={isShuffle ? 'Shuffle on' : 'Shuffle off'}
                style={{
                  color: isShuffle ? 'var(--accent-cyan, #1ed760)' : 'var(--text-secondary)',
                  transition: 'color 0.15s, transform 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <Shuffle size={19} />
              </button>

              <button
                onClick={onPrev}
                title="Previous"
                style={{ color: 'var(--text-primary)', transition: 'transform 0.1s' }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.9)'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <SkipBack size={25} fill="currentColor" />
              </button>

              <button
                onClick={onPlayPause}
                title={isPlaying ? 'Pause' : 'Play'}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#f8fafc',
                  color: '#090A0F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.5)',
                  transition: 'transform 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {isLoading ? (
                  <div style={{ width: '27px', height: '27px', borderRadius: '50%', border: '3px solid rgba(9, 10, 15, 0.25)', borderTopColor: '#090A0F', animation: 'freqSpin 0.8s linear infinite' }} />
                ) : isPlaying ? (
                  <Pause size={27} fill="#090A0F" />
                ) : (
                  <Play size={27} fill="#090A0F" style={{ marginLeft: '4px' }} />
                )}
              </button>

              <button
                onClick={onNext}
                title="Next"
                style={{ color: 'var(--text-primary)', transition: 'transform 0.1s' }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.9)'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <SkipForward size={25} fill="currentColor" />
              </button>

              <button
                onClick={onToggleRepeat}
                title={`Repeat: ${repeatMode}`}
                style={{
                  color: repeatMode !== 'OFF' ? 'var(--accent-cyan, #1ed760)' : 'var(--text-secondary)',
                  transition: 'color 0.15s, transform 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {repeatMode === 'ONE' ? <Repeat1 size={21} /> : <Repeat size={21} />}
              </button>

              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowSleep(v => !v)}
                  title={sleepMode === 'off' ? 'Sleep timer' : `Sleep: ${sleepMode === 'end' ? 'end of track' : formatTime(sleepRemainingSec) + ' left'}`}
                  style={{
                    color: sleepMode !== 'off' ? '#fff' : 'var(--text-secondary)',
                    transition: 'color 0.15s, transform 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <Timer size={19} />
                  {sleepMode === 'timer' && sleepRemainingSec > 0 && (
                    <span style={{ fontSize: '11px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {formatTime(sleepRemainingSec)}
                    </span>
                  )}
                  {sleepMode === 'end' && (
                    <span style={{ fontSize: '11px', fontWeight: 700 }}>1</span>
                  )}
                </button>
                {showSleep && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 12px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'rgba(18, 20, 31, 0.95)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '14px',
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      minWidth: '150px',
                      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
                      animation: 'freqRiseIn 0.2s ease',
                      zIndex: 30,
                    }}
                  >
                    {[
                      { label: 'Off', value: null as number | null | 'end' },
                      { label: '15 min', value: 15 as number | null | 'end' },
                      { label: '30 min', value: 30 as number | null | 'end' },
                      { label: '45 min', value: 45 as number | null | 'end' },
                      { label: '60 min', value: 60 as number | null | 'end' },
                      { label: 'End of track', value: 'end' as number | null | 'end' },
                    ].map(opt => {
                      const active = (opt.value === null && sleepMode === 'off') ||
                        (opt.value === 'end' && sleepMode === 'end');
                      return (
                        <button
                          key={opt.label}
                          onClick={() => { onSetSleep?.(opt.value); setShowSleep(false); }}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '9px',
                            fontSize: '13px',
                            fontWeight: active ? 800 : 500,
                            color: active ? '#090A0F' : 'var(--text-primary)',
                            backgroundColor: active ? '#f8fafc' : 'transparent',
                            textAlign: 'left',
                          }}
                          onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                          onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Audio Flavor Pills */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={() => onAudioModeChange('SNR')}
                  style={{
                    padding: '5px 12px',
                    width: '104px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: audioMode === 'SNR' ? 'var(--accent-violet)' : 'rgba(255, 255, 255, 0.06)',
                    color: audioMode === 'SNR' ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid ' + (audioMode === 'SNR' ? 'var(--accent-violet)' : 'rgba(255, 255, 255, 0.1)'),
                    transition: 'all 0.15s ease',
                  }}
                >
                  SnR
                </button>
                <button
                  onClick={() => onAudioModeChange('NORMAL')}
                  style={{
                    padding: '5px 12px',
                    width: '104px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: audioMode === 'NORMAL' ? '#f8fafc' : 'rgba(255, 255, 255, 0.06)',
                    color: audioMode === 'NORMAL' ? '#090A0F' : 'var(--text-secondary)',
                    border: '1px solid ' + (audioMode === 'NORMAL' ? '#f8fafc' : 'rgba(255, 255, 255, 0.1)'),
                    transition: 'all 0.15s ease',
                  }}
                >
                  Normal
                </button>
                <button
                  onClick={() => onAudioModeChange('NIGHTCORE')}
                  style={{
                    padding: '5px 12px',
                    width: '104px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: audioMode === 'NIGHTCORE' ? 'var(--accent-pink)' : 'rgba(255, 255, 255, 0.06)',
                    color: audioMode === 'NIGHTCORE' ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid ' + (audioMode === 'NIGHTCORE' ? 'var(--accent-pink)' : 'rgba(255, 255, 255, 0.1)'),
                    transition: 'all 0.15s ease',
                  }}
                >
                  Nightcore
                </button>
              </div>
            </div>
          </div>

                  </div>

        {/* Right: Up Next panel, fixed to right edge */}
        {panelVisible && (
        <div
          className="np-queue glass-floating liquid-panel"
          style={{
            position: 'absolute',
            right: '24px',
            top: '110px',
            bottom: '4vh',
            zIndex: 20,
            backgroundColor: 'rgba(18, 20, 31, 0.66)',
            backdropFilter: 'blur(16px) saturate(160%)',
            WebkitBackdropFilter: 'blur(16px) saturate(160%)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
              borderRadius: '24px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              overflow: 'hidden',
              animation: panelClosing
                ? 'freqSlideOutRight 0.22s ease'
                : 'freqSlideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ListMusic size={15} color="#fff" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                Up Next ({upcoming.length})
              </span>
            </div>
            {/* queue list */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', minHeight: 0, paddingRight: '2px' }}>
                  {upcoming.map((track, i) => {
                    const actualIndex = queueIndex + 1 + i;
                    const isFirst = i === 0;
                    const isLast = i === upcoming.length - 1;
                    return (
                      <div
                        key={`${track.id}_${actualIndex}`}
                        onClick={() => onSelectQueueTrack?.(actualIndex)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          borderRadius: '12px',
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                          animation: 'freqRiseIn 0.3s ease both',
                          animationDelay: `${Math.min(i, 12) * 30}ms`,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'; }}
                      >
                        <SquareArt
                          src={track.artworkUrl || freqIcon}
                          videoId={track.id}
                          alt={track.title}
                          fit="cover"
                          style={{ width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0 }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {track.title}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {track.artist}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                          {formatTime(track.durationSeconds)}
                        </span>
                        {onMoveQueueTrack && (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); if (!isFirst) onMoveQueueTrack(actualIndex, actualIndex - 1); }}
                              disabled={isFirst}
                              title="Move up"
                              style={{ color: isFirst ? 'rgba(255,255,255,0.15)' : 'var(--text-muted)', padding: '4px', flexShrink: 0 }}
                              onMouseEnter={e => { if (!isFirst) e.currentTarget.style.color = '#fff'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = isFirst ? 'rgba(255,255,255,0.15)' : 'var(--text-muted)'; }}
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); if (!isLast) onMoveQueueTrack(actualIndex, actualIndex + 1); }}
                              disabled={isLast}
                              title="Move down"
                              style={{ color: isLast ? 'rgba(255,255,255,0.15)' : 'var(--text-muted)', padding: '4px', flexShrink: 0 }}
                              onMouseEnter={e => { if (!isLast) e.currentTarget.style.color = '#fff'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = isLast ? 'rgba(255,255,255,0.15)' : 'var(--text-muted)'; }}
                            >
                              <ChevronDown size={14} />
                            </button>
                          </>
                        )}
                        {onRemoveQueueTrack && (
                          <button
                            onClick={e => { e.stopPropagation(); onRemoveQueueTrack(actualIndex); }}
                            title="Remove"
                            style={{ color: 'var(--text-muted)', padding: '4px', flexShrink: 0 }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {upcoming.length === 0 && (
                    <div style={{
                      textAlign: 'center', padding: '26px 12px', borderRadius: '14px',
                      background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.10)',
                      color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5,
                    }}>
                      Queue is empty.<br />Vibe autoplay will fill Up Next.
                    </div>
                  )}                </div>
          </div>
          )}
      </div>
    </div>
  );
};








