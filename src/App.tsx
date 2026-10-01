import React, { useEffect, useRef, useState } from 'react';
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
import { ytMusicService } from './services/ytmusic';
import { buildContinuationQueue, CONTINUATION_LIMIT } from './services/continuationQueue';
import { isSameSong, shouldUseContinuation } from './services/vibeMatch';
import { ConfirmDialog, CreatePlaylistDialog, ToastItem, ToastStack } from './components/FreqDialogs';
import { HomeQueueRail } from './components/HomeQueueRail';
import { HomeLyricsRail } from './components/HomeLyricsRail';

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
  const [audioMode, setAudioMode] = useState<AudioMode>(() => libraryStore.getAudioMode());
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('OFF');
  const [queue, setQueue] = useState<MediaTrack[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(0);
  const [isTrackLoading, setIsTrackLoading] = useState<boolean>(false);

  // Modal / Drawer Toggles
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState<boolean>(false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState<boolean>(false);
  const [trackForPlaylist, setTrackForPlaylist] = useState<MediaTrack | null>(null);
  const [isHomeLyricsOpen, setIsHomeLyricsOpen] = useState<boolean>(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState<boolean>(false);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState<boolean>(false);
  const [renamePlaylistId, setRenamePlaylistId] = useState<string | null>(null);
  const [pendingDeletePlaylistId, setPendingDeletePlaylistId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = (message: string, kind: ToastItem['kind'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-2), { id, message, kind }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200);
  };

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
      // Keep the live DSP in sync with persisted flavor settings.
      audioEngine.setSnrRate(libraryStore.getSnrRate());
      audioEngine.setSnrReverb(libraryStore.getSnrReverb());
      audioEngine.setNightcoreRate(libraryStore.getNightcoreRate());
      audioEngine.setBassBoost(libraryStore.getBassBoost());
      const storedMode = libraryStore.getAudioMode();
      setAudioMode(storedMode);
      audioEngine.setAudioMode(storedMode);
    });
    return unsub;
  }, []);

  // Refs to avoid stale closures in audio callbacks (parity with Android token guards)
  const queueRef = useRef<MediaTrack[]>([]);
  const queueIndexRef = useRef<number>(0);
  // Playback load token: only the latest tapped track may start audio
  // (stale resolutions never overwrite the new selection).
  const loadTokenRef = useRef<number>(0);
  // Consecutive media-element failures per track. A track that errors
  // repeatedly (bad stream) is removed instead of looping forever.
  const failRef = useRef<{ id: string | null; count: number }>({ id: null, count: 0 });
  // Consecutive resolve failures across tracks. Caps auto-skip so a
  // stretch of dead uploads can't spin the queue forever.
  const resolveFailRef = useRef<number>(0);
  const loadingRef = useRef<boolean>(false);
  const repeatModeRef = useRef<RepeatMode>('OFF');
  const shuffleRef = useRef<boolean>(false);
  const currentTrackRef = useRef<MediaTrack | null>(null);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { shuffleRef.current = isShuffle; }, [isShuffle]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);

  // Setup Audio Engine Event Handlers — subscribe once with cleanup (fixes listener leak)
  useEffect(() => {
    const offPlay = audioEngine.onPlay(() => {
      setIsPlaying(true);
      // A track that starts rendering is healthy — reset its failure count.
      const id = currentTrackRef.current?.id;
      if (id) failRef.current = { id, count: 0 };
    });
    const offPause = audioEngine.onPause(() => setIsPlaying(false));
    const offTime = audioEngine.onTimeUpdate((pos, dur) => {
      setPosition(pos);
      setDuration(dur);
    });

    const offEnd = audioEngine.onTrackEnd(() => {
      handleTrackEndRef.current();
    });

    const offErr = audioEngine.onError((msg) => {
      console.error('Playback stream error:', msg);
      const badId = currentTrackRef.current?.id || null;
      if (badId && failRef.current.id === badId) {
        failRef.current.count += 1;
      } else {
        failRef.current = { id: badId, count: 1 };
        // First failure for this URL: the cached stream may be poisoned
        // (expired/blocked googlevideo URL) — evict it so the retry
        // re-extracts a fresh URL instead of failing instantly again.
        if (badId && window.electronAPI?.invalidateStreamUrl) {
          window.electronAPI.invalidateStreamUrl(badId).catch(() => {});
        }
      }
      if (badId && failRef.current.count >= 3) {
        // Same track failed 3x in a row — drop it so the queue can't
        // spin on one bad stream, then continue.
        failRef.current = { id: null, count: 0 };
        pushToast('Skipping unplayable track', 'danger');
        setQueue(prev => {
          const idx = prev.findIndex(t => t.id === badId);
          if (idx === -1) return prev;
          const next = prev.filter((_, i) => i !== idx);
          setQueueIndex(cur => {
            if (idx < cur) return Math.max(0, cur - 1);
            if (idx === cur) return Math.min(cur, Math.max(next.length - 1, 0));
            return cur;
          });
          return next;
        });
        setTimeout(() => handleNextRef.current(), 300);
        return;
      }
      // Recovery: try next track (parity with Android 1-retry recovery)
      handleNextRef.current();
    });

    audioEngine.setMediaSessionActionHandlers({
      onPlay: () => handlePlayPauseRef.current(),
      onPause: () => handlePlayPauseRef.current(),
      onPrev: () => handlePrevRef.current(),
      onNext: () => handleNextRef.current(),
      onSeek: (pos) => handleSeekRef.current(pos),
    });
    return () => { offPlay(); offPause(); offTime(); offEnd(); offErr(); };
  }, []);

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
        if (isCreatePlaylistOpen) setIsCreatePlaylistOpen(false);
        else if (renamePlaylistId) setRenamePlaylistId(null);
        else if (pendingDeletePlaylistId) setPendingDeletePlaylistId(null);
        else if (isNowPlayingOpen) setIsNowPlayingOpen(false);
        else if (isQueueOpen) setIsQueueOpen(false);
        else if (isAddToPlaylistOpen) setIsAddToPlaylistOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, position, isNowPlayingOpen, isQueueOpen, isAddToPlaylistOpen, isMuted, volume]);

  // Synchronize Discord Rich Presence with current playback state.
  // No track → browsing presence (handled main-side). Any real
  // interaction pokes the 5-minute AFK clock (throttled).
  useEffect(() => {
    if (!window.electronAPI) return;
    if (!currentTrack) {
      window.electronAPI.updateDiscordPresence({
        track: null,
        isPlaying: false,
        position: 0,
        audioMode,
      });
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

  useEffect(() => {
    if (!window.electronAPI?.pokeDiscordPresence) return;
    let lastPoke = 0;
    const poke = () => {
      const now = Date.now();
      if (now - lastPoke < 5000) return;
      lastPoke = now;
      window.electronAPI?.pokeDiscordPresence().catch(() => {});
    };
    window.addEventListener('pointerdown', poke);
    window.addEventListener('keydown', poke);
    return () => {
      window.removeEventListener('pointerdown', poke);
      window.removeEventListener('keydown', poke);
    };
  }, []);

  // Alternate-upload fallback: when a track's upload is dead
  // (removed/region-locked), find the same song under a different
  // videoId and verify it resolves before swapping to it.
  const resolveAlternateUpload = async (
    seed: MediaTrack,
    token: number,
  ): Promise<{ track: MediaTrack; url: string } | null> => {
    if (!window.electronAPI) return null;
    try {
      const cands = (await ytMusicService.search(`${seed.title} ${seed.artist}`))
        .filter(t => t.id && t.id !== seed.id && isSameSong(seed, t))
        .slice(0, 3);
      for (const c of cands) {
        if (token !== loadTokenRef.current) return null;
        try {
          const s = await window.electronAPI.getStreamUrl(c.id);
          if (s?.streamUrl) return { track: c, url: s.streamUrl };
        } catch {
          // try next upload
        }
      }
    } catch {
      // search itself failed — give up on alternates
    }
    return null;
  };

  const pickRandomIndex = (q: MediaTrack[], exclude: number): number => {
    if (q.length <= 1) return 0;
    let idx = Math.floor(Math.random() * q.length);
    if (idx === exclude) idx = (idx + 1) % q.length;
    return idx;
  };

  const handlePlayTrack = async (track: MediaTrack, playlist?: MediaTrack[], isExplicit?: boolean) => {
    if (!track?.id) return;
    const token = ++loadTokenRef.current;
    // Stop current audio immediately and reset the timeline; the new
    // track starts only after its stream resolves.
    audioEngine.pause();
    loadingRef.current = true;
    setIsTrackLoading(true);
    setPosition(0);
    setDuration(0);
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
      let activeTrack = track;
      let streamUrl = '';
      try {
        if (window.electronAPI) {
          const streamData = await window.electronAPI.getStreamUrl(track.id);
          streamUrl = streamData.streamUrl;
        } else {
          // Fallback for browser preview
          streamUrl = `https://freq-api.vercel.app/api/stream/${track.id}`;
        }
      } catch (resolveErr) {
        // Primary upload is dead (removed/region-locked) — swap to the
        // same song from a working upload instead of failing outright.
        const alt = await resolveAlternateUpload(track, token);
        if (!alt || token !== loadTokenRef.current) throw resolveErr;
        activeTrack = alt.track;
        streamUrl = alt.url;
        setQueue(prev => prev.map(t => (t.id === track.id ? alt.track : t)));
        setCurrentTrack(alt.track);
        libraryStore.recordPlayed(alt.track);
        pushToast(`Playing alternate upload of “${track.title}”`, 'info');
      }
      // A newer tap superseded this load — never start stale audio.
      if (token !== loadTokenRef.current) return;

      await audioEngine.loadAndPlay(streamUrl, activeTrack);
      if (token !== loadTokenRef.current) {
        audioEngine.pause();
        return;
      }
      resolveFailRef.current = 0;

      // Autoplay only for single-track taps (parity: isAutoplaySafeToGenerate).
      // Explicit album/playlist queues stay verbatim.
      const explicit = isExplicit ?? (playlist ? playlist.length > 1 : false);
      if (token === loadTokenRef.current) {
        loadingRef.current = false;
        setIsTrackLoading(false);
      }
      if (explicit) return;
      // Continuation path (parity with Android): /api/watch vibe-ranked first,
      // local AutoplayEngine as fallback. Never overwrites explicit queues.
      const myToken = token;
      const seedTrack = activeTrack;
      (async () => {
        try {
          const existingIds = new Set([...newQueue.map(t => t.id), seedTrack.id]);
          const libraryContext = [...recentlyPlayed, ...likedTracks];
          const [watchTracks, seedPool] = await Promise.all([
            ytMusicService.getWatch(seedTrack.id, CONTINUATION_LIMIT),
            ytMusicService.search(seedTrack.artist).catch(() => [] as MediaTrack[]),
          ]);
          let upNext: MediaTrack[] = [];
          if (watchTracks.length > 0 && shouldUseContinuation(seedTrack, watchTracks, libraryContext)) {
            upNext = buildContinuationQueue(seedTrack.id, watchTracks, existingIds, seedTrack, libraryContext, seedPool, CONTINUATION_LIMIT);
          }
          // Top up with local vibe autoplay so thin continuations still
          // fill a full 25-track Up Next instead of stalling at a handful.
          try {
            const recs = await AutoplayEngine.generateAutoplayQueue(seedTrack, likedTracks, recentlyPlayed, userPlaylists, [], CONTINUATION_LIMIT);
            const seen = new Set([...existingIds, ...upNext.map(t => t.id)]);
            for (const r of recs) {
              if (upNext.length >= CONTINUATION_LIMIT) break;
              if (!r.id || seen.has(r.id)) continue;
              seen.add(r.id);
              upNext.push(r);
            }
          } catch (e) {
            console.warn('Autoplay top-up failed:', e);
          }
          if (upNext.length > 0 && myToken === loadTokenRef.current) {
            setQueue(prev => {
              const ids = new Set(prev.map(t => t.id));
              const toAdd = upNext.filter(r => r.id && !ids.has(r.id));
              return [...prev, ...toAdd].slice(0, prev.length + 25);
            });
          }
        } catch (e) {
          console.warn('Autoplay continuation failed:', e);
        }
      })();
    } catch (err: any) {
      console.error('Audio playback failed for track:', track.title, err);
      if (token !== loadTokenRef.current) return;
      loadingRef.current = false;
      setIsTrackLoading(false);
      const q = queueRef.current.length ? queueRef.current : queue;
      if (q.length > 1 && resolveFailRef.current < 2) {
        // Move on to the next track instead of stranding the bar dead.
        resolveFailRef.current += 1;
        pushToast(`Couldn't play “${track.title}” — skipping`, 'danger');
        setTimeout(() => {
          if (token === loadTokenRef.current) handleNextRef.current();
        }, 400);
      } else {
        pushToast(`Couldn't play “${track.title}”`, 'danger');
      }
    }
  };

  const handlePlayPause = () => {
    if (!currentTrack || loadingRef.current) return;
    if (isPlaying) {
      audioEngine.pause();
    } else {
      audioEngine.play().catch((e: any) => {
        console.error('Play toggle failed:', e);
        pushToast('Playback failed — trying next track', 'danger');
        handleNextRef.current();
      });
    }
  };

  const handleStop = () => {
    if (!currentTrack) return;
    // Cross: stop audio, cancel any pending load, reset and close the bar.
    ++loadTokenRef.current;
    loadingRef.current = false;
    setIsTrackLoading(false);
    audioEngine.pause();
    audioEngine.seek(0);
    setPosition(0);
    setDuration(0);
    setCurrentTrack(null);
  };

  const handlePrev = () => {
    const q = queueRef.current.length ? queueRef.current : queue;
    const qi = queueRef.current.length ? queueIndexRef.current : queueIndex;
    if (position > 3) {
      handleSeek(0);
      return;
    }
    if (q.length === 0) return;
    const prevIndex = qi > 0 ? qi - 1 : q.length - 1;
    setQueueIndex(prevIndex);
    handlePlayTrack(q[prevIndex], q, true);
  };

  const handleNext = () => {
    const q = queueRef.current.length ? queueRef.current : queue;
    const qi = queueRef.current.length ? queueIndexRef.current : queueIndex;
    if (q.length === 0) return;
    const shuffleOn = shuffleRef.current || isShuffle;
    const nextIndex = shuffleOn
      ? pickRandomIndex(q, qi)
      : (qi + 1 < q.length ? qi + 1 : 0);
    setQueueIndex(nextIndex);
    handlePlayTrack(q[nextIndex], q, true);
  };

  const handleTrackEnd = () => {
    const q = queueRef.current;
    const qi = queueIndexRef.current;
    const rm = repeatModeRef.current;
    const shuffleOn = shuffleRef.current;
    if (rm === 'ONE' && currentTrackRef.current) {
      handleSeekRef.current(0);
      audioEngine.play();
      return;
    }
    if (shuffleOn && q.length > 1) {
      const nextIndex = pickRandomIndex(q, qi);
      setQueueIndex(nextIndex);
      handlePlayTrack(q[nextIndex], q, true);
      return;
    }
    const isLast = qi >= q.length - 1;
    if (isLast) {
      if (rm === 'ALL') {
        setQueueIndex(0);
        if (q[0]) handlePlayTrack(q[0], q, true);
      } else {
        // OFF: stop at end (parity with Android repeat Off)
        audioEngine.pause();
      }
    } else {
      const nextIndex = qi + 1;
      setQueueIndex(nextIndex);
      if (q[nextIndex]) handlePlayTrack(q[nextIndex], q, true);
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
    // Tapping the active flavor turns flavors OFF (base playback, where
    // the bass booster lives). There is no Normal button.
    const next = mode === audioMode ? 'NORMAL' : mode;
    if (next !== 'SNR' && next !== 'NIGHTCORE' && next !== 'NORMAL') return;
    setAudioMode(next);
    audioEngine.setAudioMode(next);
    libraryStore.setAudioMode(next);
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
    const nowLiked = libraryStore.toggleLike(target);
    pushToast(nowLiked ? `Liked “${target.title}”` : `Removed “${target.title}” from Liked`, 'success');
  };

  const handleMoveQueueTrack = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setQueue(prev => {
      if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      const curId = prev[queueIndexRef.current]?.id;
      const newCur = curId ? next.findIndex(t => t.id === curId) : toIndex;
      setQueueIndex(newCur === -1 ? toIndex : newCur);
      return next;
    });
  };

  const handlePlayNextInQueue = (index: number) => {
    // Parity with Android planPlayNext: dedup later occurrence, insert after current
    setQueue(prev => {
      const cur = queueIndexRef.current;
      const item = prev[index];
      if (!item || index === cur) return prev;
      const next = prev.filter((_, i) => i !== index);
      const adjustedCur = index < cur ? cur - 1 : cur;
      const insertPos = Math.min(adjustedCur + 1, next.length);
      next.splice(insertPos, 0, item);
      setQueueIndex(adjustedCur);
      return next;
    });
    pushToast('Will play next', 'info');
  };

  const handlePlayNextTrack = (track: MediaTrack) => {
    if (!track?.id) return;
    setQueue(prev => {
      if (prev.length === 0) {
        setQueueIndex(0);
        handlePlayTrack(track, [track], true);
        return [track];
      }
      const cur = Math.min(queueIndexRef.current, prev.length - 1);
      const without = prev.filter(t => t.id !== track.id || t.id === prev[cur]?.id);
      // Remove later duplicate then insert right after current
      const filtered = without.filter((t, i) => i === cur || t.id !== track.id);
      const insertPos = Math.min(cur + 1, filtered.length);
      filtered.splice(insertPos, 0, track);
      return filtered;
    });
    pushToast(`Queued “${track.title}” next`, 'info');
  };

  // Latest-handler refs for audio callbacks registered once
  const handleTrackEndRef = useRef(handleTrackEnd);
  const handleNextRef = useRef(handleNext);
  const handlePrevRef = useRef(handlePrev);
  const handlePlayPauseRef = useRef(handlePlayPause);
  const handleSeekRef = useRef(handleSeek);
  useEffect(() => {
    handleTrackEndRef.current = handleTrackEnd;
    handleNextRef.current = handleNext;
    handlePrevRef.current = handlePrev;
    handlePlayPauseRef.current = handlePlayPause;
    handleSeekRef.current = handleSeek;
  });

  const handleNavigate = (view: string, param?: string) => {
    setCurrentView(view);
    setActiveParam(param);
  };

  // Shared Up Next queue edits (parity with Android planQueueRemove)
  const handleQueueSelect = (idx: number) => {
    const q = queueRef.current.length ? queueRef.current : queue;
    if (!q[idx]) return;
    setQueueIndex(idx);
    handlePlayTrack(q[idx], q, true);
  };

  const handleQueueRemove = (idx: number) => {
    setQueue(prev => {
      if (idx < 0 || idx >= prev.length) return prev;
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) {
        setQueueIndex(0);
        return next;
      }
      setQueueIndex(cur => {
        if (idx < cur) return Math.max(0, cur - 1);
        if (idx === cur) return Math.min(cur, next.length - 1);
        return cur;
      });
      return next;
    });
  };

  const handleQueueClear = () => {
    // Parity with Android shouldClearUpNext: keep current, drop Up Next
    setQueue(prev => {
      if (prev.length === 0) return prev;
      const cur = queueIndexRef.current;
      if (cur >= prev.length - 1) return prev;
      const current = prev[cur] || currentTrackRef.current;
      setQueueIndex(0);
      pushToast('Up Next cleared', 'info');
      return current ? [current] : [];
    });
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
          onCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
        />

        <main style={{ flex: 1, overflowY: 'auto', backgroundColor: '#090a0f' }}>
          {currentView === 'home' && (
            <div style={{ display: 'flex', height: '100%', minHeight: 0, position: 'relative', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto', minWidth: 0, backgroundColor: '#090a0f' }}>
                <HomeView
                  onPlayTrack={handlePlayTrack}
                  onOpenAlbum={id => handleNavigate('album', id)}
                  onOpenArtist={id => handleNavigate('artist', id)}
                  onOpenPlaylist={id => handleNavigate('playlist', id)}
                  onToggleLike={handleToggleLike}
                  isLiked={id => libraryStore.isLiked(id)}
                  recentlyPlayed={recentlyPlayed}
                  onSearchSubmit={q => handleNavigate('search', q)}
                  currentTrackId={currentTrack?.id ?? null}
                  isPlaying={isPlaying}
                  onOpenPlayer={() => setIsNowPlayingOpen(true)}
                />
              </div>
              <HomeLyricsRail
                isOpen={isHomeLyricsOpen && !!currentTrack}
                track={currentTrack}
                position={position}
                onSeek={handleSeek}
                onClose={() => setIsHomeLyricsOpen(false)}
              />
              <HomeQueueRail
                currentTrack={currentTrack}
                queue={queue}
                queueIndex={queueIndex}
                onSelectTrack={handleQueueSelect}
                onRemoveTrack={handleQueueRemove}
                onClearQueue={handleQueueClear}
              />
            </div>
          )}

          {currentView === 'search' && (
            <SearchView
              key={activeParam || 'search'}
              initialQuery={activeParam}
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
              onCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
              onDeletePlaylist={id => setPendingDeletePlaylistId(id)}
              onRenamePlaylist={id => setRenamePlaylistId(id)}
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
                  key={pl.id}
                  title={pl.title}
                  description={pl.description}
                  artworkUrl={pl.artworkUrl}
                  tracks={pl.tracks}
                  onBack={() => handleNavigate('library')}
                  onPlayTrack={handlePlayTrack}
                  onShufflePlay={tracks => {
                    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
                    if (shuffled[0]) handlePlayTrack(shuffled[0], shuffled, true);
                  }}
                  onToggleLike={handleToggleLike}
                  isLiked={id => libraryStore.isLiked(id)}
                  onRemoveTrack={trackId => {
                    libraryStore.removeTrackFromPlaylist(pl.id, trackId);
                    pushToast('Removed from playlist', 'info');
                  }}
                  onMoveTrack={(from, to) => {
                    if (libraryStore.moveTrackInPlaylist(pl.id, from, to)) pushToast('Playlist reordered', 'info');
                  }}
                  onPlayNext={handlePlayNextTrack}
                />
              );
            })()
          )}

          {currentView === 'album' && activeParam && (
            <AlbumDetailView
              key={activeParam}
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
              key={activeParam}
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
              onClearHistory={() => setConfirmClearHistory(true)}
            />
          )}
        </main>
      </div>

      {/* 3. Persistent Bottom Liquid-Glass Player Bar (hidden when idle) */}
      {currentTrack && (
      <PlayerBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        isLoading={isTrackLoading}
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
        onStop={handleStop}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleShuffle={handleToggleShuffle}
        onToggleRepeat={handleToggleRepeat}
        onToggleLike={() => handleToggleLike()}
        onAudioModeChange={handleAudioModeChange}
        onOpenNowPlaying={() => setIsNowPlayingOpen(true)}
        isLyricsActive={isHomeLyricsOpen && currentView === 'home'}
        onToggleLyrics={() => {
          if (currentTrack) {
            if (currentView !== 'home') handleNavigate('home');
            setIsHomeLyricsOpen(v => !v);
          }
        }}
      />
      )}

      {/* 4. Full-Screen Now Playing Modal with 3D Flip Card & Synced Lyrics */}
      <NowPlayingModal
        isOpen={isNowPlayingOpen}
        onClose={() => setIsNowPlayingOpen(false)}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        isLoading={isTrackLoading}
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
        queue={queue}
        queueIndex={queueIndex}
        onSelectQueueTrack={idx => {
          if (queue[idx]) {
            setQueueIndex(idx);
            handlePlayTrack(queue[idx], queue, true);
          }
        }}
        onRemoveQueueTrack={idx => {
          setQueue(prev => {
            if (idx < 0 || idx >= prev.length) return prev;
            const next = prev.filter((_, i) => i !== idx);
            if (next.length === 0) {
              setQueueIndex(0);
              return next;
            }
            setQueueIndex(cur => {
              if (idx < cur) return Math.max(0, cur - 1);
              if (idx === cur) return Math.min(cur, next.length - 1);
              return cur;
            });
            return next;
          });
        }}
      />

      {/* 5. Up-Next Queue Drawer */}
      <QueueDrawer
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        currentTrack={currentTrack}
        queue={queue}
        queueIndex={queueIndex}
        onSelectTrack={handleQueueSelect}
        onRemoveTrack={handleQueueRemove}
        onClearQueue={handleQueueClear}
        onMoveTrack={handleMoveQueueTrack}
        onPlayNext={handlePlayNextInQueue}
      />

      {/* 6. Add to Playlist Dialog */}
      <AddToPlaylistModal
        isOpen={isAddToPlaylistOpen}
        onClose={() => setIsAddToPlaylistOpen(false)}
        track={trackForPlaylist}
        playlists={userPlaylists}
        onAddToPlaylist={(plId, track) => {
          libraryStore.addTrackToPlaylist(plId, track);
          pushToast(`Added to playlist`, 'success');
        }}
        onCreatePlaylist={(title, track) => {
          const newPl = libraryStore.createPlaylist(title);
          if (track) libraryStore.addTrackToPlaylist(newPl.id, track);
          pushToast(`Playlist “${title}” created`, 'success');
        }}
      />

      {/* 7. Glass Create / Rename + Delete confirm + Toasts (replaces prompt/confirm/alert) */}
      <CreatePlaylistDialog
        isOpen={isCreatePlaylistOpen}
        onClose={() => setIsCreatePlaylistOpen(false)}
        onSubmit={(title, description) => {
          const pl = libraryStore.createPlaylist(title, description);
          pushToast(`Playlist “${pl.title}” created`, 'success');
          handleNavigate('playlist', pl.id);
        }}
      />
      <CreatePlaylistDialog
        isOpen={renamePlaylistId !== null}
        mode="rename"
        initialTitle={userPlaylists.find(p => p.id === renamePlaylistId)?.title || ''}
        initialDescription={userPlaylists.find(p => p.id === renamePlaylistId)?.description || ''}
        onClose={() => setRenamePlaylistId(null)}
        onSubmit={(title, description) => {
          if (renamePlaylistId) {
            libraryStore.renamePlaylist(renamePlaylistId, title, description);
            pushToast('Playlist renamed', 'success');
          }
        }}
      />
      <ConfirmDialog
        isOpen={pendingDeletePlaylistId !== null}
        title="Delete playlist?"
        message={`“${userPlaylists.find(p => p.id === pendingDeletePlaylistId)?.title || 'This playlist'}” will be removed from this device. Tracks you liked stay in Liked Songs.`}
        confirmLabel="Delete"
        onCancel={() => setPendingDeletePlaylistId(null)}
        onConfirm={() => {
          if (pendingDeletePlaylistId) {
            libraryStore.deletePlaylist(pendingDeletePlaylistId);
            pushToast('Playlist deleted', 'info');
            if (activeParam === pendingDeletePlaylistId) handleNavigate('library');
          }
        }}
      />
      <ConfirmDialog
        isOpen={confirmClearHistory}
        title="Clear history?"
        message="This erases your listening history and search history on this device. Liked songs and playlists are kept."
        confirmLabel="Clear"
        onCancel={() => setConfirmClearHistory(false)}
        onConfirm={() => {
          libraryStore.clearSearchHistory();
          libraryStore.clearRecentlyPlayed();
          pushToast('Listening & search history cleared', 'info');
        }}
      />
      <ToastStack toasts={toasts} />
    </div>
  );
};
