import React, { useEffect, useState } from 'react';
import { ArrowLeft, Play, Shuffle, Heart, Disc } from 'lucide-react';
import { AlbumDetails, MediaTrack } from '../types';
import { ytMusicService } from '../services/ytmusic';
import { playbackManager } from '../services/playbackManager';
import { formatTime } from '../components/PlayerBar';
import { SquareArt } from '../components/SquareArt';

interface AlbumDetailViewProps {
  albumId: string;
  onBack: () => void;
  onPlayTrack: (track: MediaTrack, playlist: MediaTrack[]) => void;
  onShufflePlay: (tracks: MediaTrack[]) => void;
  onToggleLike: (track: MediaTrack) => void;
  isLiked: (trackId: string) => boolean;
  onTrackContextMenu?: (e: React.MouseEvent, track: MediaTrack) => void;
}

export const AlbumDetailView: React.FC<AlbumDetailViewProps> = ({
  albumId,
  onBack,
  onPlayTrack,
  onShufflePlay,
  onToggleLike,
  isLiked,
  onTrackContextMenu,
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
      <div className="fq-view" style={{ paddingTop: '80px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
        Loading album…
      </div>
    );
  }

  if (!album) {
    return (
      <div className="fq-view" style={{ paddingTop: '60px' }}>
        <button onClick={onBack} className="fq-back">
          <ArrowLeft size={14} />
          Back
        </button>
        <div style={{ marginTop: '20px', color: 'var(--text-muted)' }}>Album not found.</div>
      </div>
    );
  }

  const tracks = album.tracks || [];

  return (
    <div className="fq-view view-enter" style={{ display: 'flex', flexDirection: 'column', gap: '30px', paddingTop: '18px' }}>
      <button onClick={onBack} className="fq-back">
        <ArrowLeft size={14} />
        Back
      </button>

      <header className="fq-detail-head">
        <div className="fq-detail-art">
          {album.artworkUrl ? (
            <SquareArt src={album.artworkUrl} alt={album.title} style={{ width: '100%', height: '100%' }} />
          ) : (
            <Disc size={58} color="var(--text-muted)" />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          <span className="fq-kicker" style={{ color: 'var(--accent-cyan)' }}>Album</span>
          <h1 className="fq-detail-title">{album.title}</h1>
          <div className="fq-detail-meta">
            {album.artist}
            {album.year ? ` · ${album.year}` : ''}
            {` · ${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'}`}
          </div>

          <div className="fq-detail-actions">
            <button
              className="fq-btn fq-btn-primary"
              onClick={() => tracks.length > 0 && onPlayTrack(tracks[0], tracks)}
              disabled={tracks.length === 0}
            >
              <Play size={13} fill="currentColor" />
              Play album
            </button>
            <button
              className="fq-btn"
              onClick={() => tracks.length > 0 && onShufflePlay(tracks)}
              disabled={tracks.length === 0}
            >
              <Shuffle size={13} />
              Shuffle
            </button>
          </div>
        </div>
      </header>

      <div className="fq-table">
        {tracks.map((track, idx) => (
          <div
            key={track.id}
            className="fq-trow"
            onContextMenu={e => onTrackContextMenu?.(e, track)}
            onMouseEnter={() => playbackManager.scheduleHoverPrefetch(track)}
            onMouseLeave={() => playbackManager.cancelHoverPrefetch(track.id)}
          >
            <span className="fq-tnum">{String(idx + 1).padStart(2, '0')}</span>

            <div
              className="fq-tmain"
              onClick={() => onPlayTrack(track, tracks)}
              style={{ cursor: 'pointer' }}
            >
              <SquareArt
                src={track.artworkUrl}
                videoId={track.id}
                alt={track.title}
                style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span className="fq-ttitle">{track.title}</span>
                <span className="fq-tsub">{track.artist}</span>
              </div>
            </div>

            <span className="fq-tdur">{formatTime(track.durationSeconds)}</span>

            <div className="fq-tact">
              <button
                onClick={() => onToggleLike(track)}
                title={isLiked(track.id) ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
                style={{ color: isLiked(track.id) ? 'var(--accent-cyan)' : 'var(--text-muted)', padding: '5px' }}
              >
                <Heart size={15} fill={isLiked(track.id) ? 'currentColor' : 'transparent'} />
              </button>
            </div>
          </div>
        ))}

        {tracks.length === 0 && (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
            No tracks listed for this album.
          </div>
        )}
      </div>
    </div>
  );
};
