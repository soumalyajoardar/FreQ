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
import { LyricalStageView } from '../lyrics/LyricalStageView';

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
  const [lyrics, setLyrics] = useState<TrackLyrics | null>(null);
  const [isLyricsLoading, setIsLyricsLoading] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const activeLyricRef = useRef<HTMLDivElement>(null);
  const lastLyricScrollRef = useRef(-1);

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

  const iconBtn: React.CSSProperties = {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.045)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid var(--line)',
    color: 'var(--text-secondary)',
    transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
  };

  const iconBtnActive: React.CSSProperties = {
    ...iconBtn,
    backgroundColor: 'rgba(244, 244, 246, 0.95)',
    borderColor: 'transparent',
    color: '#08080c',
  };

  const hoverOn = (e: React.MouseEvent<HTMLButtonElement>, active = false) => {
    if (active) return;
    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.09)';
    e.currentTarget.style.color = '#fff';
    e.currentTarget.style.borderColor = 'var(--line-strong)';
  };
  const hoverOff = (e: React.MouseEvent<HTMLButtonElement>, active = false) => {
    if (active) return;
    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.045)';
    e.currentTarget.style.color = 'var(--text-secondary)';
    e.currentTarget.style.borderColor = 'var(--line)';
  };

  const flavors: { id: AudioMode; label: string }[] = [
    { id: 'SNR', label: 'SnR' },
    { id: 'NORMAL', label: 'Normal' },
    { id: 'NIGHTCORE', label: 'Nightcore' },
  ];

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
        backgroundColor: '#07070a',
        overflow: 'hidden',
        animation: modalClosing
          ? 'freqSlideDownOut 0.2s ease'
          : 'freqSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {showLyrics ? (
        <LyricalStageView
          track={currentTrack}
          lyrics={lyrics}
          isLyricsLoading={isLyricsLoading}
          isPlaying={isPlaying}
          position={position}
          duration={duration}
          onPlayPause={onPlayPause}
          onPrev={onPrev}
          onNext={onNext}
          onSeek={onSeek}
          onCloseLyrics={() => setShowLyrics(false)}
          onCollapsePlayer={onClose}
        />
      ) : (
      <>
      {/* 1. Dynamic blurred artwork atmosphere */}
      {currentTrack.artworkUrl && (
        <div
          className="np-atmosphere"
          style={{
            position: 'absolute',
            top: '-25%',
            left: '-20%',
            width: '140%',
            height: '150%',
            backgroundImage: `url(${currentTrack.artworkUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(58px) brightness(0.58) saturate(1.35)',
            transform: 'scale(1.12)',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Fine grain + vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,0.06), transparent 62%), radial-gradient(100% 100% at 50% 100%, rgba(0,0,0,0.42), transparent 62%)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />

      {/* Readability scrim */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(7, 7, 10, 0.28)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      />

      {/* Foreground content */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          padding: '14px 32px 26px 32px',
          animation: 'freqRiseIn 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexShrink: 0, minHeight: '40px' }}>
          <button
            onClick={onClose}
            title="Collapse player"
            style={iconBtn}
            onMouseEnter={e => hoverOn(e)}
            onMouseLeave={e => hoverOff(e)}
          >
            <ChevronDown size={19} />
          </button>

          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', pointerEvents: 'none' }}>
            <span className="fq-kicker" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Now playing</span>
            <span style={{ fontSize: '12px', fontWeight: 560, letterSpacing: '-0.005em', color: 'var(--text-secondary)' }}>
              FreQ · High fidelity
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <button
              onClick={onToggleLike}
              title={isLiked ? 'Liked' : 'Like'}
              style={{
                ...iconBtn,
                color: isLiked ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                borderColor: isLiked ? 'rgba(var(--accent-rgb), 0.34)' : 'var(--line)',
                backgroundColor: isLiked ? 'rgba(var(--accent-rgb), 0.1)' : 'rgba(255, 255, 255, 0.045)',
              }}
              onMouseEnter={e => { if (!isLiked) hoverOn(e); }}
              onMouseLeave={e => { if (!isLiked) hoverOff(e); }}
            >
              <Heart
                key={String(isLiked)}
                size={17}
                fill={isLiked ? 'currentColor' : 'transparent'}
                style={{ animation: 'freqHeartPop 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
              />
            </button>
            <button
              onClick={() => setShowLyrics(v => !v)}
              title={showLyrics ? 'Hide lyrics' : 'Show lyrics'}
              style={showLyrics ? iconBtnActive : iconBtn}
              onMouseEnter={e => hoverOn(e, showLyrics)}
              onMouseLeave={e => hoverOff(e, showLyrics)}
            >
              <LyricsIcon size={17} />
            </button>
            <button
              onClick={() => onOpenAddToPlaylist(currentTrack)}
              title="Add to playlist"
              style={iconBtn}
              onMouseEnter={e => hoverOn(e)}
              onMouseLeave={e => hoverOff(e)}
            >
              <PlusCircle size={17} />
            </button>
            <button
              onClick={() => setShowQueue((v: boolean) => !v)}
              title={showQueue ? 'Hide up next' : 'Up next'}
              style={showQueue ? iconBtnActive : iconBtn}
              onMouseEnter={e => hoverOn(e, showQueue)}
              onMouseLeave={e => hoverOff(e, showQueue)}
            >
              <PanelRight size={17} />
            </button>
            {onShare && (
              <button
                onClick={onShare}
                title="Save share card"
                style={iconBtn}
                onMouseEnter={e => hoverOn(e)}
                onMouseLeave={e => hoverOff(e)}
              >
                <Share2 size={17} />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="np-body">
          <div className="np-left">
            {/* Artwork / lyrics */}
            <div
              key={currentTrack.id + (showLyrics ? '-lyrics' : '')}
              className={showLyrics ? 'np-lyrics' : undefined}
              style={showLyrics ? {
                width: 'clamp(260px, 42vh, 400px)',
                height: 'clamp(260px, 42vh, 400px)',
                flexShrink: 0,
                animation: 'freqFadeIn 0.25s ease',
              } : {
                width: 'clamp(260px, 42vh, 400px)',
                height: 'clamp(260px, 42vh, 400px)',
                flexShrink: 0,
                borderRadius: '18px',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: '0 26px 64px rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                backgroundColor: '#101015',
                animation: 'freqArtIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {showLyrics ? (
                <>
                  <div className="np-lyrics-head">
                    <span className="fq-kicker" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                      {lyrics?.synced && lyrics.synced.length > 0 ? 'Synchronized lyrics' : 'Lyrics'}
                    </span>
                  </div>
                  <div
                    ref={lyricsContainerRef}
                    className="np-lyrics-scroll no-scrollbar"
                  >
                    {isLyricsLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', fontSize: '13px', minHeight: '120px' }}>
                        <span>Finding lyrics…</span>
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
                              fontFamily: isActive ? 'var(--font-serif)' : 'inherit',
                              fontSize: isActive ? '21px' : '14px',
                              fontWeight: isActive ? 400 : 500,
                              color: isActive ? '#fff' : 'var(--text-secondary)',
                              opacity: isActive ? 1 : 0.72,
                              lineHeight: 1.35,
                              letterSpacing: isActive ? '-0.01em' : '0',
                              textAlign: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.25s ease',
                              textShadow: isActive ? '0 0 24px rgba(var(--accent-rgb), 0.16)' : 'none',
                            }}
                          >
                            {cue.text}
                          </div>
                        );
                      })
                    ) : lyrics && lyrics.lines && lyrics.lines.length > 0 ? (
                      lyrics.lines.map((line, idx) => (
                        <p key={idx} style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--text-secondary)', textAlign: 'center' }}>
                          {line}
                        </p>
                      ))
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', fontSize: '13px', minHeight: '120px' }}>
                        <span>No lyrics available for this song</span>
                      </div>
                    )}
                  </div>
                </>
              ) : currentTrack.artworkUrl ? (
                <>
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden', width: '100%', gap: '5px', padding: '2px 0' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(26px, 3.4vh, 36px)', fontWeight: 400, lineHeight: 1.02, color: '#fff', letterSpacing: '-0.02em', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                {currentTrack.title}
              </h2>
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.005em' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                <span>{formatTime(position)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Primary controls — 1fr | auto | 1fr so the play button sits on
                the exact horizontal centre of the panel regardless of how many
                secondary controls live on each side. */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '2px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '24px' }}>
                <button
                  onClick={onToggleShuffle}
                  title={isShuffle ? 'Shuffle on' : 'Shuffle off'}
                  style={{
                    color: isShuffle ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    transition: 'color 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <Shuffle size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '26px' }}>
                <button
                  onClick={onPrev}
                  title="Previous"
                  style={{ color: 'var(--text-primary)', transition: 'transform 0.1s' }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.9)'; }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <SkipBack size={24} fill="currentColor" />
                </button>

                <button
                  onClick={onPlayPause}
                  title={isPlaying ? 'Pause' : 'Play'}
                  style={{
                    width: '58px',
                    height: '58px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-cyan)',
                    color: 'var(--accent-ink)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 12px 30px rgba(var(--accent-rgb), 0.28)',
                    transition: 'transform 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  {isLoading ? (
                    <div style={{ width: '27px', height: '27px', borderRadius: '50%', border: '3px solid rgba(8, 8, 12, 0.25)', borderTopColor: '#08080c', animation: 'freqSpin 0.8s linear infinite' }} />
                  ) : isPlaying ? (
                    <Pause size={27} fill="currentColor" />
                  ) : (
                    <Play size={27} fill="currentColor" style={{ marginLeft: '3px' }} />
                  )}
                </button>

                <button
                  onClick={onNext}
                  title="Next"
                  style={{ color: 'var(--text-primary)', transition: 'transform 0.1s' }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.9)'; }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <SkipForward size={24} fill="currentColor" />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '24px', paddingLeft: '24px' }}>
                <button
                  onClick={onToggleRepeat}
                  title={`Repeat: ${repeatMode}`}
                  style={{
                    color: repeatMode !== 'OFF' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    transition: 'color 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  {repeatMode === 'ONE' ? <Repeat1 size={20} /> : <Repeat size={20} />}
                </button>

                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowSleep(v => !v)}
                    title={sleepMode === 'off' ? 'Sleep timer' : `Sleep: ${sleepMode === 'end' ? 'end of track' : formatTime(sleepRemainingSec) + ' left'}`}
                    style={{
                      color: sleepMode !== 'off' ? 'var(--text-primary)' : 'var(--text-muted)',
                      transition: 'color 0.15s, transform 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    <Timer size={18} />
                    {sleepMode === 'timer' && sleepRemainingSec > 0 && (
                      <span style={{ fontSize: '10.5px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {formatTime(sleepRemainingSec)}
                      </span>
                    )}
                    {sleepMode === 'end' && (
                      <span style={{ fontSize: '10.5px', fontWeight: 700 }}>1</span>
                    )}
                  </button>
                {showSleep && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 12px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'rgba(12, 12, 17, 0.97)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid var(--line-strong)',
                      borderRadius: '13px',
                      padding: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1px',
                      minWidth: '156px',
                      boxShadow: '0 20px 48px rgba(0, 0, 0, 0.6)',
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
                            padding: '8px 11px',
                            borderRadius: '8px',
                            fontSize: '12.5px',
                            fontWeight: active ? 650 : 500,
                            color: active ? '#fff' : 'var(--text-secondary)',
                            backgroundColor: active ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                            textAlign: 'left',
                          }}
                          onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
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
            </div>

            {/* Audio flavor segmented control */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '3px', borderRadius: '999px', border: '1px solid var(--line)', background: 'rgba(255, 255, 255, 0.035)' }}>
              {flavors.map(f => {
                const active = audioMode === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => onAudioModeChange(f.id)}
                    style={{
                      padding: '5px 16px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 650,
                      letterSpacing: '-0.005em',
                      backgroundColor: active ? '#f2f2f4' : 'transparent',
                      color: active ? '#0a0a0f' : 'var(--text-muted)',
                      border: '1px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text-primary)'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Up Next panel */}
        {panelVisible && (
          <div
            className="np-queue"
            style={{
              position: 'absolute',
              right: '22px',
              top: '84px',
              bottom: '5vh',
              zIndex: 20,
              backgroundColor: 'rgba(11, 11, 16, 0.94)',
              backdropFilter: 'blur(26px) saturate(150%)',
              WebkitBackdropFilter: 'blur(26px) saturate(150%)',
              border: '1px solid var(--line-strong)',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.65)',
              borderRadius: '20px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              overflow: 'hidden',
              animation: panelClosing
                ? 'freqSlideOutRight 0.22s ease'
                : 'freqSlideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '0 2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ListMusic size={14} color="var(--text-muted)" />
                <span className="fq-h3" style={{ fontSize: '14px' }}>Up next</span>
              </div>
              <span className="fq-chip" style={{ height: '20px', fontSize: '9.5px' }}>{upcoming.length}</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px', minHeight: 0, margin: '0 -4px', padding: '0 4px' }}>
              {upcoming.map((track, i) => {
                const actualIndex = queueIndex + 1 + i;
                const isFirst = i === 0;
                const isLast = i === upcoming.length - 1;
                return (
                  <div
                    key={`${track.id}_${actualIndex}`}
                    className="np-queue-row"
                    onClick={() => onSelectQueueTrack?.(actualIndex)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '7px 8px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      animation: 'freqRiseIn 0.3s ease both',
                      animationDelay: `${Math.min(i, 12) * 30}ms`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.055)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <SquareArt
                      src={track.artworkUrl || freqIcon}
                      videoId={track.id}
                      alt={track.title}
                      fit="cover"
                      style={{ width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0 }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      <span className="fq-ttitle" style={{ fontSize: '12.5px' }}>{track.title}</span>
                      <span className="fq-tsub">{track.artist}</span>
                    </div>
                    <span className="np-queue-time">
                      {formatTime(track.durationSeconds)}
                    </span>
                    {(onMoveQueueTrack || onRemoveQueueTrack) && (
                      <span className="np-queue-tools">
                        {onMoveQueueTrack && (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); if (!isFirst) onMoveQueueTrack(actualIndex, actualIndex - 1); }}
                              disabled={isFirst}
                              title="Move up"
                              className="fq-icon-btn"
                              style={{ width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0, opacity: isFirst ? 0.25 : 1 }}
                            >
                              <ChevronUp size={13} />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); if (!isLast) onMoveQueueTrack(actualIndex, actualIndex + 1); }}
                              disabled={isLast}
                              title="Move down"
                              className="fq-icon-btn"
                              style={{ width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0, opacity: isLast ? 0.25 : 1 }}
                            >
                              <ChevronDown size={13} />
                            </button>
                          </>
                        )}
                        {onRemoveQueueTrack && (
                          <button
                            onClick={e => { e.stopPropagation(); onRemoveQueueTrack(actualIndex); }}
                            title="Remove"
                            className="fq-icon-btn"
                            style={{ width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0 }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = ''; }}
                          >
                            <X size={13} />
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                );
              })}
              {upcoming.length === 0 && (
                <div style={{
                  textAlign: 'center', padding: '30px 14px', borderRadius: '13px',
                  border: '1px dashed var(--line-strong)',
                  color: 'var(--text-muted)', fontSize: '12.5px', lineHeight: 1.6,
                }}>
                  Queue is empty.<br />Vibe autoplay will fill Up Next.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
};
