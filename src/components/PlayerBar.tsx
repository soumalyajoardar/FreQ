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
import { AudioMode, MediaTrack, RepeatMode } from '../types';
import { FlatScrubber } from './FlatScrubber';
import { SquareArt } from './SquareArt';
import freqIcon from '../assets/freq-icon.png';

interface PlayerBarProps {
  currentTrack: MediaTrack | null;
  isPlaying: boolean;
  isLoading?: boolean;
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
  onStop: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLike: () => void;
  onAudioModeChange: (mode: AudioMode) => void;
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
  audioMode,
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
  onAudioModeChange,
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

  const displayPosition = isSeeking ? seekVal : position;

  const cycleFlavor = () => {
    if (audioMode === 'SNR') onAudioModeChange('NORMAL');
    else if (audioMode === 'NORMAL') onAudioModeChange('NIGHTCORE');
    else onAudioModeChange('SNR');
  };

  return (
    <footer
      className="liquid-bar"
      style={{
        height: 'var(--playerbar-height, 88px)',
        backgroundColor: 'rgba(8, 9, 14, 0.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid rgba(255, 255, 255, 0.07)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'relative',
        zIndex: 50,
        animation: 'freqSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        userSelect: 'none',
      }}
    >
      {/* Left: Track Info & Like */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '28%', minWidth: '220px' }}>
        {currentTrack ? (
          <>
            <div
              onClick={onOpenNowPlaying}
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                cursor: 'pointer',
                flexShrink: 0,
                position: 'relative',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {currentTrack.artworkUrl ? (
                <SquareArt
                  src={currentTrack.artworkUrl}
                  videoId={currentTrack.id}
                  alt={currentTrack.title}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <img
                  src={freqIcon}
                  alt="FreQ"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, justifyContent: 'center' }}>
              <span
                onClick={onOpenNowPlaying}
                title={currentTrack.title}
                style={{
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: '#f0f2f5',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  letterSpacing: '0.1px',
                }}
              >
                {currentTrack.title}
              </span>
              <span
                title={currentTrack.artist}
                style={{
                  fontSize: '11.5px',
                  color: 'var(--text-secondary, #8b93a6)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginTop: '1px',
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
                color: isLiked ? '#ec4899' : 'var(--text-secondary, #8b93a6)',
                transition: 'transform 0.15s ease, color 0.15s ease',
                flexShrink: 0,
                marginLeft: '2px',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <Heart size={18} fill={isLiked ? '#ec4899' : 'transparent'} strokeWidth={isLiked ? 0 : 2} />
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            />
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted, #5c6478)' }}>Ready to play</span>
          </div>
        )}
      </div>

      {/* Center: Controls & Scrubber */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '7px',
          width: '44%',
          maxWidth: '580px',
        }}
      >
        {/* Playback Button Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <button
            onClick={isPartyGuest ? undefined : onToggleShuffle}
            disabled={isPartyGuest}
            title={isPartyGuest ? 'Controlled by party host' : (isShuffle ? 'Shuffle enabled' : 'Shuffle disabled')}
            style={{
              color: isShuffle ? 'var(--accent-cyan, #1ed760)' : 'var(--text-secondary, #8b93a6)',
              opacity: isPartyGuest ? 0.35 : 1,
              cursor: isPartyGuest ? 'not-allowed' : 'pointer',
              transition: 'color 0.15s ease, transform 0.1s ease',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={e => { if (!isPartyGuest) e.currentTarget.style.transform = 'scale(1.1)'; }}
            onMouseLeave={e => { if (!isPartyGuest) e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <Shuffle size={16} />
          </button>

          <button
            onClick={isPartyGuest ? undefined : onPrev}
            disabled={isPartyGuest}
            title={isPartyGuest ? 'Controlled by party host' : 'Previous track'}
            style={{
              color: '#f0f2f5',
              opacity: isPartyGuest ? 0.35 : 1,
              cursor: isPartyGuest ? 'not-allowed' : 'pointer',
              transition: 'transform 0.1s ease',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseDown={e => { if (!isPartyGuest) e.currentTarget.style.transform = 'scale(0.9)'; }}
            onMouseUp={e => { if (!isPartyGuest) e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <SkipBack size={19} fill="currentColor" />
          </button>

          <button
            onClick={isPartyGuest ? undefined : onPlayPause}
            disabled={isPartyGuest}
            title={isPartyGuest ? 'Controlled by party host' : (isPlaying ? 'Pause' : 'Play')}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              color: '#07080c',
              opacity: isPartyGuest ? 0.5 : 1,
              cursor: isPartyGuest ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isPartyGuest ? 'none' : '0 2px 12px rgba(255, 255, 255, 0.25)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseEnter={e => {
              if (!isPartyGuest) {
                e.currentTarget.style.transform = 'scale(1.06)';
                e.currentTarget.style.boxShadow = '0 3px 16px rgba(255, 255, 255, 0.4)';
              }
            }}
            onMouseLeave={e => {
              if (!isPartyGuest) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 12px rgba(255, 255, 255, 0.25)';
              }
            }}
          >
            {isLoading ? (
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid rgba(7, 8, 12, 0.25)', borderTopColor: '#07080c', animation: 'freqSpin 0.8s linear infinite' }} />
            ) : isPlaying ? (
              <Pause size={18} fill="#07080c" />
            ) : (
              <Play size={18} fill="#07080c" style={{ marginLeft: '2px' }} />
            )}
          </button>

          <button
            onClick={isPartyGuest ? undefined : onNext}
            disabled={isPartyGuest}
            title={isPartyGuest ? 'Controlled by party host' : 'Next track'}
            style={{
              color: '#f0f2f5',
              opacity: isPartyGuest ? 0.35 : 1,
              cursor: isPartyGuest ? 'not-allowed' : 'pointer',
              transition: 'transform 0.1s ease',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseDown={e => { if (!isPartyGuest) e.currentTarget.style.transform = 'scale(0.9)'; }}
            onMouseUp={e => { if (!isPartyGuest) e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <SkipForward size={19} fill="currentColor" />
          </button>

          <button
            onClick={isPartyGuest ? undefined : onToggleRepeat}
            disabled={isPartyGuest}
            title={isPartyGuest ? 'Controlled by party host' : `Repeat mode: ${repeatMode}`}
            style={{
              color: repeatMode !== 'OFF' ? 'var(--accent-cyan, #1ed760)' : 'var(--text-secondary, #8b93a6)',
              opacity: isPartyGuest ? 0.35 : 1,
              cursor: isPartyGuest ? 'not-allowed' : 'pointer',
              transition: 'color 0.15s ease, transform 0.1s ease',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={e => { if (!isPartyGuest) e.currentTarget.style.transform = 'scale(1.1)'; }}
            onMouseLeave={e => { if (!isPartyGuest) e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {repeatMode === 'ONE' ? <Repeat1 size={17} /> : <Repeat size={17} />}
          </button>

          <button
            onClick={isPartyGuest ? undefined : onStop}
            disabled={isPartyGuest}
            title={isPartyGuest ? 'Controlled by party host' : 'Stop playback'}
            style={{
              color: 'var(--text-muted, #5c6478)',
              opacity: isPartyGuest ? 0.35 : 1,
              cursor: isPartyGuest ? 'not-allowed' : 'pointer',
              transition: 'color 0.15s ease, transform 0.15s ease',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={e => { if (!isPartyGuest) { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.transform = 'scale(1.1)'; } }}
            onMouseLeave={e => { if (!isPartyGuest) { e.currentTarget.style.color = 'var(--text-muted, #5c6478)'; e.currentTarget.style.transform = 'scale(1)'; } }}
          >
            <X size={15} strokeWidth={2.2} />
          </button>
        </div>

        {/* Scrubber Timeline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', width: '100%' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary, #8b93a6)', width: '38px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(displayPosition)}
          </span>

          <FlatScrubber
            value={displayPosition}
            max={duration}
            disabled={isPartyGuest}
            ariaLabel="Seek track position"
            onSeek={isPartyGuest ? () => {} : onSeek}
            onScrub={isPartyGuest ? undefined : v => setSeekVal(v)}
            onScrubStart={isPartyGuest ? undefined : () => { setIsSeeking(true); setSeekVal(position); }}
            onScrubEnd={isPartyGuest ? undefined : v => { setIsSeeking(false); onSeek(v); }}
          />

          <span style={{ fontSize: '11px', color: 'var(--text-secondary, #8b93a6)', width: '38px', textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: Audio Flavor Pill, Lyrics, Volume, Fullscreen, Pin */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '28%', justifyContent: 'flex-end' }}>
        {/* Audio Flavor Pill Switcher */}
        <button
          onClick={cycleFlavor}
          title={`Click to cycle flavor. Current: ${audioMode}`}
          style={{
            padding: '3px 8px',
            borderRadius: '999px',
            fontSize: '10.5px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            background:
              audioMode === 'SNR'
                ? 'rgba(139, 92, 246, 0.18)'
                : audioMode === 'NIGHTCORE'
                ? 'rgba(236, 72, 153, 0.18)'
                : 'rgba(30, 215, 96, 0.18)',
            border:
              audioMode === 'SNR'
                ? '1px solid rgba(139, 92, 246, 0.35)'
                : audioMode === 'NIGHTCORE'
                ? '1px solid rgba(236, 72, 153, 0.35)'
                : '1px solid rgba(30, 215, 96, 0.35)',
            color:
              audioMode === 'SNR'
                ? 'var(--accent-violet, #8b5cf6)'
                : audioMode === 'NIGHTCORE'
                ? 'var(--accent-pink, #ec4899)'
                : 'var(--accent-cyan, #1ed760)',
            transition: 'all 0.15s ease',
          }}
        >
          {audioMode}
        </button>

        {/* HD & 3D Spatial Audio Enhancement Badge */}
        <span
          title="HD Audio Clarity & 3D Stereo Spatializer Active (Tune in Settings)"
          style={{
            fontSize: '9px',
            fontWeight: 800,
            letterSpacing: '0.6px',
            color: '#00d2ff',
            backgroundColor: 'rgba(0, 210, 255, 0.12)',
            border: '1px solid rgba(0, 210, 255, 0.28)',
            padding: '3px 6px',
            borderRadius: '5px',
            userSelect: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          HD • 3D
        </span>

        {/* Lyrics Button */}
        <button
          onClick={() => (onToggleLyrics ? onToggleLyrics() : onOpenNowPlaying())}
          title="Synced Lyrics"
          style={{
            color: isLyricsActive ? '#fff' : 'var(--text-secondary, #8b93a6)',
            transition: 'color 0.15s ease',
            display: 'flex',
            alignItems: 'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.color = isLyricsActive ? '#fff' : 'var(--text-secondary, #8b93a6)'; }}
        >
          <LyricsIcon
            size={17}
            style={isLyricsActive ? { filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.9))' } : undefined}
          />
        </button>

        {/* Listen Together Party Button */}
        {onOpenParty && (
          <button
            onClick={onOpenParty}
            title={isInParty ? `Party active (${partyMembersCount}/5 listeners)` : 'Listen Together (Party)'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              color: isInParty ? '#1ed760' : 'var(--text-secondary, #8b93a6)',
              padding: isInParty ? '3px 8px' : '4px',
              borderRadius: '999px',
              backgroundColor: isInParty ? 'rgba(30, 215, 96, 0.15)' : 'transparent',
              border: isInParty ? '1px solid rgba(30, 215, 96, 0.35)' : 'none',
              transition: 'all 0.15s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              if (!isInParty) e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={e => {
              if (!isInParty) e.currentTarget.style.color = 'var(--text-secondary, #8b93a6)';
            }}
          >
            <Radio size={16} color={isInParty ? '#1ed760' : 'currentColor'} strokeWidth={isInParty ? 2.5 : 1.8} />
            {isInParty && (
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#1ed760' }}>
                {partyMembersCount}/5
              </span>
            )}
          </button>
        )}

        {/* Volume Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <button
            onClick={onToggleMute}
            style={{ color: 'var(--text-secondary, #8b93a6)', transition: 'color 0.15s ease', display: 'flex', alignItems: 'center' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary, #8b93a6)'; }}
          >
            {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          <div style={{ width: '92px' }}>
            <FlatScrubber
              value={isMuted ? 0 : volume}
              max={1}
              step={0.02}
              height={4}
              ariaLabel="Volume"
              onSeek={onVolumeChange}
            />
          </div>
        </div>

        {/* Expand Now Playing Button */}
        <button
          onClick={onOpenNowPlaying}
          title="Full Screen Player"
          style={{
            color: 'var(--text-secondary, #8b93a6)',
            transition: 'color 0.15s ease, transform 0.1s ease',
            display: 'flex',
            alignItems: 'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(1.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary, #8b93a6)'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <Maximize2 size={16} />
        </button>

        {/* Always-on-top pin */}
        {onToggleAlwaysOnTop && (
          <button
            onClick={onToggleAlwaysOnTop}
            title={alwaysOnTop ? 'Unpin window (always on top off)' : 'Pin window always on top'}
            style={{
              color: alwaysOnTop ? 'var(--accent-cyan, #1ed760)' : 'var(--text-secondary, #8b93a6)',
              transition: 'color 0.15s ease, transform 0.15s ease',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(1.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = alwaysOnTop ? 'var(--accent-cyan, #1ed760)' : 'var(--text-secondary, #8b93a6)'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <Pin size={16} fill={alwaysOnTop ? 'var(--accent-cyan, #1ed760)' : 'transparent'} />
          </button>
        )}
      </div>
    </footer>
  );
};
