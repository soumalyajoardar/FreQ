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
  ListMusic,
  FileText,
} from 'lucide-react';
import { AudioMode, MediaTrack, RepeatMode } from '../types';

interface PlayerBarProps {
  currentTrack: MediaTrack | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  audioMode: AudioMode;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  isLiked: boolean;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLike: () => void;
  onAudioModeChange: (mode: AudioMode) => void;
  onOpenNowPlaying: () => void;
  onToggleQueue: () => void;
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
  position,
  duration,
  volume,
  isMuted,
  audioMode,
  isShuffle,
  repeatMode,
  isLiked,
  onPlayPause,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLike,
  onAudioModeChange,
  onOpenNowPlaying,
  onToggleQueue,
}) => {
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekVal, setSeekVal] = useState(0);

  const displayPosition = isSeeking ? seekVal : position;
  const progressPercent = duration > 0 ? (displayPosition / duration) * 100 : 0;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeekVal(parseFloat(e.target.value));
  };

  const handleSeekMouseDown = () => {
    setIsSeeking(true);
    setSeekVal(position);
  };

  const handleSeekMouseUp = () => {
    setIsSeeking(false);
    onSeek(seekVal);
  };

  const cycleFlavor = () => {
    if (audioMode === 'NORMAL') onAudioModeChange('SNR');
    else if (audioMode === 'SNR') onAudioModeChange('NIGHTCORE');
    else onAudioModeChange('NORMAL');
  };

  return (
    <footer
      style={{
        height: 'var(--playerbar-height)',
        backgroundColor: 'rgba(14, 16, 24, 0.88)',
        backdropFilter: 'blur(30px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'relative',
        zIndex: 50,
      }}
    >
      {/* Left: Track Info & Like */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '30%', minWidth: '220px' }}>
        {currentTrack ? (
          <>
            <div
              onClick={onOpenNowPlaying}
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '10px',
                overflow: 'hidden',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                cursor: 'pointer',
                flexShrink: 0,
                position: 'relative',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
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
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span
                onClick={onOpenNowPlaying}
                title={currentTrack.title}
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                {currentTrack.title}
              </span>
              <span
                title={currentTrack.artist}
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {currentTrack.artist}
              </span>
            </div>

            <button
              onClick={onToggleLike}
              title={isLiked ? 'Remove from Liked' : 'Save to Liked'}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isLiked ? '#ec4899' : 'var(--text-secondary)',
                transition: 'transform 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <Heart size={18} fill={isLiked ? '#ec4899' : 'transparent'} />
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            />
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No track playing</span>
          </div>
        )}
      </div>

      {/* Center: Controls & Scrubber */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          width: '40%',
          maxWidth: '560px',
        }}
      >
        {/* Playback Button Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <button
            onClick={onToggleShuffle}
            title={isShuffle ? 'Shuffle enabled' : 'Shuffle disabled'}
            style={{
              color: isShuffle ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              transition: 'color 0.15s',
            }}
          >
            <Shuffle size={16} />
          </button>

          <button
            onClick={onPrev}
            title="Previous track"
            style={{
              color: 'var(--text-primary)',
              transition: 'transform 0.1s',
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.9)'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <SkipBack size={20} fill="currentColor" />
          </button>

          <button
            onClick={onPlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00e5ff 0%, #8b5cf6 100%)',
              color: '#090A0F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(0, 229, 255, 0.5)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.06)';
              e.currentTarget.style.boxShadow = '0 0 22px rgba(0, 229, 255, 0.7)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 0 16px rgba(0, 229, 255, 0.5)';
            }}
          >
            {isPlaying ? <Pause size={20} fill="#090A0F" /> : <Play size={20} fill="#090A0F" style={{ marginLeft: '2px' }} />}
          </button>

          <button
            onClick={onNext}
            title="Next track"
            style={{
              color: 'var(--text-primary)',
              transition: 'transform 0.1s',
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.9)'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <SkipForward size={20} fill="currentColor" />
          </button>

          <button
            onClick={onToggleRepeat}
            title={`Repeat mode: ${repeatMode}`}
            style={{
              color: repeatMode !== 'OFF' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              transition: 'color 0.15s',
            }}
          >
            {repeatMode === 'ONE' ? <Repeat1 size={17} /> : <Repeat size={17} />}
          </button>
        </div>

        {/* Scrubber Timeline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', width: '36px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(displayPosition)}
          </span>

          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <input
              type="range"
              min="0"
              max={duration > 0 ? duration : 100}
              step="0.5"
              value={displayPosition}
              onChange={handleSeekChange}
              onMouseDown={handleSeekMouseDown}
              onMouseUp={handleSeekMouseUp}
              style={{
                width: '100%',
                height: '4px',
                appearance: 'none',
                WebkitAppearance: 'none',
                background: `linear-gradient(to right, #00e5ff 0%, #8b5cf6 ${progressPercent}%, rgba(255, 255, 255, 0.12) ${progressPercent}%, rgba(255, 255, 255, 0.12) 100%)`,
                borderRadius: '999px',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
          </div>

          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', width: '36px', textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: Audio Flavor Pill, Lyrics, Queue, Volume, Fullscreen */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '30%', justifyContent: 'flex-end' }}>
        {/* Audio Flavor Pill Switcher */}
        <button
          onClick={cycleFlavor}
          title={`Click to cycle flavor. Current: ${audioMode}`}
          style={{
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            background:
              audioMode === 'SNR'
                ? 'rgba(139, 92, 246, 0.2)'
                : audioMode === 'NIGHTCORE'
                ? 'rgba(236, 72, 153, 0.2)'
                : 'rgba(0, 229, 255, 0.15)',
            border:
              audioMode === 'SNR'
                ? '1px solid rgba(139, 92, 246, 0.4)'
                : audioMode === 'NIGHTCORE'
                ? '1px solid rgba(236, 72, 153, 0.4)'
                : '1px solid rgba(0, 229, 255, 0.3)',
            color:
              audioMode === 'SNR'
                ? 'var(--accent-violet)'
                : audioMode === 'NIGHTCORE'
                ? 'var(--accent-pink)'
                : 'var(--accent-cyan)',
            transition: 'all 0.15s ease',
          }}
        >
          {audioMode}
        </button>

        {/* Lyrics Button */}
        <button
          onClick={onOpenNowPlaying}
          title="Synced Lyrics"
          style={{
            color: 'var(--text-secondary)',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-cyan)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <FileText size={18} />
        </button>

        {/* Queue Button */}
        <button
          onClick={onToggleQueue}
          title="Up Next Queue"
          style={{
            color: 'var(--text-secondary)',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-cyan)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <ListMusic size={19} />
        </button>

        {/* Volume Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onToggleMute}
            style={{ color: 'var(--text-secondary)', transition: 'color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={isMuted ? 0 : volume}
            onChange={e => onVolumeChange(parseFloat(e.target.value))}
            style={{
              width: '74px',
              height: '4px',
              appearance: 'none',
              WebkitAppearance: 'none',
              background: `linear-gradient(to right, #00e5ff 0%, #8b5cf6 ${(isMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.15) ${(isMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.15) 100%)`,
              borderRadius: '999px',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
        </div>

        {/* Expand Now Playing Button */}
        <button
          onClick={onOpenNowPlaying}
          title="Full Screen Player"
          style={{
            color: 'var(--text-secondary)',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <Maximize2 size={18} />
        </button>
      </div>
    </footer>
  );
};
