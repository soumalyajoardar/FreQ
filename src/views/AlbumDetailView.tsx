import React, { useEffect, useState } from 'react';
import { ArrowLeft, Play, Shuffle, Heart, Disc } from 'lucide-react';
import { AlbumDetails, MediaTrack } from '../types';
import { ytMusicService } from '../services/ytmusic';
import { formatTime } from '../components/PlayerBar';

interface AlbumDetailViewProps {
  albumId: string;
  onBack: () => void;
  onPlayTrack: (track: MediaTrack, playlist: MediaTrack[]) => void;
  onShufflePlay: (tracks: MediaTrack[]) => void;
  onToggleLike: (track: MediaTrack) => void;
  isLiked: (trackId: string) => boolean;
}

export const AlbumDetailView: React.FC<AlbumDetailViewProps> = ({
  albumId,
  onBack,
  onPlayTrack,
  onShufflePlay,
  onToggleLike,
  isLiked,
}) => {
  const [album, setAlbum] = useState<AlbumDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    ytMusicService.getAlbum(albumId).then(res => {
      if (isMounted) {
        setAlbum(res);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [albumId]);

  if (isLoading) {
    return (
      <div style={{ padding: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <span>Loading album details...</span>
      </div>
    );
  }

  if (!album) {
    return (
      <div style={{ padding: '40px', color: 'var(--text-muted)' }}>
        <button onClick={onBack} style={{ color: 'var(--accent-cyan)', marginBottom: '16px' }}>← Back</button>
        <div>Album not found.</div>
      </div>
    );
  }

  const tracks = album.tracks || [];

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
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

      {/* Album Header */}
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
          {album.artworkUrl ? (
            <img src={album.artworkUrl} alt={album.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Disc size={60} color="var(--text-muted)" />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
            Album
          </span>
          <h1 style={{ fontSize: '34px', fontWeight: 900, color: '#f8fafc', lineHeight: 1.1 }}>
            {album.title}
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {album.artist} {album.year ? `• ${album.year}` : ''}
          </p>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {tracks.length} tracks
          </span>

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
                background: 'linear-gradient(135deg, #00e5ff 0%, #8b5cf6 100%)',
                color: '#090A0F',
                fontWeight: 700,
                fontSize: '13px',
                boxShadow: '0 0 16px rgba(0, 229, 255, 0.4)',
              }}
            >
              <Play size={16} fill="#090A0F" />
              <span>Play Album</span>
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
              }}
            >
              <Shuffle size={15} />
              <span>Shuffle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tracklist Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
              style={{ display: 'flex', flexDirection: 'column', flex: 1, cursor: 'pointer', overflow: 'hidden' }}
            >
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {track.title}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {track.artist}
              </span>
            </div>

            <span style={{ width: '70px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(track.durationSeconds)}
            </span>

            <div style={{ width: '60px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <button
                onClick={() => onToggleLike(track)}
                style={{ color: isLiked(track.id) ? '#ec4899' : 'var(--text-muted)', padding: '4px' }}
              >
                <Heart size={16} fill={isLiked(track.id) ? '#ec4899' : 'transparent'} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
