import React, { useState } from 'react';
import { X, Plus, Music, Check } from 'lucide-react';
import { MediaTrack, UserPlaylist } from '../types';
import { useExitTransition } from './useExitTransition';
import { SafeArtwork } from './SafeArtwork';
import { SquareArt } from './SquareArt';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: MediaTrack | null;
  playlists: UserPlaylist[];
  onAddToPlaylist: (playlistId: string, track: MediaTrack) => void;
  onCreatePlaylist: (title: string, track?: MediaTrack) => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  isOpen,
  onClose,
  track,
  playlists,
  onAddToPlaylist,
  onCreatePlaylist,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { visible, closing } = useExitTransition(isOpen, 180);

  if (!visible || !track) return null;

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreatePlaylist(newTitle.trim(), track);
    setNewTitle('');
    setIsCreating(false);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(16px)',
        zIndex: 9500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        className="glass-floating liquid-panel"
        style={{
          width: '420px',
          borderRadius: '20px',
          padding: '24px',
          backgroundColor: 'rgba(18, 20, 31, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          animation: closing ? 'freqFadeScaleOut 0.16s ease' : 'freqPopIn 0.22s cubic-bezier(0.16,1,0.3,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Add to Playlist
          </h3>
          <button
            onClick={onClose}
            style={{ color: 'var(--text-secondary)', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Selected Track info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <SquareArt
            src={track.artworkUrl}
            videoId={track.id}
            alt={track.title}
            style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {track.title}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {track.artist}
            </span>
          </div>
        </div>

        {/* Create new playlist toggle/input */}
        {isCreating ? (
          <form onSubmit={handleCreateAndAdd} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Playlist title..."
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              autoFocus
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--accent-cyan)',
                color: '#fff',
                fontSize: '13px',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '0 16px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                color: '#090A0F',
                fontWeight: 700,
                fontSize: '13px',
              }}
            >
              Create
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: 'var(--accent-cyan)',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <Plus size={16} />
            <span>Create New Playlist</span>
          </button>
        )}

        {/* Existing Playlists list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
          {playlists.map(pl => {
            const alreadyIn = pl.tracks.some(t => t.id === track.id);
            return (
              <button
                key={pl.id}
                onClick={() => {
                  if (!alreadyIn) {
                    onAddToPlaylist(pl.id, track);
                    onClose();
                  }
                }}
                disabled={alreadyIn}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: alreadyIn ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  color: alreadyIn ? 'var(--text-muted)' : 'var(--text-primary)',
                  cursor: alreadyIn ? 'default' : 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => {
                  if (!alreadyIn) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.09)';
                }}
                onMouseLeave={e => {
                  if (!alreadyIn) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                  <Music size={16} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pl.title}
                  </span>
                </div>

                {alreadyIn ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--accent-teal)' }}>
                    <Check size={14} /> Added
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {pl.tracks.length} tracks
                  </span>
                )}
              </button>
            );
          })}

          {playlists.length === 0 && (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
              No custom playlists yet. Create your first one above!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
