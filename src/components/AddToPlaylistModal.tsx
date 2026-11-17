import React, { useState } from 'react';
import { X, Plus, Music, Check } from 'lucide-react';
import { MediaTrack, UserPlaylist } from '../types';
import { useExitTransition } from './useExitTransition';
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
        backgroundColor: 'rgba(3, 3, 6, 0.74)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        zIndex: 9500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'freqFadeIn 0.16s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(440px, calc(100vw - 48px))',
          borderRadius: '20px',
          padding: '24px',
          backgroundColor: 'rgba(14, 14, 19, 0.96)',
          backdropFilter: 'blur(24px) saturate(150%)',
          WebkitBackdropFilter: 'blur(24px) saturate(150%)',
          border: '1px solid rgba(255, 255, 255, 0.11)',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          animation: closing ? 'freqFadeScaleOut 0.16s ease' : 'freqPopIn 0.22s cubic-bezier(0.16,1,0.3,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="fq-kicker" style={{ fontSize: '9px' }}>Collection</span>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 400, letterSpacing: '-0.02em', color: '#fff', lineHeight: 1 }}>
              Add to playlist
            </h3>
          </div>
          <button
            onClick={onClose}
            className="fq-icon-btn"
            style={{ width: '28px', height: '28px', borderRadius: '8px' }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Selected track */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.028)',
            border: '1px solid var(--line)',
          }}
        >
          <SquareArt
            src={track.artworkUrl}
            videoId={track.id}
            alt={track.title}
            style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            <span className="fq-ttitle" style={{ fontSize: '12.5px' }}>{track.title}</span>
            <span className="fq-tsub">{track.artist}</span>
          </div>
        </div>

        {isCreating ? (
          <form onSubmit={handleCreateAndAdd} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Playlist title…"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              autoFocus
              style={{
                flex: 1,
                height: '40px',
                padding: '0 13px',
                borderRadius: '11px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--line-strong)',
                color: '#fff',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button type="submit" className="fq-btn fq-btn-primary" style={{ height: '40px' }}>
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
              height: '40px',
              padding: '0 13px',
              borderRadius: '11px',
              backgroundColor: 'transparent',
              border: '1px dashed var(--line-strong)',
              color: 'var(--accent-cyan)',
              fontSize: '12.5px',
              fontWeight: 600,
              transition: 'background 0.15s ease, border-color 0.15s ease',
            }}
          >
            <Plus size={15} />
            <span>Create new playlist</span>
          </button>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '252px', overflowY: 'auto', margin: '0 -4px', padding: '0 4px' }}>
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
                  gap: '10px',
                  height: '44px',
                  padding: '0 11px',
                  borderRadius: '10px',
                  backgroundColor: 'transparent',
                  border: '1px solid transparent',
                  color: alreadyIn ? 'var(--text-muted)' : 'var(--text-primary)',
                  cursor: alreadyIn ? 'default' : 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => {
                  if (!alreadyIn) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.055)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', minWidth: 0 }}>
                  <Music size={15} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '12.5px', fontWeight: 550, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pl.title}
                  </span>
                </div>

                {alreadyIn ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--accent-cyan)', flexShrink: 0 }}>
                    <Check size={13} /> Added
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                    {pl.tracks.length} tracks
                  </span>
                )}
              </button>
            );
          })}

          {playlists.length === 0 && (
            <div style={{ textAlign: 'center', padding: '22px 16px', color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.6 }}>
              No playlists yet.<br />Create one above to start collecting.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
