import React, { useEffect, useState } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { PlayerBar } from './components/PlayerBar';
import { NowPlayingModal } from './components/NowPlayingModal';
import { QueueDrawer } from './components/QueueDrawer';
import { AddToPlaylistModal } from './components/AddToPlaylistModal';

import { HomeView } from './views/HomeView';
import { SearchView } from './views/SearchView';
import { LibraryView } from './views/LibraryView';
import { PlaylistDetailView } from './views/PlaylistDetailView';
import { ArtistDetailView } from './views/ArtistDetailView';
import { AlbumDetailView } from './views/AlbumDetailView';
import { SettingsView } from './views/SettingsView';

import { AudioMode, MediaTrack, RepeatMode, UserPlaylist } from './types';
import { audioEngine } from './services/audioEngine';
import { libraryStore } from './services/libraryStore';
import { AutoplayEngine } from './services/autoplayEngine';

export const App: React.FC = () => {
  // Navigation State
  const [currentView, setCurrentView] = useState<string>('home');
  const [activeParam, setActiveParam] = useState<string | undefined>(undefined);

  // Playback State
  const [currentTrack, setCurrentTrack] = useState<MediaTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [position, setPosition] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioMode, setAudioMode] = useState<AudioMode>('NORMAL');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('OFF');
  const [queue, setQueue] = useState<MediaTrack[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(0);

  // Modal / Drawer Toggles
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState<boolean>(false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState<boolean>(false);
  const [trackForPlaylist, setTrackForPlaylist] = useState<MediaTrack | null>(null);

  // Local Library State
  const [likedTracks, setLikedTracks] = useState<MediaTrack[]>(libraryStore.getLikedTracks());
  const [userPlaylists, setUserPlaylists] = useState<UserPlaylist[]>(libraryStore.getUserPlaylists());
  const [recentlyPlayed, setRecentlyPlayed] = useState<MediaTrack[]>(libraryStore.getRecentlyPlayed());
  const [searchHistory, setSearchHistory] = useState<string[]>(libraryStore.getSearchHistory());

  // Subscribe to library store changes
  useEffect(() => {
    const unsub = libraryStore.subscribe(() => {
      setLikedTracks(libraryStore.getLikedTracks());
      setUserPlaylists(libraryStore.getUserPlaylists());
      setRecentlyPlayed(libraryStore.getRecentlyPlayed());
      setSearchHistory(libraryStore.getSearchHistory());
    });
    return unsub;
  }, []);

  // Setup Audio Engine Event Handlers
  useEffect(() => {
    audioEngine.onPlay(() => setIsPlaying(true));
    audioEngine.onPause(() => setIsPlaying(false));
    audioEngine.onTimeUpdate((pos, dur) => {
      setPosition(pos);
      setDuration(dur);
    });

    audioEngine.onTrackEnd(() => {
      handleTrackEnd();
    });

    audioEngine.setMediaSessionActionHandlers({
      onPlay: () => handlePlayPause(),
      onPause: () => handlePlayPause(),
      onPrev: () => handlePrev(),
      onNext: () => handleNext(),
      onSeek: (pos) => handleSeek(pos),
    });
  }, [queue, queueIndex, repeatMode, currentTrack]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === 'ArrowRight' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handlePrev();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSeek(position + 5);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(position - 5);
      } else if (e.code === 'KeyM') {
        handleToggleMute();
      } else if (e.code === 'Escape') {
        if (isNowPlayingOpen) setIsNowPlayingOpen(false);
        else if (isQueueOpen) setIsQueueOpen(false);
        else if (isAddToPlaylistOpen) setIsAddToPlaylistOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, position, isNowPlayingOpen, isQueueOpen, isAddToPlaylistOpen, isMuted, volume]);

  // Synchronize Discord Rich Presence with current playback state
  useEffect(() => {
    if (!window.electronAPI) return;
    if (!currentTrack) {
      window.electronAPI.clearDiscordPresence();
      return;
    }

    window.electronAPI.updateDiscordPresence({
      track: {
        id: currentTrack.id,
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
        artworkUrl: currentTrack.artworkUrl,
        durationSeconds: currentTrack.durationSeconds || duration || 194,
      },
      isPlaying,
      position,
      audioMode,
    });
  }, [currentTrack, isPlaying, audioMode]);

  const handlePlayTrack = async (track: MediaTrack, playlist?: MediaTrack[]) => {
    setCurrentTrack(track);
    libraryStore.recordPlayed(track);

    let newQueue = playlist && playlist.length > 0 ? [...playlist] : [track];
    let newIndex = newQueue.findIndex(t => t.id === track.id);
    if (newIndex === -1) {
      newQueue = [track, ...newQueue];
      newIndex = 0;
    }

    setQueue(newQueue);
    setQueueIndex(newIndex);

    // Resolve audio stream through local yt-dlp bridge
    try {
      let streamUrl = '';
      if (window.electronAPI) {
        const streamData = await window.electronAPI.getStreamUrl(track.id);
        streamUrl = streamData.streamUrl;
      } else {
        // Fallback for browser preview
        streamUrl = `https://freq-api.vercel.app/api/stream/${track.id}`;
      }

      await audioEngine.loadAndPlay(streamUrl, track);

      // Trigger background Vibe-Aware Autoplay queue generation
      AutoplayEngine.generateAutoplayQueue(
        track,
        likedTracks,
        recentlyPlayed,
        userPlaylists,
        [],
        15
      ).then(recommendations => {
        if (recommendations.length > 0) {
          setQueue(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const newToAdd = recommendations.filter(r => !existingIds.has(r.id));
            return [...prev, ...newToAdd];
          });
        }
      });
    } catch (err: any) {
      console.error('Audio playback failed for track:', track.title, err);
    }
  };

  const handlePlayPause = () => {
    if (!currentTrack) return;
    if (isPlaying) {
      audioEngine.pause();
    } else {
      audioEngine.play();
    }
  };

  const handlePrev = () => {
    if (position > 3) {
      handleSeek(0);
      return;
    }
    if (queue.length === 0) return;
    const prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
    setQueueIndex(prevIndex);
    handlePlayTrack(queue[prevIndex], queue);
  };

  const handleNext = () => {
    if (queue.length === 0) return;
    const nextIndex = queueIndex + 1 < queue.length ? queueIndex + 1 : 0;
    setQueueIndex(nextIndex);
    handlePlayTrack(queue[nextIndex], queue);
  };

  const handleTrackEnd = () => {
    if (repeatMode === 'ONE' && currentTrack) {
      handleSeek(0);
      audioEngine.play();
    } else {
      handleNext();
    }
  };

  const handleSeek = (sec: number) => {
    audioEngine.seek(sec);
    setPosition(sec);
    if (window.electronAPI && currentTrack) {
      window.electronAPI.updateDiscordPresence({
        track: {
          id: currentTrack.id,
          title: currentTrack.title,
          artist: currentTrack.artist,
          album: currentTrack.album,
          artworkUrl: currentTrack.artworkUrl,
          durationSeconds: currentTrack.durationSeconds || duration || 194,
        },
        isPlaying,
        position: sec,
        audioMode,
      });
    }
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    setIsMuted(false);
    audioEngine.setVolume(vol);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      audioEngine.setVolume(volume);
    } else {
      setIsMuted(true);
      audioEngine.setVolume(0);
    }
  };

  const handleAudioModeChange = (mode: AudioMode) => {
    setAudioMode(mode);
    audioEngine.setAudioMode(mode);
  };

  const handleToggleShuffle = () => {
    setIsShuffle(!isShuffle);
  };

  const handleToggleRepeat = () => {
    if (repeatMode === 'OFF') setRepeatMode('ALL');
    else if (repeatMode === 'ALL') setRepeatMode('ONE');
    else setRepeatMode('OFF');
  };

  const handleToggleLike = (track?: MediaTrack) => {
    const target = track || currentTrack;
    if (!target) return;
    libraryStore.toggleLike(target);
  };

  const handleNavigate = (view: string, param?: string) => {
    setCurrentView(view);
    setActiveParam(param);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        overflow: 'hidden',
      }}
    >
      {/* 1. Custom Frameless Windows TitleBar */}
      <TitleBar />

      {/* 2. Main Middle Workspace: Sidebar + Dynamic Content View */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          audioMode={audioMode}
          onAudioModeChange={handleAudioModeChange}
          playlists={userPlaylists}
          likedCount={likedTracks.length}
          onCreatePlaylist={() => {
            const title = prompt('Enter playlist name:');
            if (title) libraryStore.createPlaylist(title);
          }}
        />

        <main style={{ flex: 1, overflowY: 'auto', backgroundColor: '#090a0f' }}>
          {currentView === 'home' && (
            <HomeView
              onPlayTrack={handlePlayTrack}
              onOpenAlbum={id => handleNavigate('album', id)}
              onOpenArtist={id => handleNavigate('artist', id)}
              onOpenPlaylist={id => handleNavigate('playlist', id)}
              onToggleLike={handleToggleLike}
              isLiked={id => libraryStore.isLiked(id)}
              recentlyPlayed={recentlyPlayed}
            />
          )}

          {currentView === 'search' && (
            <SearchView
              onPlayTrack={handlePlayTrack}
              onToggleLike={handleToggleLike}
              isLiked={id => libraryStore.isLiked(id)}
              onOpenAddToPlaylist={track => {
                setTrackForPlaylist(track);
                setIsAddToPlaylistOpen(true);
              }}
              searchHistory={searchHistory}
              onAddSearchHistory={q => libraryStore.addSearchQuery(q)}
              onClearSearchHistory={() => libraryStore.clearSearchHistory()}
            />
          )}

          {currentView === 'library' && (
            <LibraryView
              likedTracks={likedTracks}
              userPlaylists={userPlaylists}
              recentlyPlayed={recentlyPlayed}
              onPlayTrack={handlePlayTrack}
              onOpenPlaylist={id => handleNavigate('playlist', id)}
              onOpenLiked={() => handleNavigate('liked')}
              onCreatePlaylist={() => {
                const title = prompt('Enter playlist name:');
                if (title) libraryStore.createPlaylist(title);
              }}
              onDeletePlaylist={id => libraryStore.deletePlaylist(id)}
            />
          )}

          {currentView === 'liked' && (
            <PlaylistDetailView
              title="Liked Songs"
              description="Your curated private favorites, stored strictly on-device."
              tracks={likedTracks}
              onBack={() => handleNavigate('library')}
              onPlayTrack={handlePlayTrack}
              onShufflePlay={tracks => {
                const shuffled = [...tracks].sort(() => Math.random() - 0.5);
                handlePlayTrack(shuffled[0], shuffled);
              }}
              onToggleLike={handleToggleLike}
              isLiked={id => libraryStore.isLiked(id)}
              isLikedView={true}
            />
          )}

          {currentView === 'playlist' && activeParam && (
            (() => {
              const pl = userPlaylists.find(p => p.id === activeParam);
              if (!pl) return <div style={{ padding: '30px' }}>Playlist not found.</div>;
              return (
                <PlaylistDetailView
                  title={pl.title}
                  description={pl.description}
                  artworkUrl={pl.artworkUrl}
                  tracks={pl.tracks}
                  onBack={() => handleNavigate('library')}
                  onPlayTrack={handlePlayTrack}
                  onShufflePlay={tracks => {
                    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
                    handlePlayTrack(shuffled[0], shuffled);
                  }}
                  onToggleLike={handleToggleLike}
                  isLiked={id => libraryStore.isLiked(id)}
                  onRemoveTrack={trackId => libraryStore.removeTrackFromPlaylist(pl.id, trackId)}
                />
              );
            })()
          )}

          {currentView === 'album' && activeParam && (
            <AlbumDetailView
              albumId={activeParam}
              onBack={() => handleNavigate('home')}
              onPlayTrack={handlePlayTrack}
              onShufflePlay={tracks => {
                const shuffled = [...tracks].sort(() => Math.random() - 0.5);
                handlePlayTrack(shuffled[0], shuffled);
              }}
              onToggleLike={handleToggleLike}
              isLiked={id => libraryStore.isLiked(id)}
            />
          )}

          {currentView === 'artist' && activeParam && (
            <ArtistDetailView
              artistId={activeParam}
              onBack={() => handleNavigate('home')}
              onPlayTrack={handlePlayTrack}
              onOpenAlbum={id => handleNavigate('album', id)}
            />
          )}

          {currentView === 'settings' && (
            <SettingsView
              audioMode={audioMode}
              onAudioModeChange={handleAudioModeChange}
              likedCount={likedTracks.length}
              playlistCount={userPlaylists.length}
              historyCount={recentlyPlayed.length}
              onClearHistory={() => {
                libraryStore.clearSearchHistory();
                alert('History cleared.');
              }}
            />
          )}
        </main>
      </div>

      {/* 3. Persistent Bottom Liquid-Glass Player Bar */}
      <PlayerBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        position={position}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        audioMode={audioMode}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        isLiked={currentTrack ? libraryStore.isLiked(currentTrack.id) : false}
        onPlayPause={handlePlayPause}
        onPrev={handlePrev}
        onNext={handleNext}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleShuffle={handleToggleShuffle}
        onToggleRepeat={handleToggleRepeat}
        onToggleLike={() => handleToggleLike()}
        onAudioModeChange={handleAudioModeChange}
        onOpenNowPlaying={() => setIsNowPlayingOpen(true)}
        onToggleQueue={() => setIsQueueOpen(!isQueueOpen)}
      />

      {/* 4. Full-Screen Now Playing Modal with 3D Flip Card & Synced Lyrics */}
      <NowPlayingModal
        isOpen={isNowPlayingOpen}
        onClose={() => setIsNowPlayingOpen(false)}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        position={position}
        duration={duration}
        audioMode={audioMode}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        isLiked={currentTrack ? libraryStore.isLiked(currentTrack.id) : false}
        onPlayPause={handlePlayPause}
        onPrev={handlePrev}
        onNext={handleNext}
        onSeek={handleSeek}
        onToggleShuffle={handleToggleShuffle}
        onToggleRepeat={handleToggleRepeat}
        onToggleLike={() => handleToggleLike()}
        onAudioModeChange={handleAudioModeChange}
        onOpenAddToPlaylist={track => {
          setTrackForPlaylist(track);
          setIsAddToPlaylistOpen(true);
        }}
        onToggleQueue={() => setIsQueueOpen(!isQueueOpen)}
      />

      {/* 5. Up-Next Queue Drawer */}
      <QueueDrawer
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        currentTrack={currentTrack}
        queue={queue}
        queueIndex={queueIndex}
        onSelectTrack={idx => {
          setQueueIndex(idx);
          handlePlayTrack(queue[idx], queue);
        }}
        onRemoveTrack={idx => {
          setQueue(prev => prev.filter((_, i) => i !== idx));
        }}
        onClearQueue={() => {
          if (currentTrack) setQueue([currentTrack]);
          else setQueue([]);
          setQueueIndex(0);
        }}
      />

      {/* 6. Add to Playlist Dialog */}
      <AddToPlaylistModal
        isOpen={isAddToPlaylistOpen}
        onClose={() => setIsAddToPlaylistOpen(false)}
        track={trackForPlaylist}
        playlists={userPlaylists}
        onAddToPlaylist={(plId, track) => libraryStore.addTrackToPlaylist(plId, track)}
        onCreatePlaylist={(title, track) => {
          const newPl = libraryStore.createPlaylist(title);
          if (track) libraryStore.addTrackToPlaylist(newPl.id, track);
        }}
      />
    </div>
  );
};
