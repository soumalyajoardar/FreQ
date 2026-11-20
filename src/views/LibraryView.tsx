import React from 'react';
import { Heart, Plus, Play, Trash2, Clock, Music, Pencil, Sparkles, Compass, HardDriveDownload, ListMusic, Link2 } from 'lucide-react';
import { MediaTrack, SmartMix, UserPlaylist } from '../types';
import { SquareArt } from '../components/SquareArt';
import { DownloadedTrack } from '../services/libraryStore';
import { formatBytes } from '../services/downloads';
import { ImportPlaylistDialog } from '../components/ImportPlaylistDialog';

interface LibraryViewProps {
  likedTracks: MediaTrack[];
  userPlaylists: UserPlaylist[];
  recentlyPlayed: MediaTrack[];
  smartMixes: SmartMix[];
  smartPlaylists: SmartMix[];
  downloadedTracks: DownloadedTrack[];
  totalDownloadBytes: number;
  discoveryLoading: boolean;
  onPlayMix: (mix: SmartMix) => void;
  onPlayDiscoveryMix: () => void;
  onRemoveDownloaded: (trackId: string) => void;
  onPlayTrack: (track: MediaTrack, queue?: MediaTrack[]) => void;
  onOpenPlaylist: (playlistId: string) => void;
  onImportPlaylistLink: (url: string) => Promise<{ title: string; count: number } | null>;
  onOpenLiked: () => void;
  onCreatePlaylist: () => void;
  onDeletePlaylist: (playlistId: string) => void;
  onRenamePlaylist?: (playlistId: string) => void;
  onTrackContextMenu?: (e: React.MouseEvent, track: MediaTrack) => void;
}

const LibraryViewComponent: React.FC<LibraryViewProps> = ({
  likedTracks,
  userPlaylists,
  recentlyPlayed,
  smartMixes,
  smartPlaylists,
  downloadedTracks,
  totalDownloadBytes,
  discoveryLoading,
  onPlayMix,
  onPlayDiscoveryMix,
  onRemoveDownloaded,
  onPlayTrack,
  onOpenPlaylist,
  onOpenLiked,
  onCreatePlaylist,
  onDeletePlaylist,
  onRenamePlaylist,
  onImportPlaylistLink,
}) => {
  const [showImportLink, setShowImportLink] = React.useState(false);

  const mixCard = (mix: SmartMix, icon: React.ReactNode) => {
    const art = mix.tracks.find(t => t.artworkUrl)?.artworkUrl || null;
    return (
      <div key={mix.id} className="fq-mix" onClick={() => mix.tracks.length > 0 && onPlayMix(mix)}>
        <div className="fq-mix-art">
          {art ? (
            <SquareArt src={art} alt={mix.title} style={{ width: '100%', height: '100%' }} />
          ) : (
            icon
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="fq-ttitle" style={{ fontSize: '13px' }}>{mix.title}</div>
          <div className="fq-tsub">{mix.description}</div>
        </div>
        <span className="fq-mix-play">
          <Play size={13} fill="currentColor" style={{ marginLeft: '2px' }} />
        </span>
      </div>
    );
  };

  return (
    <div className="fq-view view-enter" style={{ display: 'flex', flexDirection: 'column', gap: '34px', paddingTop: '18px' }}>
      <header className="fq-page-head" style={{ paddingBottom: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span className="fq-kicker">On this device</span>
          <h1 className="fq-h1">Your Library</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="fq-btn" onClick={() => setShowImportLink(true)} title="Import a YouTube playlist link">
            <Link2 size={13} />
            Import link
          </button>
          <button className="fq-btn fq-btn-primary" onClick={onCreatePlaylist}>
            <Plus size={14} />
            New playlist
          </button>
        </div>
      </header>

      <ImportPlaylistDialog
        isOpen={showImportLink}
        onClose={() => setShowImportLink(false)}
        onImport={onImportPlaylistLink}
      />

      {/* Liked tile + activity */}
      <div className="fq-lib-top">
        <div className="fq-liked-tile" onClick={onOpenLiked}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Heart size={26} fill="var(--accent-cyan)" color="var(--accent-cyan)" />
            {likedTracks.length > 0 && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onPlayTrack(likedTracks[0], likedTracks);
                }}
                className="fq-play-btn"
                style={{ width: '40px', height: '40px' }}
                title="Play liked songs"
              >
                <Play size={16} fill="currentColor" style={{ marginLeft: '2px' }} />
              </button>
            )}
          </div>

          <div>
            <h2 className="fq-liked-title">Liked Songs</h2>
            <p style={{ marginTop: '6px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              {likedTracks.length} saved {likedTracks.length === 1 ? 'song' : 'songs'}
            </p>
          </div>
        </div>

        <div className="fq-panel" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={13} color="var(--text-secondary)" />
            <span className="fq-kicker">Listening activity</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: '34px', justifyContent: 'start' }}>
            {[
              { value: likedTracks.length, label: 'Liked tracks' },
              { value: userPlaylists.length, label: 'Playlists' },
              { value: recentlyPlayed.length, label: 'Recent plays' },
            ].map(s => (
              <div key={s.label}>
                <div className="fq-stat-value" style={{ fontSize: '34px' }}>{s.value}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            100% on-device private storage. No accounts, no data leaves your computer.
          </div>
        </div>
      </div>

      {/* Smart mixes */}
      {(smartMixes.length > 0 || discoveryLoading) && (
        <section className="fq-section">
          <div className="fq-section-head">
            <div className="fq-section-title-wrap">
              <h2 className="fq-h2">Smart mixes</h2>
              <span className="fq-muted" style={{ fontSize: '12px' }}>Auto-built from what you actually play</span>
            </div>
            <Sparkles size={14} color="var(--text-muted)" />
          </div>

          <div className="fq-mix-grid">
            {smartMixes.map(mix => mixCard(mix, <Sparkles size={20} color="var(--text-muted)" />))}

            <div
              className="fq-mix is-dashed"
              onClick={() => !discoveryLoading && onPlayDiscoveryMix()}
              style={{ cursor: discoveryLoading ? 'default' : 'pointer' }}
            >
              <div className="fq-mix-art" style={{ background: 'rgba(255,255,255,0.05)' }}>
                {discoveryLoading ? (
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--text-primary)', animation: 'freqSpin 0.8s linear infinite' }} />
                ) : (
                  <Compass size={20} color="var(--text-primary)" />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="fq-ttitle" style={{ fontSize: '13px' }}>Discovery Mix</div>
                <div className="fq-tsub">
                  {discoveryLoading ? 'Building your mix…' : 'Fresh songs from your top artists'}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Smart playlists */}
      {smartPlaylists.length > 0 && (
        <section className="fq-section">
          <div className="fq-section-head">
            <div className="fq-section-title-wrap">
              <h2 className="fq-h2">Smart playlists</h2>
              <span className="fq-muted" style={{ fontSize: '12px' }}>Rule-based and auto-refreshing</span>
            </div>
            <ListMusic size={14} color="var(--text-muted)" />
          </div>

          <div className="fq-mix-grid">
            {smartPlaylists.map(mix => mixCard(mix, <ListMusic size={20} color="var(--text-muted)" />))}
          </div>
        </section>
      )}

      {/* Downloads */}
      {downloadedTracks.length > 0 && (
        <section className="fq-section">
          <div className="fq-section-head">
            <div className="fq-section-title-wrap">
              <h2 className="fq-h2">Offline downloads</h2>
              <span className="fq-muted" style={{ fontSize: '12px' }}>Available without a connection</span>
            </div>
            <span className="fq-chip">
              <HardDriveDownload size={12} />
              {downloadedTracks.length} · {formatBytes(totalDownloadBytes)}
            </span>
          </div>

          <div className="fq-table">
            {downloadedTracks.map(d => (
              <div key={d.track.id} className="fq-trow" onClick={() => onPlayTrack(d.track)} style={{ cursor: 'pointer' }}>
                <SquareArt src={d.track.artworkUrl} videoId={d.track.id} alt={d.track.title} fit="cover" style={{ width: '38px', height: '38px', borderRadius: '8px', flexShrink: 0 }} />
                <div className="fq-tmain" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                  <span className="fq-ttitle">{d.track.title}</span>
                  <span className="fq-tsub">{d.track.artist} · {formatBytes(d.sizeBytes)}</span>
                </div>
                <div className="fq-tact" style={{ width: '40px' }}>
                  <button
                    onClick={e => { e.stopPropagation(); onRemoveDownloaded(d.track.id); }}
                    title="Remove download"
                    className="fq-icon-btn"
                    style={{ width: '28px', height: '28px', borderRadius: '7px' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#f43f5e'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = ''; }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Playlists */}
      <section className="fq-section">
        <div className="fq-section-head">
          <div className="fq-section-title-wrap">
            <h2 className="fq-h2">Playlists</h2>
            <span className="fq-muted" style={{ fontSize: '12px' }}>{userPlaylists.length} curated {userPlaylists.length === 1 ? 'collection' : 'collections'}</span>
          </div>
          <button className="fq-btn fq-btn-ghost" onClick={onCreatePlaylist}>
            <Plus size={13} />
            New
          </button>
        </div>

        <div className="fq-pl-grid">
          {userPlaylists.map(pl => (
            <div key={pl.id} className="fq-card" style={{ width: '100%' }} onClick={() => onOpenPlaylist(pl.id)}>
              <div className="fq-card-media">
                {pl.coverUrl || pl.artworkUrl ? (
                  <SquareArt src={pl.coverUrl || pl.artworkUrl} alt={pl.title} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                    <Music size={32} color="var(--text-muted)" />
                  </div>
                )}

                {pl.tracks.length > 0 && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onPlayTrack(pl.tracks[0], pl.tracks);
                    }}
                    className="fq-card-play"
                    title="Play playlist"
                  >
                    <Play size={15} fill="currentColor" style={{ marginLeft: '2px' }} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px' }}>
                <div style={{ minWidth: 0 }}>
                  <div className="fq-card-title">{pl.title}</div>
                  <div className="fq-card-meta">{pl.tracks.length} tracks</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1px', marginTop: '6px' }}>
                  {onRenamePlaylist && (
                    <button
                      onClick={e => { e.stopPropagation(); onRenamePlaylist(pl.id); }}
                      title="Rename playlist"
                      className="fq-icon-btn"
                      style={{ width: '24px', height: '24px', borderRadius: '6px' }}
                    >
                      <Pencil size={12} />
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); onDeletePlaylist(pl.id); }}
                    title="Delete playlist"
                    className="fq-icon-btn"
                    style={{ width: '24px', height: '24px', borderRadius: '6px' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#f43f5e'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = ''; }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {userPlaylists.length === 0 && (
            <div
              className="fq-panel"
              style={{ gridColumn: '1 / -1', padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}
            >
              <Music size={24} color="var(--text-muted)" />
              <div style={{ fontSize: '14px', fontWeight: 600 }}>No playlists yet</div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Create one to start curating your own collections.</div>
              <button className="fq-btn fq-btn-primary" style={{ marginTop: '6px' }} onClick={onCreatePlaylist}>
                <Plus size={13} />
                New playlist
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export const LibraryView = React.memo(LibraryViewComponent);
