import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TitleBar } from './components/TitleBar';
import { GlobalSearch } from './components/GlobalSearch';
import { Sidebar } from './components/Sidebar';
import { PlayerBar } from './components/PlayerBar';
import { NowPlayingModal } from './components/NowPlayingModal';
import { QueueDrawer } from './components/QueueDrawer';
import { AddToPlaylistModal } from './components/AddToPlaylistModal';
import { TrackContextMenu } from './components/TrackContextMenu';

import { HomeView } from './views/HomeView';
import { SearchView } from './views/SearchView';
import { LibraryView } from './views/LibraryView';
import { StatsView } from './views/StatsView';
import { PlaylistDetailView } from './views/PlaylistDetailView';
import { ArtistDetailView } from './views/ArtistDetailView';
import { AlbumDetailView } from './views/AlbumDetailView';
import { SettingsView } from './views/SettingsView';
import { PartyView } from './views/PartyView';

import { AudioMode, DuplicateGroup, MediaTrack, RepeatMode, SmartMix, UserPlaylist } from './types';
import { audioEngine } from './services/audioEngine';
import { partyService, PartyPrivacy } from './services/partyService';
import { DownloadedTrack, libraryStore, LibraryStore, PlayStatEntry } from './services/libraryStore';
import { formatBytes, withLocalFile } from './services/downloads';
import { AutoplayEngine } from './services/autoplayEngine';
import { ytMusicService } from './services/ytmusic';
import { buildContinuationQueue, CONTINUATION_LIMIT } from './services/continuationQueue';
import { isAlternateUploadMatch, isSameSong, shouldUseContinuation } from './services/vibeMatch';
import { regionFromLocale } from './services/regions';
import { playbackManager } from './services/playbackManager';
import { isPlayableSource, sourceUrlOf } from './services/playbackSource';
import { clampQueueIndex, cycleRepeatMode } from './services/playbackQueueLogic';
import { ConfirmDialog, CreatePlaylistDialog, ToastItem, ToastStack } from './components/FreqDialogs';
import { HomeLyricsRail } from './components/HomeLyricsRail';

import { downloadBlob, renderShareCard } from './services/shareCard';
import { shuffle } from './utils/shuffle';

export const App: React.FC = () => {
  // Updater State
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [updateIgnored, setUpdateIgnored] = useState<boolean>(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [updateChecking, setUpdateChecking] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateDownloading, setUpdateDownloading] = useState<boolean>(false);
  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [updateReady, setUpdateReady] = useState<boolean>(false);
  // Only toast once per version per app session (the main process also
  // throttles the native notification to once per version / 24h).
  const notifiedUpdateRef = useRef<string | null>(null);

  // Auto-Updater Hook (GitHub Releases via electron-updater)
  useEffect(() => {
    if (!window.electronAPI?.onUpdaterEvent) return;

    const cleanup = window.electronAPI.onUpdaterEvent((data: any) => {
      switch (data?.type) {
        case 'checking-for-update':
          setUpdateChecking(true);
          setUpdateError(null);
          break;
        case 'update-available': {
          setUpdateChecking(false);
          setUpdateError(null);
          setUpdateIgnored(false);
          setUpdateInfo(data.info);
          setUpdateAvailable(true);
          const version = data.info?.version || 'latest';
          if (notifiedUpdateRef.current !== version) {
            notifiedUpdateRef.current = version;
            pushToast(`Update available — FreQ v${version}`, 'update', () => setCurrentView('settings'));
          }
          break;
        }
        case 'update-not-available':
          setUpdateChecking(false);
          setUpdateAvailable(false);
          break;
        case 'download-progress':
          setUpdateDownloading(true);
          setUpdateProgress(data.progress || 0);
          break;
        case 'update-downloaded':
          setUpdateDownloading(false);
          setUpdateProgress(100);
          setUpdateReady(true);
          break;
        case 'error':
          setUpdateChecking(false);
          setUpdateDownloading(false);
          setUpdateError(data.error || 'Update check failed');
          break;
      }
    });

    // Check once on startup.
    setUpdateChecking(true);
    window.electronAPI.checkForUpdates().catch(err => {
      setUpdateChecking(false);
      setUpdateError(String(err));
    });

    return cleanup;
  }, []);

  const updateVisible = updateAvailable && !updateIgnored;

  const handleCheckForUpdates = () => {
    if (!window.electronAPI?.checkForUpdates) return;
    setUpdateIgnored(false);
    setUpdateError(null);
    setUpdateChecking(true);
    window.electronAPI.checkForUpdates().catch(err => {
      setUpdateChecking(false);
      setUpdateError(String(err));
    });
  };

  const handleDownloadUpdate = () => {
    if (!window.electronAPI?.downloadUpdate) return;
    setUpdateError(null);
    window.electronAPI.downloadUpdate().catch(err => {
      setUpdateDownloading(false);
      setUpdateError(String(err));
    });
  };

  const handleInstallUpdate = () => {
    if (!window.electronAPI?.installUpdate) return;
    window.electronAPI.installUpdate().catch(err => {
      setUpdateError(String(err));
    });
  };

  // Navigation State
  const [currentView, setCurrentView] = useState<string>('home');
  const [activeParam, setActiveParam] = useState<string | undefined>(undefined);

  // Clicking the native "update available" toast focuses FreQ and opens the
  // Settings update card.
  useEffect(() => {
    const unsubscribe = window.electronAPI?.onNavigateToView?.(view => {
      setCurrentView(view);
      setActiveParam(undefined);
    });
    return () => unsubscribe?.();
  }, []);

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

  // Sleep timer: countdown stop, or stop at end of current track.
  type SleepMode = 'off' | 'timer' | 'end';
  const [sleepMode, setSleepMode] = useState<SleepMode>('off');
  const [sleepRemaining, setSleepRemaining] = useState<number>(0);
  const sleepRef = useRef<{ mode: SleepMode }>({ mode: 'off' });
  const sleepEndsAtRef = useRef<number | null>(null);
  useEffect(() => { sleepRef.current.mode = sleepMode; }, [sleepMode]);

  const [discoveryLoading, setDiscoveryLoading] = useState<boolean>(false);

  // Mini-player pin: window stays above all others.
  const [alwaysOnTop, setAlwaysOnTop] = useState<boolean>(() => {
    try {
      return localStorage.getItem('freq_always_on_top') === '1';
    } catch {
      return false;
    }
  });

  // A pinned window is a small floating player. It must never be topmost while
  // maximized — that covers the whole desktop and makes Alt+Tab appear to do
  // nothing (the pinned window stays painted over every app).
  const [isWindowMaximized, setIsWindowMaximized] = useState<boolean>(false);
  const pinActive = alwaysOnTop && !isWindowMaximized;

  const handleToggleAlwaysOnTop = () => {
    const next = !pinActive;
    setAlwaysOnTop(next);
    try {
      localStorage.setItem('freq_always_on_top', next ? '1' : '0');
    } catch {
      // Ignored.
    }
    const api = window.electronAPI;
    if (!api) return;
    if (next && isWindowMaximized) {
      // Pinning implies a floating window, so restore down first and pin once
      // the window has actually left the maximized state.
      api.maximizeWindow()
        .then(isMax => {
          setIsWindowMaximized(isMax);
          api.setAlwaysOnTop(true).catch(() => {});
        })
        .catch(() => {});
      return;
    }
    api.setAlwaysOnTop(next).catch(() => {});
  };

  // Apply the persisted pin on launch (after the window exists).
  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;
    api.isWindowMaximized().then(isMax => {
      setIsWindowMaximized(isMax);
      // The app launches maximized, so main clears any stale topmost flag; only
      // re-apply the pin if we are actually windowed.
      if (alwaysOnTop && !isMax) api.setAlwaysOnTop(true).catch(() => {});
    }).catch(() => {});
    const unsubscribe = api.onWindowMaximizedChange(setIsWindowMaximized);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Modal / Drawer Toggles
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState<boolean>(false);
  const [isInParty, setIsInParty] = useState<boolean>(() => partyService.isInParty());
  const [partyMembersCount, setPartyMembersCount] = useState<number>(() => partyService.getMembers().length);
  const [partyPrivacy, setPartyPrivacy] = useState<PartyPrivacy>(() => partyService.getPrivacy());
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, track: MediaTrack } | null>(null);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState<boolean>(false);
  const [trackForPlaylist, setTrackForPlaylist] = useState<MediaTrack | null>(null);
  const [isHomeLyricsOpen, setIsHomeLyricsOpen] = useState<boolean>(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState<boolean>(false);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState<boolean>(false);
  const [renamePlaylistId, setRenamePlaylistId] = useState<string | null>(null);
  const [pendingDeletePlaylistId, setPendingDeletePlaylistId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = (message: string, kind: ToastItem['kind'] = 'success', onClick?: () => void) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-2), { id, message, kind, onClick }]);
    // Update notices stay up longer so they can be read and clicked.
    const ttl = kind === 'update' ? 8000 : 3200;
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), ttl);
  };

  // Local Library State
  const [likedTracks, setLikedTracks] = useState<MediaTrack[]>(libraryStore.getLikedTracks());
  const [userPlaylists, setUserPlaylists] = useState<UserPlaylist[]>(libraryStore.getUserPlaylists());
  const [recentlyPlayed, setRecentlyPlayed] = useState<MediaTrack[]>(libraryStore.getRecentlyPlayed());
  const [searchHistory, setSearchHistory] = useState<string[]>(libraryStore.getSearchHistory());
  const [playStats, setPlayStats] = useState<PlayStatEntry[]>(libraryStore.getPlayStats());
  const [downloads, setDownloads] = useState<DownloadedTrack[]>(libraryStore.getDownloaded());
  // Listening region (auto-detected from the OS locale, editable in Settings).
  const [region, setRegion] = useState<string>(libraryStore.getRegion());
  const [privateMode, setPrivateMode] = useState<boolean>(libraryStore.isPrivateMode());
  const regionAutoPickedRef = useRef(false);
  // Active download progress by track id (menu shows the % live).
  const [dlProgress, setDlProgress] = useState<Record<string, number>>({});
  const [confirmCleanDup, setConfirmCleanDup] = useState<boolean>(false);

  // Subscribe to library store changes
  useEffect(() => {
    const unsub = libraryStore.subscribe(() => {
      setLikedTracks(libraryStore.getLikedTracks());
      setUserPlaylists(libraryStore.getUserPlaylists());
      setRecentlyPlayed(libraryStore.getRecentlyPlayed());
      setSearchHistory(libraryStore.getSearchHistory());
      setPlayStats(libraryStore.getPlayStats());
      setDownloads(libraryStore.getDownloaded());
      setRegion(libraryStore.getRegion());
      setPrivateMode(libraryStore.isPrivateMode());
      // First load only: silently pick a region from the OS locale instead of
      // blocking the app with a country modal on every launch.
      if (!regionAutoPickedRef.current) {
        regionAutoPickedRef.current = true;
        if (!libraryStore.isRegionPicked()) {
          const detected = regionFromLocale(navigator.language || 'en-IN');
          setTimeout(() => libraryStore.setRegion(detected), 0);
        }
      }
      // Keep the live DSP in sync with persisted flavor settings.
      audioEngine.setSnrRate(libraryStore.getSnrRate());
      audioEngine.setSnrReverb(libraryStore.getSnrReverb());
      audioEngine.setNightcoreRate(libraryStore.getNightcoreRate());
      audioEngine.setBassBoost(libraryStore.getBassBoost());
      audioEngine.setStereoWidth(libraryStore.getStereoWidth());
      audioEngine.setHdClarity(libraryStore.getHdClarity());
      audioEngine.setEqGains(libraryStore.getEqGains());
      audioEngine.setBalance(libraryStore.getBalance());
      audioEngine.setAutoLevel(libraryStore.getAutoLevel());
      audioEngine.setTrackTrims(libraryStore.getTrackTrims());
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
  const isTransitioningRef = useRef<boolean>(false);
  const repeatModeRef = useRef<RepeatMode>('OFF');
  const shuffleRef = useRef<boolean>(false);
  const currentTrackRef = useRef<MediaTrack | null>(null);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  // Live position mirror for session persistence inside mount-once listeners.
  const positionRef = useRef<number>(0);
  useEffect(() => { positionRef.current = position; }, [position]);
  const isPlayingRef = useRef<boolean>(false);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  // True once the current media element holds a loaded source. Restored
  // sessions set a track without loading it — first play loads instead.
  const sourceLoadedRef = useRef<boolean>(false);
  // Saved position of a restored session, consumed by the first play.
  const pendingPositionRef = useRef<number>(0);
  const lastPersistAtRef = useRef<number>(0);
  useEffect(() => { shuffleRef.current = isShuffle; }, [isShuffle]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  const partyPlaybackDesiredRef = useRef<boolean>(true);
  const partyTrackSyncRef = useRef<{
    trackId: string;
    hostPos: number;
    hostTimestamp: number;
    isPlaying: boolean;
  } | null>(null);

  // Listened-minutes bookkeeping: mark = position at last bank. Banking
  // is idempotent (mark advances), so pause/skip/end can all bank safely.
  const listenMarkRef = useRef<{ id: string | null; atSec: number }>({ id: null, atSec: 0 });
  const bankListenedMs = () => {
    const t = currentTrackRef.current;
    const mark = listenMarkRef.current;
    if (!t || mark.id !== t.id) return;
    const ms = (positionRef.current - mark.atSec) * 1000;
    if (ms > 2000) libraryStore.recordListenMs(t.id, ms);
    mark.atSec = positionRef.current;
  };

  // Writes the resumable session snapshot (Android PlaybackPersistence
  // parity). Ref-only so mount-once listeners can call it safely.
  const persistSessionNow = () => {
    bankListenedMs();
    const track = currentTrackRef.current;
    const q = queueRef.current;
    if (!track || q.length === 0) return;
    playbackManager.saveSession({
      queue: q,
      queueIndex: queueIndexRef.current,
      trackId: track.id,
      positionMs: Math.round(positionRef.current * 1000),
      shuffle: shuffleRef.current,
      repeatMode: repeatModeRef.current,
    });
  };

  // Setup Audio Engine Event Handlers — subscribe once with cleanup (fixes listener leak)
  useEffect(() => {
    partyService.setPositionGetter(() => audioEngine.getCurrentTime());

    const offPlay = audioEngine.onPlay(() => {
      isTransitioningRef.current = false;
      setIsPlaying(true);
      if (partyService.isInParty() && partyService.getIsHost()) {
        partyService.broadcastPlayState(true, audioEngine.getCurrentTime());
      }
      // A track that starts rendering is healthy — reset its failure count.
      const id = currentTrackRef.current?.id;
      if (id) failRef.current = { id, count: 0 };
    });
    const offPause = audioEngine.onPause(() => {
      setIsPlaying(false);
      persistSessionNow();
      if (partyService.isInParty() && partyService.getIsHost()) {
        partyService.broadcastPlayState(false, audioEngine.getCurrentTime());
      }
    });
    const offTime = audioEngine.onTimeUpdate((pos, dur) => {
      partyService.updateLocalPlaybackStatus(pos, isPlayingRef.current, currentTrackRef.current);
      // Keep duration accurate even when the app is in the background (e.g. user in a game or Discord),
      // so Discord presence and party sync always show the exact real track length.
      if (typeof dur === 'number' && Number.isFinite(dur) && dur > 0) {
        setDuration(prevDur => {
          if (Math.abs(prevDur - dur) >= 1) {
            if (currentTrackRef.current && Math.abs((currentTrackRef.current.durationSeconds || 0) - dur) >= 1) {
              currentTrackRef.current.durationSeconds = Math.round(dur);
            }
            return dur;
          }
          return prevDur;
        });
      }
      // Keep the timeline live in every state, including unfocused.
      setPosition(pos);
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
        // (expired/blocked googlevideo URL) — evict it on both sides so the
        // retry re-extracts a fresh URL instead of failing instantly again.
        playbackManager.invalidateCachedSource(badId || '');
        if (badId && window.electronAPI?.invalidateStreamUrl) {
          window.electronAPI.invalidateStreamUrl(badId).catch(() => {});
        }
      }
              if (badId && failRef.current.count < 3) {
          pushToast(`Stream broken. Retrying... (${failRef.current.count}/3)`, 'info');
          setTimeout(() => {
            const tr = currentTrackRef.current;
            const q = queueRef.current.length ? queueRef.current : queue;
            if (tr) handlePlayTrackRef.current(tr, q, true);
          }, 1500);
          return;
        } else if (badId && failRef.current.count >= 3) {
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

  // Session restore (Android PlaybackPersistence parity): one-shot on
  // mount, restored paused — the first play resumes at the saved position.
  useEffect(() => {
    const snap = playbackManager.loadSession();
    if (!snap || snap.queue.length === 0) return;
    const idx = clampQueueIndex(snap.queueIndex, snap.queue.length);
    const track = snap.queue[idx] || null;
    setQueue(snap.queue);
    setQueueIndex(idx);
    setCurrentTrack(track);
    const posSec = snap.positionMs / 1000;
    pendingPositionRef.current = posSec;
    setPosition(posSec);
    if (track) setDuration(track.durationSeconds || 0);
    setIsShuffle(snap.shuffle);
    setRepeatMode(snap.repeatMode);
    sourceLoadedRef.current = false;
  }, []);

  // Throttled session persist while playing (10s) — pause/track edits
  // persist immediately via persistSessionNow.
  useEffect(() => {
    if (!currentTrack || queue.length === 0) return;
    const now = Date.now();
    if (now - lastPersistAtRef.current < 10_000) return;
    lastPersistAtRef.current = now;
    persistSessionNow();
  }, [currentTrack, queue, queueIndex, isShuffle, repeatMode, position]);

  // Seamless-transition prefetch (Android maybePrefetchNext parity): warm
  // the next track's URL as this one nears its end. Ref-only, no UI touch.
  useEffect(() => {
    const q = queueRef.current;
    if (q.length === 0 || duration <= 0) return;
    playbackManager.maybePrefetchNext(
      currentTrackRef.current,
      q[queueIndexRef.current + 1],
      duration,
      position,
    );
  }, [position, duration]);

  // Global Keyboard Shortcuts (remappable in Settings; Esc closes dialogs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      const bindings = libraryStore.getShortcuts();
      const match = (code: string, ctrl: boolean) =>
        code === e.code && ctrl === !!(e.ctrlKey || e.metaKey);

      if (match(bindings.playPause.code, bindings.playPause.ctrl)) {
        e.preventDefault();
        handlePlayPause();
      } else if (match(bindings.next.code, bindings.next.ctrl)) {
        e.preventDefault();
        handleNext();
      } else if (match(bindings.prev.code, bindings.prev.ctrl)) {
        e.preventDefault();
        handlePrev();
      } else if (match(bindings.seekForward.code, bindings.seekForward.ctrl)) {
        e.preventDefault();
        handleSeek(positionRef.current + 5);
      } else if (match(bindings.seekBack.code, bindings.seekBack.ctrl)) {
        e.preventDefault();
        handleSeek(positionRef.current - 5);
      } else if (match(bindings.mute.code, bindings.mute.ctrl)) {
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
  }, [isPlaying, isNowPlayingOpen, isQueueOpen, isAddToPlaylistOpen, isMuted, volume]);

  // Synchronize Discord Rich Presence with current playback state.
  // No track → browsing presence (handled main-side). Any real
  // interaction pokes the 5-minute AFK clock (throttled).
  const pausedRpcTimerRef = useRef<number | null>(null);
  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const clearPausedTimer = () => {
      if (pausedRpcTimerRef.current !== null) {
        window.clearTimeout(pausedRpcTimerRef.current);
        pausedRpcTimerRef.current = null;
      }
    };

    // Fresh engine position keeps Discord's timeline aligned with the audio
    // that is actually audible (React state can lag by up to a clock tick).
    const sendPresence = (playing: boolean) => {
      if (!currentTrack || privateMode) return;
      // Prefer the engine clock (authoritative); fall back to React state for
      // a restored-but-not-yet-loaded session.
      const enginePos = audioEngine.getCurrentTime();
      const reportedPos = enginePos > 0 ? enginePos : position;
      const exactDuration = duration > 0 ? Math.round(duration) : (currentTrack.durationSeconds || 194);
      api.updateDiscordPresence({
        track: {
          id: currentTrack.id,
          title: currentTrack.title,
          artist: currentTrack.artist,
          album: currentTrack.album,
          artworkUrl: currentTrack.artworkUrl,
          durationSeconds: exactDuration,
        },
        isPlaying: playing,
        position: reportedPos,
        audioMode,
        party: isInParty && partyService.getPartyCode() ? {
          code: partyService.getPartyCode()!,
          size: partyMembersCount || 1,
          max: 5,
          isHost: partyService.getIsHost(),
          privacy: partyService.getPrivacy(),
        } : undefined,
      });
    };

    // Private mode / stopped: always browsing presence, never the track.
    if (!currentTrack || privateMode) {
      clearPausedTimer();
      api.updateDiscordPresence({
        track: null,
        isPlaying: false,
        position: 0,
        audioMode,
        party: !privateMode && isInParty && partyService.getPartyCode() ? {
          code: partyService.getPartyCode()!,
          size: partyMembersCount || 1,
          max: 5,
          isHost: partyService.getIsHost(),
          privacy: partyService.getPrivacy(),
        } : undefined,
      });
      return clearPausedTimer;
    }

    if (isPlaying) {
      clearPausedTimer();
      sendPresence(true);
      return clearPausedTimer;
    }

    // During auto-advance the engine briefly pauses the old source before the
    // next one starts. Never publish "Paused" for that transient: the next
    // track's play event sends the accurate state.
    if (isTrackLoading || isTransitioningRef.current) {
      clearPausedTimer();
      return clearPausedTimer;
    }

    // A real pause (or repeat-off stop). Debounce briefly so a track boundary
    // can't flash "Paused", then report the exact frozen position.
    clearPausedTimer();
    pausedRpcTimerRef.current = window.setTimeout(() => {
      pausedRpcTimerRef.current = null;
      sendPresence(false);
    }, 600);

    return clearPausedTimer;
  }, [currentTrack, isPlaying, duration, audioMode, privateMode, isTrackLoading, isInParty, partyMembersCount, partyPrivacy]);

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
  // (removed/region-locked/bot-checked), find the same song under a different
  // videoId (official video, lyrical video, alternate audio) and verify it resolves.
  const resolveAlternateUpload = async (
    seed: MediaTrack,
    token: number,
  ): Promise<{ track: MediaTrack; url: string } | null> => {
    if (!window.electronAPI) return null;
    try {
      const query = `${seed.title} ${seed.artist || ''}`.trim();
      const titleOnly = seed.title.trim();

      const searchPromises: Promise<MediaTrack[]>[] = [];
      if (window.electronAPI?.searchTracks) {
        searchPromises.push(
          window.electronAPI.searchTracks(query).catch(() => []),
          window.electronAPI.searchTracks(titleOnly).catch(() => []),
        );
      }
      searchPromises.push(
        ytMusicService.search(query).catch(() => []),
      );

      const searchBatches = await Promise.all(searchPromises);
      const allCandidates = searchBatches.flat();

      // Deduplicate candidates by ID and filter for legitimate song uploads
      const seenIds = new Set<string>([seed.id]);
      const validCandidates: MediaTrack[] = [];
      for (const cand of allCandidates) {
        if (!cand?.id || seenIds.has(cand.id)) continue;
        if (isAlternateUploadMatch(seed, cand) || isSameSong(seed, cand)) {
          seenIds.add(cand.id);
          validCandidates.push(cand);
        }
      }

      // Try top matching uploads until one provides a working, playable stream
      for (const c of validCandidates.slice(0, 5)) {
        if (token !== loadTokenRef.current) return null;
        try {
          const src = await playbackManager.resolveSource(c);
          if (isPlayableSource(src)) {
            const url = sourceUrlOf(src);
            if (url) return { track: c, url };
          }
        } catch {
          // try next upload candidate
        }
      }
    } catch (err) {
      console.warn('Alternate upload search failed:', err);
    }
    return null;
  };

  const pickRandomIndex = (q: MediaTrack[], exclude: number): number => {
    if (q.length <= 1) return 0;
    let idx = Math.floor(Math.random() * q.length);
    if (idx === exclude) idx = (idx + 1) % q.length;
    return idx;
  };

  const handlePlayTrack = async (
    track: MediaTrack,
    playlist?: MediaTrack[],
    isExplicit?: boolean,
    startAtSec: number = 0,
    fromPartySync: boolean = false,
  ) => {
    if (!track?.id) return;

    // Party guard: non-host guest cannot play or switch tracks on their own unless they leave the party
    if (partyService.isInParty() && !partyService.getIsHost() && !fromPartySync) {
      pushToast('Only the host can choose songs in a party. Leave the party to play your own music.', 'info');
      return;
    }
    loadingRef.current = true;
    setIsTrackLoading(true);
    isTransitioningRef.current = true;
    // Offline first: attach the downloaded file when present and intact.
    track = await withLocalFile(track);
    const token = ++loadTokenRef.current;
    // New selection: the next-track prefetch belongs to the old boundary.
    playbackManager.resetPrefetch();
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

    if (!playlist || playlist.length === 0) {
      ytMusicService.getWatch(track.id, 25).then(vibeQueue => {
        if (loadTokenRef.current !== token) return;
        if (vibeQueue && vibeQueue.length > 0) {
          setQueue(vibeQueue);
          const vIndex = vibeQueue.findIndex(t => t.id === track.id);
          setQueueIndex(vIndex !== -1 ? vIndex : 0);
        }
      }).catch(err => console.warn('Failed vibe queue', err));
    }

    // Resolve audio through the ordered source chain (local → yt-dlp
    // bridge → cloud), with cache + validation handled inside.
    try {
      let activeTrack = track;
      let streamUrl: string | null = null;
      try {
        const resolved = await playbackManager.resolveSource(track);
        streamUrl = isPlayableSource(resolved) ? sourceUrlOf(resolved) : null;
        if (!streamUrl) throw new Error(`No playable source for ${track.id}`);
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

      await audioEngine.loadAndPlay(streamUrl, activeTrack, startAtSec);
      // Party sync catch-up: Compensate for source resolution & audio buffering time on guest
      if (partyService.isInParty() && !partyService.getIsHost()) {
        if (!partyPlaybackDesiredRef.current) {
          audioEngine.pause();
          setIsPlaying(false);
        } else if (partyTrackSyncRef.current && partyTrackSyncRef.current.trackId === activeTrack.id) {
          const sync = partyTrackSyncRef.current;
          const now = Date.now();
          const elapsedSec = Math.max(0, (now - sync.hostTimestamp) / 1000);
          const expectedHostPos = sync.hostPos + (sync.isPlaying ? elapsedSec : 0);
          const currentGuestPos = audioEngine.getCurrentTime();
          const lag = expectedHostPos - currentGuestPos;
          if (lag > 0.25) {
            audioEngine.seek(expectedHostPos);
            setPosition(expectedHostPos);
          }
          audioEngine.setSyncRateMultiplier(1.0);
        }
      }
      sourceLoadedRef.current = true;
      libraryStore.recordTrackStart(activeTrack);
      listenMarkRef.current = { id: activeTrack.id, atSec: startAtSec };
      if (startAtSec > 0 && !partyService.isInParty()) {
        setPosition(startAtSec);
      }
      if (token !== loadTokenRef.current) {
        audioEngine.pause();
        return;
      }
      resolveFailRef.current = 0;

      // Broadcast to Listen Together party if we are the Host
      if (partyService.getIsHost() && partyService.isInParty()) {
        partyService.broadcastTrackChange(activeTrack, startAtSec, true);
      }

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
    if (partyService.isInParty() && !partyService.getIsHost()) {
      pushToast('Playback is controlled by the party host. Leave the party to control playback.', 'info');
      return;
    }
    if (!currentTrack || loadingRef.current) return;
    if (!sourceLoadedRef.current) {
      // Restored session: a track is set but no media was ever loaded —
      // load it now, resuming at the saved position.
      const q = queueRef.current.length ? queueRef.current : queue;
      const at = pendingPositionRef.current;
      pendingPositionRef.current = 0;
      handlePlayTrack(currentTrack, q, true, at);
      return;
    }
    if (isPlaying) {
      audioEngine.pause();
      if (partyService.getIsHost() && partyService.isInParty()) {
        partyService.broadcastPlayState(false, position);
      }
    } else {
      audioEngine.play().then(() => {
        if (partyService.getIsHost() && partyService.isInParty()) {
          partyService.broadcastPlayState(true, position);
        }
      }).catch((e: any) => {
        console.error('Play toggle failed:', e);
        pushToast('Playback failed — trying next track', 'danger');
        handleNextRef.current();
      });
    }
  };

  const handleStop = () => {
    if (partyService.isInParty() && !partyService.getIsHost()) {
      pushToast('Only the host can stop party playback.', 'info');
      return;
    }
    if (!currentTrack) return;
    bankListenedMs();
    // Cross: stop audio, cancel any pending load, reset and close the bar.
    ++loadTokenRef.current;
    loadingRef.current = false;
    isTransitioningRef.current = false;
    sourceLoadedRef.current = false;
    setIsTrackLoading(false);
    audioEngine.pause();
    audioEngine.seek(0);
    setPosition(0);
    setDuration(0);
    setCurrentTrack(null);
  };

  const handlePrev = () => {
    if (partyService.isInParty() && !partyService.getIsHost()) {
      pushToast('Only the host can skip tracks in a party.', 'info');
      return;
    }
    const q = queueRef.current.length ? queueRef.current : queue;
    const qi = queueRef.current.length ? queueIndexRef.current : queueIndex;
    if (position > 3) {
      handleSeek(0);
      return;
    }
    if (q.length === 0) return;
    bankListenedMs();
    const prevIndex = qi > 0 ? qi - 1 : q.length - 1;
    setQueueIndex(prevIndex);
    handlePlayTrack(q[prevIndex], q, true);
  };

  const handleNext = () => {
    if (partyService.isInParty() && !partyService.getIsHost()) {
      pushToast('Only the host can skip tracks in a party.', 'info');
      return;
    }
    const q = queueRef.current.length ? queueRef.current : queue;
    const qi = queueRef.current.length ? queueIndexRef.current : queueIndex;
    if (q.length === 0) return;
    bankListenedMs();
    const shuffleOn = shuffleRef.current || isShuffle;
    const nextIndex = shuffleOn
      ? pickRandomIndex(q, qi)
      : (qi + 1 < q.length ? qi + 1 : 0);
    setQueueIndex(nextIndex);
    handlePlayTrack(q[nextIndex], q, true);
  };

  const handleSetSleep = (v: number | null | 'end') => {
    if (v === null) {
      sleepRef.current.mode = 'off';
      sleepEndsAtRef.current = null;
      setSleepMode('off');
      setSleepRemaining(0);
      pushToast('Sleep timer off', 'info');
    } else if (v === 'end') {
      sleepEndsAtRef.current = null;
      sleepRef.current.mode = 'end';
      setSleepMode('end');
      pushToast('Will stop at end of track', 'info');
    } else {
      sleepEndsAtRef.current = Date.now() + v * 60000;
      sleepRef.current.mode = 'timer';
      setSleepMode('timer');
      setSleepRemaining(v * 60);
      pushToast(`Sleep in ${v} min`, 'info');
    }
  };

  const handleTrackEnd = () => {
    bankListenedMs();
    if (partyService.isInParty() && !partyService.getIsHost()) {
      // In party, guest must wait for the host's TRACK_CHANGE broadcast!
      isTransitioningRef.current = false;
      audioEngine.pause();
      setIsPlaying(false);
      return;
    }
    if (sleepRef.current.mode === 'end') {
      sleepRef.current.mode = 'off';
      setSleepMode('off');
      audioEngine.pause();
      pushToast('Sleep timer ended', 'info');
      return;
    };
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
        isTransitioningRef.current = false;
        audioEngine.pause();
      }
    } else {
      const nextIndex = qi + 1;
      setQueueIndex(nextIndex);
      if (q[nextIndex]) handlePlayTrack(q[nextIndex], q, true);
    }
  };

  const handleSeek = (sec: number) => {
    if (partyService.isInParty() && !partyService.getIsHost()) {
      pushToast('Only the host can seek in a party.', 'info');
      return;
    }
    audioEngine.seek(sec);
    setPosition(sec);
    if (partyService.getIsHost() && partyService.isInParty()) {
      partyService.broadcastSeek(sec);
    }
    if (window.electronAPI && currentTrack && !privateMode) {
      window.electronAPI.updateDiscordPresence({
        track: {
          id: currentTrack.id,
          title: currentTrack.title,
          artist: currentTrack.artist,
          album: currentTrack.album,
          artworkUrl: currentTrack.artworkUrl,
          durationSeconds: (duration > 0 && Number.isFinite(duration)) ? Math.round(duration) : (currentTrack.durationSeconds || 194),
        },
        isPlaying,
        position: sec,
        audioMode,
        party: isInParty && partyService.getPartyCode() ? {
          code: partyService.getPartyCode()!,
          size: partyMembersCount || 1,
          max: 5,
          isHost: partyService.getIsHost(),
          privacy: partyService.getPrivacy(),
        } : undefined,
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
    setRepeatMode(cycleRepeatMode(repeatMode));
  };

  const handleToggleLike = (track?: MediaTrack) => {
    const target = track || currentTrack;
    if (!target) return;
    const nowLiked = libraryStore.toggleLike(target);
    pushToast(nowLiked ? `Liked “${target.title}”` : `Removed “${target.title}” from Liked`, 'success');
  };

  const handleMoveQueueTrack = (fromIndex: number, toIndex: number) => {
    if (partyService.isInParty() && !partyService.getIsHost()) {
      pushToast('Queue is managed by the party host.', 'info');
      return;
    }
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
    if (partyService.isInParty() && !partyService.getIsHost()) {
      pushToast('Queue is managed by the party host.', 'info');
      return;
    }
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

  // Smart Mixes: auto-built from taste (Replay = most played, Liked = reshuffled).
  const smartMixes: SmartMix[] = useMemo(() => {
    const mixes: SmartMix[] = [];
    const top = playStats.slice(0, 25);
    if (top.length >= 5) {
      mixes.push({
        id: 'mix-replay',
        title: 'Replay Mix',
        description: `${top.length} most-played songs`,
        tracks: top.map(s => s.track),
      });
    }
    if (likedTracks.length >= 5) {
      const shuffled = shuffle(likedTracks);
      mixes.push({
        id: 'mix-liked',
        title: 'Liked Shuffle',
        description: `${likedTracks.length} liked songs, reshuffled`,
        tracks: shuffled,
      });
    }
    return mixes;
  }, [playStats, likedTracks]);

  const handlePlayMix = (mix: SmartMix) => {
    if (partyService.isInParty() && !partyService.getIsHost()) {
      pushToast('Only the host can choose songs in a party.', 'info');
      return;
    }
    if (mix.tracks.length === 0) return;
    handlePlayTrack(mix.tracks[0], mix.tracks, true);
  };

  // Discovery Mix: fresh songs from the most-played artist.
  const handlePlayDiscoveryMix = async () => {
    if (partyService.isInParty() && !partyService.getIsHost()) {
      pushToast('Only the host can choose songs in a party.', 'info');
      return;
    }
    if (discoveryLoading) return;
    const seedArtist = playStats.length > 0
      ? (playStats[0].track.artist || '').split(',')[0].trim()
      : '';
    if (!seedArtist || seedArtist === 'Unknown Artist') {
      pushToast('Play more songs to unlock Discovery Mix', 'info');
      return;
    }
    setDiscoveryLoading(true);
    try {
      const tracks = (await ytMusicService.search(seedArtist)).filter(t => t.id).slice(0, 25);
      if (tracks.length === 0) {
        pushToast('No discovery tracks found', 'danger');
        return;
      }
      handlePlayTrack(tracks[0], tracks, true);
    } catch {
      pushToast('Discovery Mix failed', 'danger');
    } finally {
      setDiscoveryLoading(false);
    }
  };

  // Download progress listener (main process streams yt-dlp % here).
  useEffect(() => {
    if (!window.electronAPI?.onDownloadProgress) return;
    return window.electronAPI.onDownloadProgress(({ videoId, pct }) => {
      setDlProgress(prev => ({ ...prev, [videoId]: pct }));
    });
  }, []);

  const handleDownloadTrack = async (track: MediaTrack) => {
    if (!track?.id) return;
    if (!window.electronAPI?.downloadTrack) {
      pushToast('Downloads need the desktop app', 'danger');
      return;
    }
    if (dlProgress[track.id] != null || libraryStore.isDownloaded(track.id)) {
      pushToast('Already downloaded', 'info');
      return;
    }
    setDlProgress(prev => ({ ...prev, [track.id]: 0 }));
    try {
      const res = await window.electronAPI.downloadTrack(track.id);
      libraryStore.recordDownloaded(track, res.path, res.sizeBytes);
      pushToast(`Downloaded “${track.title}” (${formatBytes(res.sizeBytes)})`, 'success');
    } catch {
      pushToast(`Download failed`, 'danger');
    } finally {
      setDlProgress(prev => {
        const next = { ...prev };
        delete next[track.id];
        return next;
      });
    }
  };

  const handleRemoveDownload = async (trackId: string) => {
    const filePath = libraryStore.removeDownloaded(trackId);
    if (filePath && window.electronAPI?.deleteDownloadedFile) {
      try {
        await window.electronAPI.deleteDownloadedFile(filePath);
      } catch {
        // Record already dropped; file may be gone.
      }
    }
    pushToast('Download removed', 'info');
  };

  // Smart Playlists: rule-based virtual lists (auto-refresh with taste).
  const smartPlaylists: SmartMix[] = useMemo(() => {
    const out: SmartMix[] = [];
    const byCount = [...playStats].sort((a, b) => b.count - a.count);
    if (byCount.length >= 5) {
      out.push({
        id: 'sp-rotation',
        title: 'Heavy Rotation',
        description: `${Math.min(byCount.length, 25)} most-played tracks`,
        tracks: byCount.slice(0, 25).map(s => s.track),
      });
    }
    const playedIds = new Set(playStats.map(s => s.track.id));
    const gems = likedTracks.filter(t => !playedIds.has(t.id)).slice(0, 25);
    if (gems.length >= 3) {
      out.push({
        id: 'sp-gems',
        title: 'Unplayed Gems',
        description: `${gems.length} liked but never played`,
        tracks: gems,
      });
    }
    const pool = new Map<string, MediaTrack>();
    for (const t of [...likedTracks, ...userPlaylists.flatMap(p => p.tracks)]) {
      if (!pool.has(t.id)) pool.set(t.id, t);
    }
    const marathon = [...pool.values()].filter(t => (t.durationSeconds || 0) >= 360).slice(0, 25);
    if (marathon.length >= 3) {
      out.push({
        id: 'sp-marathon',
        title: 'Marathon',
        description: `${marathon.length} songs over 6 minutes`,
        tracks: marathon,
      });
    }
    return out;
  }, [playStats, likedTracks, userPlaylists]);

  // Duplicate groups across liked + playlists, for the cleanup tool.
  const duplicateGroups: DuplicateGroup[] = useMemo(() => {
    const counts = new Map<string, { title: string; artist: string; copies: number }>();
    const all = [...likedTracks, ...userPlaylists.flatMap(p => p.tracks)];
    for (const t of all) {
      const key = LibraryStore.duplicateKey(t);
      const cur = counts.get(key);
      if (cur) cur.copies += 1;
      else counts.set(key, { title: t.title, artist: t.artist, copies: 1 });
    }
    return [...counts.entries()]
      .filter(([, v]) => v.copies > 1)
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => b.copies - a.copies)
      .slice(0, 50);
  }, [likedTracks, userPlaylists]);

  const downloadTextFile = (name: string, text: string, mime: string) => {
    const blob = new Blob([text], { type: `${mime};charset=utf-8` });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  const handleExportJSON = () => {
    downloadTextFile('freq-library.json', libraryStore.exportLibraryJSON(), 'application/json');
    pushToast('Library exported (JSON)', 'success');
  };

  const handleExportM3U = () => {
    downloadTextFile('freq-library.m3u', libraryStore.exportLibraryM3U(), 'audio/x-mpegurl');
    pushToast('Library exported (M3U)', 'success');
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      if (/^\s*#EXTM3U/i.test(text) || text.includes('#EXTINF')) {
        const tracks = LibraryStore.parseM3UTracks(text);
        if (tracks.length === 0) {
          pushToast('No YouTube tracks found in M3U', 'danger');
          return;
        }
        const base = file.name.replace(/\.[^.]+$/, '') || 'Imported Playlist';
        const res = libraryStore.importM3UTracks(base, tracks);
        pushToast(`Imported ${res.tracks} tracks into “${res.playlist}”`, 'success');
      } else {
        const res = libraryStore.importLibraryJSON(text);
        pushToast(`Imported ${res.tracks} tracks in ${res.playlists} playlists${res.skipped > 0 ? ` (${res.skipped} skipped)` : ''}`, 'success');
      }
    } catch {
      pushToast('Import failed — unreadable file', 'danger');
    }
  };

  // Region pick (Settings): persists, marks picked, Home refetches.
  const handleRegionPick = (code: string) => {
    libraryStore.setRegion(code);
    setRegion(code);
  };

  // Share card: render + save PNG for the current track.
  const handleShareTrack = async () => {
    const t = currentTrackRef.current;
    if (!t) return;
    try {
      const blob = await renderShareCard(t);
      downloadBlob(blob, `freq-${t.id}.png`);
      pushToast('Share card saved', 'success');
    } catch {
      pushToast('Share card failed', 'danger');
    }
  };

  // Playlist link import: scrape songs into a same-named playlist.
  const handleImportPlaylistLink = async (url: string): Promise<{ title: string; count: number } | null> => {
    const scraped = await ytMusicService.importPlaylistLink(url);
    if (!scraped || scraped.tracks.length === 0) return null;
    const created = libraryStore.createPlaylist(scraped.title);
    const added = libraryStore.addTracksToPlaylist(created.id, scraped.tracks);
    pushToast(`Saved ${added} songs to “${created.title}”`, 'success');
    return { title: created.title, count: added };
  };

  // 1s ticker: sleep countdown. Ref-only, mount once.
  useEffect(() => {
    const id = setInterval(() => {
      if (sleepRef.current.mode === 'timer' && sleepEndsAtRef.current) {
        const left = Math.ceil((sleepEndsAtRef.current - Date.now()) / 1000);
        if (left <= 0) {
          sleepRef.current.mode = 'off';
          sleepEndsAtRef.current = null;
          setSleepMode('off');
          setSleepRemaining(0);
          audioEngine.pause();
        } else {
          setSleepRemaining(left);
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

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
  const handlePlayTrackRef = useRef(handlePlayTrack);
  const handlePrevRef = useRef(handlePrev);
  const handlePlayPauseRef = useRef(handlePlayPause);
  const handleSeekRef = useRef(handleSeek);
  useEffect(() => {
    handleTrackEndRef.current = handleTrackEnd;
    handleNextRef.current = handleNext;
    handlePlayTrackRef.current = handlePlayTrack;
    handlePrevRef.current = handlePrev;
    handlePlayPauseRef.current = handlePlayPause;
    handleSeekRef.current = handleSeek;
  });

  // Listen Together Party Sync Listener (Guests mirror Host playback & timeline in real-time)
  useEffect(() => {
    const unsubSync = partyService.onSyncEvent(ev => {
      // Host broadcasts, so ignore our own sync events
      if (partyService.getIsHost()) return;

      switch (ev.type) {
        case 'track': {
          if (!ev.track) return;
          const now = Date.now();
          const transitSec = Math.max(0, Math.min(2.0, (now - (ev.timestamp || now)) / 1000));
          const isPlaying = ev.isPlaying ?? true;
          partyPlaybackDesiredRef.current = isPlaying;
          const hostPosNow = (ev.position || 0) + (isPlaying ? transitSec : 0);

          partyTrackSyncRef.current = {
            trackId: ev.track.id,
            hostPos: ev.position || 0,
            hostTimestamp: ev.timestamp || now,
            isPlaying,
          };

          const current = currentTrackRef.current;
          if (!current || current.id !== ev.track.id) {
            // Pass fromPartySync = true so party guests are allowed to load the host's selected track
            handlePlayTrackRef.current(ev.track, [ev.track], true, hostPosNow, true);
          } else if (ev.position !== undefined) {
            audioEngine.syncDrift(hostPosNow);
            setPosition(audioEngine.getCurrentTime());
          }
          if (isPlaying && !isPlayingRef.current) {
            audioEngine.play().catch(() => {});
          } else if (!isPlaying && isPlayingRef.current) {
            audioEngine.pause();
            audioEngine.setSyncRateMultiplier(1.0);
            setIsPlaying(false);
          }
          break;
        }

        case 'playState': {
          if (ev.isPlaying !== undefined) {
            partyPlaybackDesiredRef.current = ev.isPlaying;
            if (!ev.isPlaying) {
              // Host paused: unconditionally freeze guest audio immediately
              audioEngine.pause();
              audioEngine.setSyncRateMultiplier(1.0);
              setIsPlaying(false);
              if (ev.position !== undefined) {
                audioEngine.seek(ev.position);
                setPosition(ev.position);
              }
            } else {
              // Host resumed: align position with transit latency compensation
              const now = Date.now();
              const transitSec = Math.max(0, Math.min(2.0, (now - (ev.timestamp || now)) / 1000));
              const targetPos = (ev.position || 0) + transitSec;
              if (Math.abs(audioEngine.getCurrentTime() - targetPos) > 0.4) {
                audioEngine.seek(targetPos);
                setPosition(targetPos);
              }
              if (!isPlayingRef.current) {
                audioEngine.play().catch(() => {});
              }
            }
          }
          break;
        }

        case 'seek': {
          if (ev.position !== undefined) {
            const now = Date.now();
            const transitSec = Math.max(0, Math.min(2.0, (now - (ev.timestamp || now)) / 1000));
            const targetPos = ev.position + (ev.isPlaying ? transitSec : 0);
            audioEngine.seek(targetPos);
            setPosition(targetPos);
            audioEngine.setSyncRateMultiplier(1.0);
          }
          if (ev.isPlaying !== undefined) {
            partyPlaybackDesiredRef.current = ev.isPlaying;
            if (ev.isPlaying && !isPlayingRef.current) {
              audioEngine.play().catch(() => {});
            } else if (!ev.isPlaying) {
              audioEngine.pause();
              setIsPlaying(false);
            }
          }
          break;
        }

        case 'timelineSync': {
          const now = Date.now();
          const transitSec = Math.max(0, Math.min(2.0, (now - (ev.timestamp || now)) / 1000));
          const isPlaying = ev.isPlaying ?? isPlayingRef.current;
          const targetHostPos = (ev.position || 0) + (isPlaying ? transitSec : 0);

          // Update loading target ref in case guest is currently resolving or buffering
          if (partyTrackSyncRef.current) {
            partyTrackSyncRef.current.hostPos = ev.position || 0;
            partyTrackSyncRef.current.hostTimestamp = ev.timestamp || now;
            partyTrackSyncRef.current.isPlaying = isPlaying;
          }

          if (isPlayingRef.current && isPlaying && !isTrackLoading) {
            // High-precision smooth drift sync (Spotify Listen Together algorithm)
            audioEngine.syncDrift(targetHostPos);
            setPosition(audioEngine.getCurrentTime());
          }

          if (ev.isPlaying !== undefined) {
            partyPlaybackDesiredRef.current = ev.isPlaying;
            if (ev.isPlaying && !isPlayingRef.current && !isTrackLoading) {
              audioEngine.play().catch(() => {});
            } else if (!ev.isPlaying && isPlayingRef.current) {
              audioEngine.pause();
              audioEngine.setSyncRateMultiplier(1.0);
              setIsPlaying(false);
            }
          }
          break;
        }

        case 'memberJoined': {
          if (ev.member) {
            pushToast(`${ev.member.name} joined the party! 🎉`, 'success');
          }
          break;
        }

        case 'memberLeft': {
          if (ev.member) {
            pushToast(`${ev.member.name} left the party.`, 'info');
          }
          break;
        }

        case 'kicked': {
          pushToast(ev.reason || 'You have been removed from the party.', 'danger');
          break;
        }

        case 'hostEnded': {
          pushToast(ev.reason || 'The host ended the party.', 'info');
          break;
        }
      }
    });

    const unsubParty = partyService.subscribe(() => {
      setIsInParty(partyService.isInParty());
      setPartyMembersCount(partyService.getMembers().length);
      setPartyPrivacy(partyService.getPrivacy());
    });

    return () => {
      unsubSync();
      unsubParty();
    };
  }, []);

  // Join a party straight from Discord Rich Presence. The main process only
  // sends this for public parties (they carry a join secret); private rooms
  // remain code-only.
  useEffect(() => {
    const unsubscribe = window.electronAPI?.onDiscordJoinParty?.(rawCode => {
      const code = (rawCode || '').replace(/\D/g, '');
      if (code.length !== 4) return;

      if (partyService.isInParty() && partyService.getPartyCode() === code) {
        pushToast(`You're already in party #${code}.`, 'info');
        return;
      }

      handleNavigate('party');
      pushToast(`Joining party #${code} from Discord...`, 'info');
      (async () => {
        try {
          await partyService.joinParty(code);
          pushToast(`Joined party #${code} from Discord 🎉`, 'success');
        } catch (err: any) {
          pushToast(err?.message || 'Could not join the Discord party.', 'danger');
        }
      })();
    });

    return () => {
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div className="fq-app">
      <div className="fq-ambient" aria-hidden="true" />
      <div className="fq-grain" aria-hidden="true" />

      {/* 1. Custom Frameless Windows TitleBar */}
      <TitleBar />

      {/* 2. Workspace: icon rail + content */}
      <div className="fq-body">
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          audioMode={audioMode}
          onAudioModeChange={handleAudioModeChange}
          playlists={userPlaylists}
          likedCount={likedTracks.length}
          onCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
          hasUpdate={updateVisible}
          onOpenParty={() => handleNavigate('party')}
          isInParty={isInParty}
          partyMembersCount={partyMembersCount}
        />

        <div className="fq-main">
          {/* The Search view owns its own primary search field, so the chrome
              command bar steps aside there to avoid two competing inputs. */}
          {currentView !== 'search' && (
            <GlobalSearch
              onSearchSubmit={q => handleNavigate('search', q)}
              onPlayTrack={handlePlayTrack}
            />
          )}

          <div className="fq-main-body">
            <div className="fq-scroll" key={`${currentView}:${activeParam || ''}`}>
          {currentView === 'home' && (
            <HomeView
                  onTrackContextMenu={(e, track) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, track }); }} onPlayTrack={handlePlayTrack}
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
                  region={region}
                />
          )}

          {currentView === 'search' && (
            <SearchView
              key={activeParam || 'search'}
              initialQuery={activeParam}
              onTrackContextMenu={(e, track) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, track }); }} onPlayTrack={handlePlayTrack}
              onToggleLike={handleToggleLike}
              isLiked={id => libraryStore.isLiked(id)}
              onOpenAddToPlaylist={track => {
                setTrackForPlaylist(track);
                setIsAddToPlaylistOpen(true);
              }}
              searchHistory={searchHistory} recentlyPlayed={recentlyPlayed}
              onAddSearchHistory={q => libraryStore.addSearchQuery(q)}
              onClearSearchHistory={() => libraryStore.clearSearchHistory()}
            />
          )}

          {currentView === 'library' && (
            <LibraryView
              likedTracks={likedTracks}
              userPlaylists={userPlaylists}
              recentlyPlayed={recentlyPlayed}
              smartMixes={smartMixes}
              smartPlaylists={smartPlaylists}
              downloadedTracks={downloads}
              totalDownloadBytes={downloads.reduce((s, d) => s + (d.sizeBytes || 0), 0)}
              discoveryLoading={discoveryLoading}
              onPlayMix={handlePlayMix}
              onPlayDiscoveryMix={handlePlayDiscoveryMix}
              onRemoveDownloaded={handleRemoveDownload}
              onImportPlaylistLink={handleImportPlaylistLink}
              onTrackContextMenu={(e, track) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, track }); }} onPlayTrack={handlePlayTrack}
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
              onTrackContextMenu={(e, track) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, track }); }} onPlayTrack={handlePlayTrack}
              onShufflePlay={tracks => {
                const shuffled = shuffle(tracks);
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
                  artworkUrl={pl.coverUrl || pl.artworkUrl}
                  hasCustomCover={!!pl.coverUrl}
                  onChangeCover={dataUrl => {
                    libraryStore.setPlaylistCover(pl.id, dataUrl);
                    pushToast(dataUrl ? 'Playlist cover updated' : 'Cover removed', 'info');
                  }}
                  tracks={pl.tracks}
                  onBack={() => handleNavigate('library')}
                  onTrackContextMenu={(e, track) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, track }); }} onPlayTrack={handlePlayTrack}
                  onShufflePlay={tracks => {
                    const shuffled = shuffle(tracks);
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
              onTrackContextMenu={(e, track) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, track }); }} onPlayTrack={handlePlayTrack}
              onShufflePlay={tracks => {
                const shuffled = shuffle(tracks);
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
              onTrackContextMenu={(e, track) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, track }); }} onPlayTrack={handlePlayTrack}
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
              duplicates={duplicateGroups}
              onCleanDuplicates={() => setConfirmCleanDup(true)}
              onExportJSON={handleExportJSON}
              onExportM3U={handleExportM3U}
              onImportFile={handleImportFile}
              region={region}
              onRegionChange={handleRegionPick}
              privateMode={privateMode}
              onTogglePrivate={() => {
                const next = !privateMode;
                libraryStore.setPrivateMode(next);
                pushToast(next ? 'Private listening on' : 'Private listening off', 'info');
              }}
              hasUpdate={updateVisible}
              updateInfo={updateInfo}
              updateChecking={updateChecking}
              updateError={updateError}
              updateIgnored={updateIgnored && updateAvailable}
              updateDownloading={updateDownloading}
              updateProgress={updateProgress}
              updateReady={updateReady}
              onCheckUpdate={handleCheckForUpdates}
              onDownloadUpdate={handleDownloadUpdate}
              onInstallUpdate={handleInstallUpdate}
              onIgnoreUpdate={() => setUpdateIgnored(true)}
            />
          )}

          {currentView === 'stats' && (
            <StatsView
              stats={playStats}
              totalMs={playStats.reduce((sum, s) => sum + (s.totalMs || 0), 0)}
              onPlayTrack={(t, q) => handlePlayTrack(t, q)}
            />
          )}

          {currentView === 'party' && (
            <PartyView
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              position={position}
              duration={duration}
              onNavigate={handleNavigate}
            />
          )}
            </div>

            {currentView === 'home' && (
              <HomeLyricsRail
                isOpen={isHomeLyricsOpen && !!currentTrack}
                track={currentTrack}
                position={position}
                onSeek={handleSeek}
                onClose={() => setIsHomeLyricsOpen(false)}
              />
            )}
          </div>
        </div>
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
        onOpenNowPlaying={() => setIsNowPlayingOpen(true)}
        alwaysOnTop={pinActive}
        onToggleAlwaysOnTop={handleToggleAlwaysOnTop}
        isLyricsActive={isHomeLyricsOpen && currentView === 'home'}
        onToggleLyrics={() => {
          if (currentTrack) {
            if (currentView !== 'home') handleNavigate('home');
            setIsHomeLyricsOpen(v => !v);
          }
        }}
        onOpenParty={() => handleNavigate('party')}
        isInParty={isInParty}
        partyMembersCount={partyMembersCount}
        isPartyGuest={isInParty && !partyService.getIsHost()}
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
        onMoveQueueTrack={handleMoveQueueTrack}
        volume={volume}
        isMuted={isMuted}
        sleepMode={sleepMode}
        sleepRemainingSec={sleepRemaining}
        onSetSleep={handleSetSleep}
        onShare={handleShareTrack}
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
          libraryStore.clearPlayStats();
          setConfirmClearHistory(false);
          pushToast('Listening & search history cleared', 'info');
        }}
      />
      <ConfirmDialog
        isOpen={confirmCleanDup}
        title="Remove duplicates?"
        message={`This keeps the first copy of ${duplicateGroups.length} duplicated song${duplicateGroups.length === 1 ? '' : 's'} and removes the rest across liked songs and playlists.`}
        confirmLabel="Remove"
        onCancel={() => setConfirmCleanDup(false)}
        onConfirm={() => {
          const removed = libraryStore.removeDuplicateTracks();
          setConfirmCleanDup(false);
          pushToast(`Removed ${removed} duplicate cop${removed === 1 ? 'y' : 'ies'}`, 'success');
        }}
      />
              {contextMenu && (
          <TrackContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            track={contextMenu.track}
            isLiked={libraryStore.isLiked(contextMenu.track.id)}
            trimDb={libraryStore.getTrackTrim(contextMenu.track.id)}
            onTrimAdjust={d => libraryStore.adjustTrackTrim(contextMenu.track.id, d)}
            onTrimReset={() => libraryStore.resetTrackTrim(contextMenu.track.id)}
            isDownloaded={libraryStore.isDownloaded(contextMenu.track.id)}
            downloadPct={dlProgress[contextMenu.track.id] ?? null}
            onDownload={() => handleDownloadTrack(contextMenu.track)}
            onRemoveDownload={() => handleRemoveDownload(contextMenu.track.id)}
            onClose={() => setContextMenu(null)}
            onPlay={() => handlePlayTrack(contextMenu.track)}
            onPlayNext={() => handlePlayNextTrack(contextMenu.track)}
            onAddToQueue={() => {
              setQueue(prev => [...prev, contextMenu.track]);
              pushToast('Added to queue', 'success');
            }}
            onAddToPlaylist={() => {
              setTrackForPlaylist(contextMenu.track);
              setIsAddToPlaylistOpen(true);
            }}
            onToggleLike={() => handleToggleLike(contextMenu.track)}
          />
        )}
      <ToastStack toasts={toasts} />
    </div>
  );
};





















