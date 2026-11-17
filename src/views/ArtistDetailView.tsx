import React, { useEffect, useState } from 'react';
import { ArrowLeft, Play, Disc } from 'lucide-react';
import { ArtistDetails, MediaTrack } from '../types';
import { ytMusicService } from '../services/ytmusic';
import { formatTime } from '../components/PlayerBar';
import { SquareArt } from '../components/SquareArt';

interface ArtistDetailViewProps {
  artistId: string;
  onBack: () => void;
  onPlayTrack: (track: MediaTrack, playlist: MediaTrack[]) => void;
  onOpenAlbum: (albumId: string) => void;
  onTrackContextMenu?: (e: React.MouseEvent, track: MediaTrack) => void;
}

export const ArtistDetailView: React.FC<ArtistDetailViewProps> = ({
  artistId,
  onBack,
  onPlayTrack,
  onOpenAlbum,
  onTrackContextMenu,
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
      <div className="fq-view" style={{ paddingTop: '80px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
        Loading artist…
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="fq-view" style={{ paddingTop: '60px' }}>
        <button onClick={onBack} className="fq-back">
          <ArrowLeft size={14} />
          Back
        </button>
        <div style={{ marginTop: '20px', color: 'var(--text-muted)' }}>Artist not found.</div>
      </div>
    );
  }

  return (
    <div className="fq-view view-enter" style={{ display: 'flex', flexDirection: 'column', gap: '36px', paddingTop: '18px' }}>
      <button onClick={onBack} className="fq-back">
        <ArrowLeft size={14} />
        Back
      </button>

      <header className="fq-detail-head">
        <div className="fq-detail-art is-round">
          {artist.artworkUrl ? (
            <SquareArt src={artist.artworkUrl} alt={artist.name} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
          ) : (
            <Disc size={54} color="var(--text-muted)" />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          <span className="fq-kicker" style={{ color: 'var(--accent-cyan)' }}>Artist</span>
          <h1 className="fq-detail-title">{artist.name}</h1>
          {artist.description && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '620px', lineHeight: 1.6 }}>
              {artist.description}
            </p>
          )}
          <div className="fq-detail-meta">
            {artist.topSongs.length} popular {artist.topSongs.length === 1 ? 'track' : 'tracks'}
          </div>

          <div className="fq-detail-actions">
            <button
              className="fq-btn fq-btn-primary"
              onClick={() => artist.topSongs.length > 0 && onPlayTrack(artist.topSongs[0], artist.topSongs)}
              disabled={artist.topSongs.length === 0}
            >
              <Play size={13} fill="currentColor" />
              Play top songs
            </button>
          </div>
        </div>
      </header>

      <section className="fq-section">
        <div className="fq-section-head">
          <div className="fq-section-title-wrap">
            <h2 className="fq-h2">Popular</h2>
            <span className="fq-muted" style={{ fontSize: '12px' }}>What people play most</span>
          </div>
        </div>

        <div className="fq-table">
          {artist.topSongs.map((track, idx) => (
            <div
              key={track.id}
              className="fq-trow"
              onContextMenu={e => onTrackContextMenu?.(e, track)}
            >
              <span className="fq-tnum">{String(idx + 1).padStart(2, '0')}</span>
              <div
                className="fq-tmain"
                onClick={() => onPlayTrack(track, artist.topSongs)}
                style={{ cursor: 'pointer' }}
              >
                <SquareArt
                  src={track.artworkUrl}
                  videoId={track.id}
                  alt={track.title}
                  style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                />
                <span className="fq-ttitle">{track.title}</span>
              </div>
              <span className="fq-tdur">{formatTime(track.durationSeconds)}</span>
            </div>
          ))}
        </div>
      </section>

      {artist.albums && artist.albums.length > 0 && (
        <section className="fq-section">
          <div className="fq-section-head">
            <div className="fq-section-title-wrap">
              <h2 className="fq-h2">Discography</h2>
              <span className="fq-muted" style={{ fontSize: '12px' }}>Albums and releases</span>
            </div>
          </div>

          <div className="fq-rail">
            {artist.albums.map(alb => (
              <div key={alb.id} className="fq-card" onClick={() => onOpenAlbum(alb.id)}>
                <div className="fq-card-media">
                  {alb.artworkUrl ? (
                    <SquareArt src={alb.artworkUrl} alt={alb.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                      <Disc size={40} color="var(--text-muted)" />
                    </div>
                  )}
                </div>
                <div className="fq-card-title">{alb.title}</div>
                <div className="fq-card-meta">{alb.year || 'Album'}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
