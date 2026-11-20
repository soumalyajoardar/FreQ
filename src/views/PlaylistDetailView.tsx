import React from 'react';
import { ArrowLeft, Play, Shuffle, Heart, Trash2, Music, ChevronUp, ChevronDown, ListPlus, Camera, X } from 'lucide-react';
import { MediaTrack } from '../types';
import { formatTime } from '../components/PlayerBar';
import { SquareArt } from '../components/SquareArt';

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
  onTrackContextMenu?: (e: React.MouseEvent, track: MediaTrack) => void;
  /** True when the current cover came from the user (not track artwork). */
  hasCustomCover?: boolean;
  /** Persist a compressed data URL, or null to clear the custom cover. */
  onChangeCover?: (dataUrl: string | null) => void;
}

/** Downscale an image file to a square JPEG data URL small enough for localStorage. */
async function fileToCoverDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const edge = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - edge) / 2;
  const sy = (bitmap.height - edge) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Canvas unavailable');
  }
  ctx.drawImage(bitmap, sx, sy, edge, edge, 0, 0, 480, 480);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.82);
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
  onTrackContextMenu,
  hasCustomCover = false,
  onChangeCover,
}) => {
  const totalSeconds = tracks.reduce((acc, t) => acc + (t.durationSeconds || 0), 0);
  const totalDurationStr = formatTime(totalSeconds);
  const empty = tracks.length === 0;
  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const [coverBusy, setCoverBusy] = React.useState(false);

  const handleCoverFile = async (file: File | undefined) => {
    if (!file || !onChangeCover) return;
    if (!file.type.startsWith('image/') || file.size > 12 * 1024 * 1024) return;
    setCoverBusy(true);
    try {
      onChangeCover(await fileToCoverDataUrl(file));
    } catch {
      // Unreadable/corrupt image — leave the existing cover untouched.
    } finally {
      setCoverBusy(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  return (
    <div className="fq-view view-enter" style={{ display: 'flex', flexDirection: 'column', gap: '30px', paddingTop: '18px' }}>
      <button onClick={onBack} className="fq-back">
        <ArrowLeft size={14} />
        Back
      </button>

      <header className="fq-detail-head">
        <div className="fq-detail-art" style={{ position: 'relative' }}>
          {artworkUrl ? (
            <SquareArt src={artworkUrl} alt={title} style={{ width: '100%', height: '100%' }} />
          ) : isLikedView ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(145deg, #1a1a24 0%, #0b0b10 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Heart size={62} fill="var(--accent-cyan)" color="var(--accent-cyan)" />
            </div>
          ) : (
            <Music size={52} color="var(--text-muted)" />
          )}

          {onChangeCover && !isLikedView && (
            <>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={e => handleCoverFile(e.target.files?.[0])}
              />
              <button
                type="button"
                className="fq-cover-edit"
                disabled={coverBusy}
                onClick={() => coverInputRef.current?.click()}
                title={artworkUrl ? 'Change playlist cover' : 'Upload playlist cover'}
              >
                <Camera size={15} />
                <span>{coverBusy ? 'Working…' : 'Cover'}</span>
              </button>
            </>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          <span className="fq-kicker" style={{ color: 'var(--accent-cyan)' }}>
            {isLikedView ? 'Collection' : 'Playlist'}
          </span>
          <h1 className="fq-detail-title">{title}</h1>
          {description && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '640px', lineHeight: 1.6 }}>
              {description}
            </p>
          )}
          <div className="fq-detail-meta">
            {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'} · {totalDurationStr} total
          </div>

          <div className="fq-detail-actions">
            <button
              className="fq-btn fq-btn-primary"
              onClick={() => tracks.length > 0 && onPlayTrack(tracks[0], tracks)}
              disabled={empty}
            >
              <Play size={13} fill="currentColor" />
              {isLikedView ? 'Play liked' : 'Play all'}
            </button>
            <button
              className="fq-btn"
              onClick={() => tracks.length > 0 && onShufflePlay(tracks)}
              disabled={empty}
            >
              <Shuffle size={13} />
              Shuffle
            </button>
            {hasCustomCover && onChangeCover && (
              <button
                className="fq-btn fq-btn-ghost"
                onClick={() => onChangeCover(null)}
                title="Remove the custom cover"
              >
                <X size={13} />
                Remove cover
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="fq-table">
        {tracks.length > 0 && (
          <div className="fq-thead">
            <span style={{ width: '22px', textAlign: 'right' }}>#</span>
            <span style={{ flex: 1 }}>Title</span>
            <span className="fq-talbum">Album</span>
            <span style={{ width: '56px', textAlign: 'right' }}>Time</span>
            <span style={{ width: '132px', textAlign: 'right' }}>Actions</span>
          </div>
        )}

        {tracks.map((track, idx) => (
          <div
            key={`${track.id}-${idx}`}
            className="fq-trow"
            onContextMenu={e => onTrackContextMenu?.(e, track)}
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

            <span className="fq-talbum" title={track.album}>{track.album}</span>
            <span className="fq-tdur">{formatTime(track.durationSeconds)}</span>

            <div className="fq-tact">
              {onMoveTrack && (
                <>
                  <button
                    onClick={() => idx > 0 && onMoveTrack(idx, idx - 1)}
                    disabled={idx === 0}
                    title="Move up"
                    className="fq-icon-btn"
                    style={{ width: '26px', height: '26px', borderRadius: '7px', opacity: idx === 0 ? 0.25 : 1 }}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => idx < tracks.length - 1 && onMoveTrack(idx, idx + 1)}
                    disabled={idx === tracks.length - 1}
                    title="Move down"
                    className="fq-icon-btn"
                    style={{ width: '26px', height: '26px', borderRadius: '7px', opacity: idx === tracks.length - 1 ? 0.25 : 1 }}
                  >
                    <ChevronDown size={14} />
                  </button>
                </>
              )}
              {onPlayNext && (
                <button
                  onClick={() => onPlayNext(track)}
                  title="Play next"
                  className="fq-icon-btn"
                  style={{ width: '26px', height: '26px', borderRadius: '7px', color: 'var(--accent-cyan)' }}
                >
                  <ListPlus size={14} />
                </button>
              )}
              <button
                onClick={() => onToggleLike(track)}
                title={isLiked(track.id) ? 'Unlike' : 'Like'}
                className="fq-icon-btn"
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '7px',
                  color: isLiked(track.id) ? 'var(--accent-cyan)' : 'var(--text-muted)',
                }}
              >
                <Heart size={14} fill={isLiked(track.id) ? 'currentColor' : 'transparent'} />
              </button>

              {onRemoveTrack && (
                <button
                  onClick={() => onRemoveTrack(track.id)}
                  title="Remove from playlist"
                  className="fq-icon-btn"
                  style={{ width: '26px', height: '26px', borderRadius: '7px', color: 'var(--text-muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#f43f5e'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}

        {empty && (
          <div
            className="fq-panel"
            style={{ padding: '52px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}
          >
            <Music size={26} color="var(--text-muted)" />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Nothing here yet</div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', maxWidth: '320px', lineHeight: 1.6 }}>
              Songs you add from Home or Search will collect here.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
