import React from 'react';
import { Heart, Plus, Play, Trash2, Clock, Music, Pencil } from 'lucide-react';
import { MediaTrack, UserPlaylist } from '../types';
import { formatTime } from '../components/PlayerBar';
import { SquareArt } from '../components/SquareArt';

interface LibraryViewProps {
  likedTracks: MediaTrack[];
  userPlaylists: UserPlaylist[];
  recentlyPlayed: MediaTrack[];
  onPlayTrack: (track: MediaTrack, queue?: MediaTrack[]) => void;
  onOpenPlaylist: (playlistId: string) => void;
  onOpenLiked: () => void;
  onCreatePlaylist: () => void;
  onDeletePlaylist: (playlistId: string) => void;
  onRenamePlaylist?: (playlistId: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  likedTracks,
  userPlaylists,
  recentlyPlayed,
  onPlayTrack,
  onOpenPlaylist,
  onOpenLiked,
  onCreatePlaylist,
  onDeletePlaylist,
  onRenamePlaylist,
}) => {
  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '32px' }} className="view-enter">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)' }}>
          Your Library
        </h1>
        <button
          onClick={onCreatePlaylist}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '999px',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: 'var(--accent-cyan)',
            fontWeight: 700,
            fontSize: '13px',
          }}
        >
          <Plus size={16} />
          <span>New Playlist</span>
        </button>
      </div>

      {/* Top Grid: Liked Songs Hero Banner & Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 380px) 1fr', gap: '20px' }}>
        {/* Liked Songs Hero Tile */}
        <div
          onClick={onOpenLiked}
          style={{
            borderRadius: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '200px',
            cursor: 'pointer',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Heart size={32} fill="#fff" color="#fff" />
            {likedTracks.length > 0 && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onPlayTrack(likedTracks[0], likedTracks);
                }}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  color: '#090A0F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                }}
              >
                <Play size={18} fill="#090A0F" style={{ marginLeft: '2px' }} />
              </button>
            )}
          </div>

          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
              Liked Songs
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '4px' }}>
              {likedTracks.length} saved songs
            </p>
          </div>
        </div>

        {/* Recently Played Summary / Stats */}
        <div
          style={{
            borderRadius: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color="var(--accent-teal)" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Listening Activity
            </span>
          </div>

          <div style={{ display: 'flex', gap: '28px', margin: '14px 0' }}>
            <div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                {likedTracks.length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Liked Tracks</div>
            </div>
            <div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--accent-violet)' }}>
                {userPlaylists.length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Custom Playlists</div>
            </div>
            <div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--accent-teal)' }}>
                {recentlyPlayed.length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Recent Plays</div>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            100% on-device private storage. No accounts, no data leaves your computer.
          </div>
        </div>
      </div>

      {/* User Playlists Grid */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
          Playlists ({userPlaylists.length})
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {userPlaylists.map(pl => (
            <div
              key={pl.id}
              onClick={() => onOpenPlaylist(pl.id)}
              style={{
                padding: '14px',
                borderRadius: '16px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.07)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: '12px',
                  backgroundColor: '#1b1e2e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {pl.artworkUrl ? (
                  <SquareArt src={pl.artworkUrl} alt={pl.title} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Music size={36} color="var(--text-muted)" />
                )}

                {pl.tracks.length > 0 && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onPlayTrack(pl.tracks[0], pl.tracks);
                    }}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      bottom: '10px',
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(255, 255, 255, 0.4)',
                    }}
                  >
                    <Play size={16} fill="#090A0F" color="#090A0F" style={{ marginLeft: '2px' }} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pl.title}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {pl.tracks.length} tracks
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {onRenamePlaylist && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onRenamePlaylist(pl.id);
                    }}
                    title="Rename playlist"
                    style={{ color: 'var(--text-muted)', padding: '6px' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-cyan)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    <Pencil size={14} />
                  </button>
                )}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onDeletePlaylist(pl.id);
                  }}
                  title="Delete Playlist"
                  style={{ color: 'var(--text-muted)', padding: '6px' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <Trash2 size={15} />
                </button>
                </div>
              </div>
            </div>
          ))}

          {userPlaylists.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              No custom playlists created yet. Click "+ New Playlist" to start curating.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
