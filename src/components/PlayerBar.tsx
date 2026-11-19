import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
  Maximize2,
  Pin,
  X,
  Radio,
} from 'lucide-react';
import { LyricsIcon } from './LyricsIcon';
import { MediaTrack, RepeatMode } from '../types';
import { FlatScrubber } from './FlatScrubber';
import { SquareArt } from './SquareArt';
import { audioEngine } from '../services/audioEngine';
import { libraryStore } from '../services/libraryStore';
import freqIcon from '../assets/freq-icon.png';

const QUALITY_KEY = 'freq_quality_mode';
export const QUALITY_PRESET_EVENT = 'freq-quality-preset';

/** HD 3D keeps the signal untouched; QHD 4D is the fully enhanced preset. */
export function applyQualityPreset(mode: 'HD' | 'QHD') {
  const amount = mode === 'QHD' ? 1 : 0;
  audioEngine.setHdClarity(amount);
  audioEngine.setStereoWidth(amount);
  libraryStore.setHdClarity(amount);
  libraryStore.setStereoWidth(amount);
  try {
    localStorage.setItem(QUALITY_KEY, mode);
  } catch {
    // Ignored.
  }
  window.dispatchEvent(new Event(QUALITY_PRESET_EVENT));
}


interface PlayerBarProps {
  currentTrack: MediaTrack | null;
  isPlaying: boolean;
  isLoading?: boolean;
  position: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  isLiked: boolean;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onStop: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLike: () => void;
  onOpenNowPlaying: () => void;
  onToggleLyrics?: () => void;
  isLyricsActive?: boolean;
  alwaysOnTop?: boolean;
  onToggleAlwaysOnTop?: () => void;
  onOpenParty?: () => void;
  isInParty?: boolean;
  partyMembersCount?: number;
  isPartyGuest?: boolean;
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  currentTrack,
  isPlaying,
  isLoading = false,
  position,
  duration,
  volume,
  isMuted,
  isShuffle,
  repeatMode,
  isLiked,
  onPlayPause,
  onPrev,
  onNext,
  onStop,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLike,
  onOpenNowPlaying,
  onToggleLyrics,
  isLyricsActive = false,
  alwaysOnTop = false,
  onToggleAlwaysOnTop,
  onOpenParty,
  isInParty = false,
  partyMembersCount = 0,
  isPartyGuest = false,
}) => {
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekVal, setSeekVal] = useState(0);
  const [isQhd, setIsQhd] = useState<boolean>(() => {
    try {
      return localStorage.getItem(QUALITY_KEY) === 'QHD';
    } catch {
      return false;
    }
  });

  // Apply the stored preset once on mount so the sliders and the chip agree
  // after a restart (HD 3D => untouched signal, QHD 4D => full enhancement).
  React.useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(QUALITY_KEY);
    } catch {
      stored = null;
    }
    if (stored === 'QHD' || stored === 'HD') applyQualityPreset(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleQuality = () => {
    const next = !isQhd;
    setIsQhd(next);
    applyQualityPreset(next ? 'QHD' : 'HD');
  };

  const displayPosition = isSeeking ? seekVal : position;
  const lock = isPartyGuest;

  const art = currentTrack?.artworkUrl;

  return (
    <div className="fq-dock-wrap">
      <footer className="fq-dock">
        {art && <div className="fq-dock-glow" style={{ backgroundImage: `url(${art})` }} />}

        {/* Track */}
        <div className="fq-dock-track">
          <button
            onClick={onOpenNowPlaying}
            className="fq-dock-art"
            title="Open full screen player"
            style={{ padding: 0 }}
          >
            {currentTrack?.artworkUrl ? (
              <SquareArt
                src={currentTrack.artworkUrl}
                videoId={currentTrack.id}
                alt={currentTrack.title}
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <img src={freqIcon} alt="FreQ" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: '2px' }}>
            <button
              onClick={onOpenNowPlaying}
              title={currentTrack?.title}
              style={{
                fontSize: '13px',
                fontWeight: 620,
                letterSpacing: '-0.012em',
                color: 'var(--text-primary)',
                textAlign: 'left',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {currentTrack?.title || 'Nothing playing'}
            </button>
            <span
              title={currentTrack?.artist}
              style={{
                fontSize: '11.5px',
                color: 'var(--text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {currentTrack?.artist || 'Pick a track to begin'}
            </span>
          </div>

          <button
            onClick={onToggleLike}
            title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
            className="fq-ctrl fq-hide-sm"
            style={{
              color: isLiked ? 'var(--accent-cyan)' : 'var(--text-muted)',
              flexShrink: 0,
              marginLeft: '2px',
              padding: '4px',
            }}
          >
            <Heart size={16} fill={isLiked ? 'currentColor' : 'transparent'} strokeWidth={isLiked ? 0 : 1.9} />
          </button>
        </div>

        {/* Transport + timeline */}
        <div className="fq-dock-center">
          {/* 1fr | auto | 1fr — keeps the play button on the exact centre line
              even though the two side groups hold a different number of icons. */}
          <div className="fq-dock-controls">
            <div className="fq-dock-ctrl-group">
              <button
                onClick={lock ? undefined : onToggleShuffle}
                disabled={lock}
                title={lock ? 'Controlled by the party host' : isShuffle ? 'Shuffle on' : 'Shuffle off'}
                className={`fq-ctrl${isShuffle ? ' is-on' : ''}`}
                style={{ opacity: lock ? 0.35 : 1, cursor: lock ? 'not-allowed' : 'pointer' }}
              >
                <Shuffle size={14.5} />
              </button>

              <button
                onClick={lock ? undefined : onPrev}
                disabled={lock}
                title={lock ? 'Controlled by the party host' : 'Previous'}
                className="fq-ctrl"
                style={{ opacity: lock ? 0.35 : 1, cursor: lock ? 'not-allowed' : 'pointer' }}
              >
                <SkipBack size={18} fill="currentColor" />
              </button>
            </div>

            <button
              onClick={lock ? undefined : onPlayPause}
              disabled={lock}
              title={lock ? 'Controlled by the party host' : isPlaying ? 'Pause' : 'Play'}
              className={`fq-play-btn${isLoading ? ' is-loading' : ''}`}
              style={{ opacity: lock ? 0.5 : 1, cursor: lock ? 'not-allowed' : 'pointer' }}
            >
              {isLoading ? (
                <div
                  style={{
                    width: '17px',
                    height: '17px',
                    borderRadius: '50%',
                    border: '2px solid rgba(8, 8, 12, 0.22)',
                    borderTopColor: '#08080c',
                    animation: 'freqSpin 0.8s linear infinite',
                  }}
                />
              ) : isPlaying ? (
                <Pause size={17} fill="#08080c" />
              ) : (
                <Play size={17} fill="#08080c" style={{ marginLeft: '2px' }} />
              )}
            </button>

            <div className="fq-dock-ctrl-group">
              <button
                onClick={lock ? undefined : onNext}
                disabled={lock}
                title={lock ? 'Controlled by the party host' : 'Next'}
                className="fq-ctrl"
                style={{ opacity: lock ? 0.35 : 1, cursor: lock ? 'not-allowed' : 'pointer' }}
              >
                <SkipForward size={18} fill="currentColor" />
              </button>

              <button
                onClick={lock ? undefined : onToggleRepeat}
                disabled={lock}
                title={lock ? 'Controlled by the party host' : `Repeat: ${repeatMode.toLowerCase()}`}
                className={`fq-ctrl${repeatMode !== 'OFF' ? ' is-on' : ''}`}
                style={{ opacity: lock ? 0.35 : 1, cursor: lock ? 'not-allowed' : 'pointer' }}
              >
                {repeatMode === 'ONE' ? <Repeat1 size={15} /> : <Repeat size={15} />}
              </button>

              <button
                onClick={lock ? undefined : onStop}
                disabled={lock}
                title={lock ? 'Controlled by the party host' : 'Stop'}
                className="fq-ctrl"
                style={{ opacity: lock ? 0.35 : 1, cursor: lock ? 'not-allowed' : 'pointer' }}
              >
                <X size={13.5} strokeWidth={2.1} />
              </button>
            </div>
          </div>

          <div className="fq-timeline">
            <span
              className="fq-time fq-mono"
              style={{ fontSize: '10.5px', color: 'var(--text-muted)', width: '34px', textAlign: 'right' }}
            >
              {formatTime(displayPosition)}
            </span>
            <FlatScrubber
              value={displayPosition}
              max={duration}
              disabled={lock}
              ariaLabel="Seek track position"
              onSeek={lock ? () => {} : onSeek}
              onScrub={lock ? undefined : v => setSeekVal(v)}
              onScrubStart={lock ? undefined : () => { setIsSeeking(true); setSeekVal(position); }}
              onScrubEnd={lock ? undefined : v => { setIsSeeking(false); onSeek(v); }}
            />
            <span
              className="fq-time fq-mono"
              style={{ fontSize: '10.5px', color: 'var(--text-muted)', width: '34px', textAlign: 'left' }}
            >
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Utilities */}
        <div className="fq-dock-extra">
          <button
            onClick={handleToggleQuality}
            className="fq-chip fq-hide-md"
            title={isQhd
              ? 'QHD 4D — HD clarity and 3D spatializer boosted to 100% (Click for HD 3D)'
              : 'HD 3D — untouched signal, clarity and spatializer at 0% (Click for QHD 4D)'}
            style={{
              height: '24px',
              fontSize: '8.5px',
              letterSpacing: '0.1em',
              fontWeight: 700,
              borderColor: isQhd ? 'rgba(248, 113, 113, 0.4)' : 'var(--line)',
              backgroundColor: 'rgba(255, 255, 255, 0.035)',
              cursor: 'pointer',
              userSelect: 'none',
              animation: isQhd
                ? 'textBlinkRed 1s steps(1, end) infinite'
                : isPlaying
                  ? 'textBlinkGreen 1s steps(1, end) infinite'
                  : 'none',
              color: isQhd ? '#f87171' : isPlaying ? '#a855f7' : 'var(--text-muted)',
              textShadow: isQhd
                ? '0 0 8px rgba(248, 113, 113, 0.9), 0 0 16px rgba(248, 113, 113, 0.45)'
                : isPlaying
                  ? '0 0 8px rgba(var(--accent-rgb), 0.9), 0 0 16px rgba(var(--accent-rgb), 0.5)'
                  : 'none',
            }}
          >
            {isQhd ? 'QHD 4D' : 'HD 3D'}
          </button>

          <button
            onClick={() => (onToggleLyrics ? onToggleLyrics() : onOpenNowPlaying())}
            title="Synced lyrics"
            className="fq-ctrl"
            style={{ color: isLyricsActive ? '#fff' : 'var(--text-muted)' }}
          >
            <LyricsIcon size={16} />
          </button>

          {onOpenParty && (
            <button
              onClick={onOpenParty}
              title={isInParty ? `Party active — ${partyMembersCount}/5 listeners` : 'Listen Together'}
              className="fq-ctrl"
              style={{
                color: isInParty ? 'var(--accent-cyan)' : 'var(--text-muted)',
                gap: '4px',
                padding: isInParty ? '3px 8px' : '4px',
                borderRadius: '999px',
                backgroundColor: isInParty ? 'rgba(var(--accent-rgb), 0.12)' : 'transparent',
              }}
            >
              <Radio size={15} strokeWidth={isInParty ? 2.4 : 1.8} />
              {isInParty && <span style={{ fontSize: '10px', fontWeight: 800 }}>{partyMembersCount}/5</span>}
            </button>
          )}

          <div className="fq-hide-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button onClick={onToggleMute} title="Mute" className="fq-ctrl">
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <div className="playerbar-volume-slider" style={{ width: '78px' }}>
              <FlatScrubber
                value={isMuted ? 0 : volume}
                max={1}
                step={0.02}
                height={3}
                ariaLabel="Volume"
                onSeek={onVolumeChange}
              />
            </div>
          </div>

          <button onClick={onOpenNowPlaying} title="Full screen player" className="fq-ctrl">
            <Maximize2 size={15} />
          </button>

          {onToggleAlwaysOnTop && (
            <button
              onClick={onToggleAlwaysOnTop}
              title={alwaysOnTop ? 'Unpin window' : 'Pin window on top'}
              className="fq-ctrl"
              style={{ color: alwaysOnTop ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
            >
              <Pin size={15} fill={alwaysOnTop ? 'var(--accent-cyan)' : 'transparent'} />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
