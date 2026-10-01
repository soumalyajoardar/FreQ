import React from 'react';
import { ArrowLeft, Play, Shuffle, Heart, Trash2, Music, ChevronUp, ChevronDown, ListPlus } from 'lucide-react';
import { MediaTrack, UserPlaylist } from '../types';
import { formatTime } from '../components/PlayerBar';
import { SquareArt } from '../components/SquareArt';
import { SafeArtwork } from '../components/SafeArtwork';

interface PlaylistDetailViewProps {
  title: string;
  description?: string;
  artworkUrl?: string | null;
  tracks: MediaTrack[];
  onBack: () => void;
  onPlayTrack: (track: MediaTrack, playlist: MediaTrack[]) => void;
  onShufflePlay: (tracks: MediaTrack[]) => void;
  onToggleLike: (track: MediaTrack) => void;
  isLiked: (trackId: string) => boolean;
  onRemoveTrack?: (trackId: string) => void;
  onMoveTrack?: (fromIndex: number, toIndex: number) => void;
  onPlayNext?: (track: MediaTrack) => void;
  isLikedView?: boolean;
}

export const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({
  title,
  description,
  artworkUrl,
  tracks,
  onBack,
  onPlayTrack,
  onShufflePlay,
  onToggleLike,
  isLiked,
  onRemoveTrack,
  onMoveTrack,
  onPlayNext,
  isLikedView = false,
}) => {
  const totalSeconds = tracks.reduce((acc, t) => acc + (t.durationSeconds || 0), 0);
  const totalDurationStr = formatTime(totalSeconds);

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '28px' }} className="view-enter">
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--text-secondary)',
          width: 'fit-content',
          padding: '6px 12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
        }}
      >
        <ArrowLeft size={16} />
        <span style={{ fontSize: '13px', fontWeight: 600 }}>Back</span>
      </button>

      {/* Playlist Hero Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '28px' }}>
        <div
          style={{
            width: '180px',
            height: '180px',
            borderRadius: '16px',
            overflow: 'hidden',
            backgroundColor: '#1b1e2e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            flexShrink: 0,
          }}
        >
          {artworkUrl ? (
            <SquareArt src={artworkUrl} alt={title} style={{ width: '100%', height: '100%' }} />
          ) : isLikedView ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Heart size={64} fill="#fff" color="#fff" />
            </div>
          ) : (
            <Music size={54} color="var(--text-muted)" />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
            {isLikedView ? 'Favorite Collection' : 'Playlist'}
          </span>
          <h1 style={{ fontSize: '36px', fontWeight: 900, color: '#f8fafc', lineHeight: 1.1 }}>
            {title}
          </h1>
          {description && (
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {description}
            </p>
          )}
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
            {tracks.length} tracks • {totalDurationStr} total
          </span>

          {/* Action Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '12px' }}>
            <button
              onClick={() => tracks.length > 0 && onPlayTrack(tracks[0], tracks)}
              disabled={tracks.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                borderRadius: '999px',
                backgroundColor: '#f8fafc',
                color: '#090A0F',
                fontWeight: 700,
                fontSize: '13px',
                boxShadow: '0 0 16px rgba(255, 255, 255, 0.4)',
                opacity: tracks.length === 0 ? 0.5 : 1,
              }}
            >
              <Play size={16} fill="#090A0F" />
              <span>Play All</span>
            </button>

            <button
              onClick={() => tracks.length > 0 && onShufflePlay(tracks)}
              disabled={tracks.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '999px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '13px',
                opacity: tracks.length === 0 ? 0.5 : 1,
              }}
            >
              <Shuffle size={15} />
              <span>Shuffle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tracks Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 16px',
            color: 'var(--text-muted)',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <span style={{ width: '36px' }}>#</span>
          <span style={{ flex: 1 }}>Title</span>
          <span style={{ width: '220px' }}>Album</span>
          <span style={{ width: '70px', textAlign: 'right' }}>Time</span>
          <span style={{ width: '120px', textAlign: 'right' }}>Actions</span>
        </div>

        {tracks.map((track, idx) => (
          <div
            key={track.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 16px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.03)',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'; }}
          >
            <span style={{ width: '36px', fontSize: '13px', color: 'var(--text-muted)' }}>
              {idx + 1}
            </span>

            <div
              onClick={() => onPlayTrack(track, tracks)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, cursor: 'pointer', overflow: 'hidden' }}
            >
              <SquareArt
                src={track.artworkUrl}
                videoId={track.id}
                alt={track.title}
                style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {track.title}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {track.artist}
                </span>
              </div>
            </div>

            <span style={{ width: '220px', fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {track.album}
            </span>

            <span style={{ width: '70px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(track.durationSeconds)}
            </span>

            <div style={{ width: '120px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px' }}>
              {onMoveTrack && (
                <>
                  <button
                    onClick={() => idx > 0 && onMoveTrack(idx, idx - 1)}
                    disabled={idx === 0}
                    title="Move up"
                    style={{ color: idx === 0 ? 'rgba(255,255,255,0.15)' : 'var(--text-muted)', padding: '5px' }}
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    onClick={() => idx < tracks.length - 1 && onMoveTrack(idx, idx + 1)}
                    disabled={idx === tracks.length - 1}
                    title="Move down"
                    style={{ color: idx === tracks.length - 1 ? 'rgba(255,255,255,0.15)' : 'var(--text-muted)', padding: '5px' }}
                  >
                    <ChevronDown size={15} />
                  </button>
                </>
              )}
              {onPlayNext && (
                <button
                  onClick={() => onPlayNext(track)}
                  title="Play next"
                  style={{ color: 'var(--accent-cyan)', padding: '5px' }}
                >
                  <ListPlus size={15} />
                </button>
              )}
              <button
                onClick={() => onToggleLike(track)}
                title={isLiked(track.id) ? 'Unlike' : 'Like'}
                style={{ color: isLiked(track.id) ? '#ec4899' : 'var(--text-muted)', padding: '5px' }}
              >
                <Heart size={16} fill={isLiked(track.id) ? '#ec4899' : 'transparent'} />
              </button>

              {onRemoveTrack && (
                <button
                  onClick={() => onRemoveTrack(track.id)}
                  title="Remove from playlist"
                  style={{ color: 'var(--text-muted)', padding: '5px' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        ))}

        {tracks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
            No songs in this playlist yet. Add songs from Search or Home!
          </div>
        )}
      </div>
    </div>
  );
};
