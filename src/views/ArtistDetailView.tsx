import React, { useEffect, useState } from 'react';
import { ArrowLeft, Play, Disc } from 'lucide-react';
import { ArtistDetails, MediaTrack } from '../types';
import { ytMusicService } from '../services/ytmusic';
import { formatTime } from '../components/PlayerBar';

interface ArtistDetailViewProps {
  artistId: string;
  onBack: () => void;
  onPlayTrack: (track: MediaTrack, playlist: MediaTrack[]) => void;
  onOpenAlbum: (albumId: string) => void;
}

export const ArtistDetailView: React.FC<ArtistDetailViewProps> = ({
  artistId,
  onBack,
  onPlayTrack,
  onOpenAlbum,
}) => {
  const [artist, setArtist] = useState<ArtistDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    ytMusicService.getArtist(artistId).then(res => {
      if (isMounted) {
        setArtist(res);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [artistId]);

  if (isLoading) {
    return (
      <div style={{ padding: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <span>Loading artist profile...</span>
      </div>
    );
  }

  if (!artist) {
    return (
      <div style={{ padding: '40px', color: 'var(--text-muted)' }}>
        <button onClick={onBack} style={{ color: 'var(--accent-cyan)', marginBottom: '16px' }}>← Back</button>
        <div>Artist not found.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
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

      {/* Artist Hero Banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <div
          style={{
            width: '160px',
            height: '160px',
            borderRadius: '50%',
            overflow: 'hidden',
            backgroundColor: '#1b1e2e',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.5)',
            border: '2px solid rgba(0, 229, 255, 0.3)',
            flexShrink: 0,
          }}
        >
          {artist.artworkUrl && (
            <img src={artist.artworkUrl} alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
            Verified Artist
          </span>
          <h1 style={{ fontSize: '38px', fontWeight: 900, color: '#f8fafc', lineHeight: 1.1 }}>
            {artist.name}
          </h1>
          {artist.description && (
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '640px', lineHeight: 1.5 }}>
              {artist.description}
            </p>
          )}
        </div>
      </div>

      {/* Top Songs */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
          Top Songs
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {artist.topSongs.map((track, idx) => (
            <div
              key={track.id}
              onClick={() => onPlayTrack(track, artist.topSongs)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.03)',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', width: '20px', textAlign: 'center' }}>
                  {idx + 1}
                </span>
                <img
                  src={track.artworkUrl || ''}
                  alt={track.title}
                  style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {track.title}
                </span>
              </div>

              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {formatTime(track.durationSeconds)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Discography / Albums */}
      {artist.albums && artist.albums.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Discography
          </h2>

          <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
            {artist.albums.map(alb => (
              <div
                key={alb.id}
                onClick={() => onOpenAlbum(alb.id)}
                style={{
                  width: '160px',
                  flexShrink: 0,
                  padding: '12px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ width: '100%', aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#1b1e2e' }}>
                  {alb.artworkUrl ? (
                    <img src={alb.artworkUrl} alt={alb.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Disc size={40} color="var(--text-muted)" />
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {alb.title}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {alb.year || 'Album'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
