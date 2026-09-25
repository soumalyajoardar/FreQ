package com.gresseymusic.wave.player

import android.content.ComponentName
import android.content.Context
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.Toast
import androidx.annotation.OptIn
import androidx.compose.runtime.compositionLocalOf
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.MoreExecutors
import com.gresseymusic.wave.data.library.LocalLibraryRepository
import com.gresseymusic.wave.data.model.HomeCatalogSection
import com.gresseymusic.wave.data.playback.PlaybackPersistence
import com.gresseymusic.wave.data.recommendation.AutoplayEngine
import com.gresseymusic.wave.data.repository.CatalogResult
import com.gresseymusic.wave.data.repository.MusicRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.coroutines.delay
import java.util.concurrent.ConcurrentHashMap

data class PlaybackSessionSnapshot(
    val trackId: String?,
    val queueIds: List<String>,
    val queueIndex: Int,
    val positionMs: Long,
    val isPlaying: Boolean,
    val shuffleEnabled: Boolean,
    val repeatMode: Int,
)

@OptIn(UnstableApi::class)
class PlaybackManager(
    context: Context,
    val musicRepository: MusicRepository,
    val libraryRepository: LocalLibraryRepository? = null,
    val remoteProvider: RemotePlaybackProvider? = null,
) {

    val packageName: String = context.applicationContext.packageName
    private val applicationContext = context.applicationContext
    private val persistence = PlaybackPersistence(applicationContext)
    private val persistenceMutex = Mutex()
    val sourceResolver = PlaybackSourceResolver(remoteProvider)

    // Resolved stream URLs are cached per track id. Without this, every
    // seek/pause/skip would re-run remote extraction (network, up to ~25s)
    // just to check playability before touching the player.
    private val sourceCache = ConcurrentHashMap<String, PlaybackSource>()

    private suspend fun cachedSourceFor(track: MediaTrack?): PlaybackSource {
        if (track == null) return PlaybackSource.Unavailable
        val existing = sourceCache[track.id]
        if (existing != null) {
            when (existing) {
                is PlaybackSource.LocalUri -> {
                    Log.v(TAG, "[SOURCE_CACHE] hit local track=${track.id}")
                    return existing
                }
                is PlaybackSource.RemoteUri -> {
                    val exp = existing.expiresAtMs
                    // 60-second safety margin: if it expires within 60s or is already expired, refresh it
                    if (exp == null || exp > System.currentTimeMillis() + 60_000L) {
                        Log.v(TAG, "[SOURCE_CACHE] hit remote track=${track.id}")
                        return existing
                    } else {
                        Log.d(TAG, "[PlaybackRecovery] Cached source for ${track.id} expired at $exp, refreshing")
                        sourceCache.remove(track.id)
                    }
                }
                is PlaybackSource.Unavailable -> {
                    // Unavailable sources should not become permanently cached
                    sourceCache.remove(track.id)
                }
            }
        }
        Log.v(TAG, "[SOURCE_CACHE] miss track=${track.id}")
        val resolved = sourceResolver.resolve(track)
        if (resolved.isPlayable) {
            sourceCache[track.id] = resolved
        }
        return resolved
    }

    fun invalidateCachedSource(trackId: String) {
        if (trackId.isBlank()) return
        val removed = sourceCache.remove(trackId)
        if (removed != null) {
            Log.d(TAG, "[PlaybackRecovery] Invalidating cached source for track=$trackId")
        }
    }

    private var controllerFuture: ListenableFuture<MediaController>? = null
    private var mediaController: MediaController? = null
    private var playerListener: Player.Listener? = null

    // Concurrency / recovery guards
    private var activePlaybackToken: Long = 0L
    private var activePlaybackJob: Job? = null
    private var recoveryJob: Job? = null
    private var playlistSyncJob: Job? = null
    private var restoreJob: Job? = null
    private var autoplayJob: Job? = null
    private val recoveredTracks = ConcurrentHashMap<String, Boolean>()
    private var isRestoringSession: Boolean = false

    /**
     * M27.6 seamless-transition prefetch: "currentId->nextId" key for which
     * the next track's source has already been warmed. Reset whenever the
     * current track changes so each boundary gets exactly one prefetch.
     */
    private var prefetchNextForKey: String? = null

    /**
     * M26: Tracks whether the current queue was assembled explicitly by the
     * user (album, playlist, user playlist, multi-track queue). When true,
     * AutoplayEngine will NOT replace or append to the queue automatically.
     * Set to false when starting from a single-track context (Home/Search/Library).
     */
    var isExplicitQueue: Boolean = false
        private set

    // Release / persist bookkeeping (M12 lifecycle hardening)
    private var released = false
    private var lastPersistedSnapshot: PlaybackSessionSnapshot? = null

    // Playable media ids installed by the last full playlist sync, in player
    // order. Targeted player edits are only applied while the controller
    // playlist still matches this list exactly (and shuffle is off);
    // otherwise the caller falls back to a full rebuild.
    private var syncedPlayableIds: List<String> = emptyList()
    private var syncedPlayableIndices: List<Int> = emptyList()

    private val scope = CoroutineScope(Dispatchers.Main + Job())
    private var progressTickerJob: Job? = null
    private var tickerTickCount = 0

    // A fresh install starts with a genuinely empty queue. Development audio
    // must never appear as the initial user-facing queue or current track
    // (M14/M27 production-data audit).
    private val _state = MutableStateFlow(
        PlaybackState(
            currentTrack = null,
            isPlaying = false,
            isLoading = false,
            isFavorite = false,
            progressSeconds = 0f,
            queue = emptyList(),
            currentQueueIndex = 0,
            playbackError = null,
        ),
    )
    val state: StateFlow<PlaybackState> = _state.asStateFlow()

    // Output route (M28g): live speaker / headphones / Bluetooth chip in
    // Now Playing. Narrow flow so route changes never recompose progress
    // collectors.
    private val _audioRoute = MutableStateFlow(currentOutputRoute())
    val audioRoute: StateFlow<AudioRoute> = _audioRoute.asStateFlow()

    private val routeCallback = object : AudioDeviceCallback() {
        override fun onAudioDevicesAdded(addedDevices: Array<out AudioDeviceInfo>) {
            refreshOutputRoute()
        }

        override fun onAudioDevicesRemoved(removedDevices: Array<out AudioDeviceInfo>) {
            refreshOutputRoute()
        }
    }
    private var routeCallbackRegistered = false

    private fun currentOutputRoute(): AudioRoute {
        return try {
            val manager = applicationContext.getSystemService(AudioManager::class.java) ?: return AudioRoute.SPEAKER
            audioRouteForTypes(
                manager.getDevices(AudioManager.GET_DEVICES_OUTPUTS).map { it.type }.toSet(),
            )
        } catch (_: Exception) {
            AudioRoute.SPEAKER
        }
    }

    private fun refreshOutputRoute() {
        _audioRoute.value = currentOutputRoute()
    }

    private fun registerRouteCallback() {
        if (routeCallbackRegistered) return
        try {
            val manager = applicationContext.getSystemService(AudioManager::class.java) ?: return
            manager.registerAudioDeviceCallback(routeCallback, Handler(Looper.getMainLooper()))
            routeCallbackRegistered = true
            refreshOutputRoute()
        } catch (_: Exception) {
        }
    }

    private fun unregisterRouteCallback() {
        if (!routeCallbackRegistered) return
        routeCallbackRegistered = false
        try {
            applicationContext.getSystemService(AudioManager::class.java)
                ?.unregisterAudioDeviceCallback(routeCallback)
        } catch (_: Exception) {
        }
    }

    init {
        Log.d(TAG, "[PlaybackManager] INIT")
        initializeMediaController()
        registerRouteCallback()
    }

    private fun initializeMediaController() {
        // Reconnect-safe: a second init must not open a duplicate controller
        // connection or register a duplicate listener.
        if (controllerFuture != null || released) return
        val sessionToken = SessionToken(
            applicationContext,
            ComponentName(applicationContext, AudioPlaybackService::class.java),
        )
        Log.d(TAG, "[PlaybackManager] Building MediaController")
        controllerFuture = MediaController.Builder(applicationContext, sessionToken).buildAsync()
        controllerFuture?.addListener(
            {
                try {
                    val controller = controllerFuture?.get()
                    Log.d(TAG, "[PlaybackManager] MediaController connected: ${controller != null}")
                    mediaController = controller
                    setupPlayerListener(controller)
                    applyAudioModeToController()
                    restoreSavedSession()
                } catch (e: Exception) {
                    Log.e(TAG, "[PlaybackManager] MediaController connection failed", e)
                }
            },
            MoreExecutors.directExecutor(),
        )
    }

    private fun restoreSavedSession() {
        isRestoringSession = true
        restoreJob?.cancel()
        restoreJob = scope.launch(Dispatchers.IO) {
            try {
                // If controller already has an active session with media items, don't overwrite it!
                // Instead, synchronize state from the active player.
                var alreadyHasSession = false
                val controllerMediaIds = mutableListOf<String>()
                var activeIndex = 0
                var isPlayingNow = false
                var currentPos = 0L
                var isShuffle = false
                var currentRepeat = 0

                withContext(Dispatchers.Main) {
                    val controller = mediaController
                    if (controller != null && controller.mediaItemCount > 0) {
                        alreadyHasSession = true
                        for (i in 0 until controller.mediaItemCount) {
                            controller.getMediaItemAt(i).mediaId.takeIf { it.isNotBlank() }?.let {
                                controllerMediaIds.add(it)
                            }
                        }
                        activeIndex = controller.currentMediaItemIndex
                        isPlayingNow = controller.isPlaying
                        currentPos = controller.currentPosition
                        isShuffle = controller.shuffleModeEnabled
                        currentRepeat = when (controller.repeatMode) {
                            Player.REPEAT_MODE_ALL -> 1
                            Player.REPEAT_MODE_ONE -> 2
                            else -> 0
                        }
                    }
                }

                if (alreadyHasSession) {
                    val activeQueue = mutableListOf<MediaTrack>()
                    for (id in controllerMediaIds) {
                        musicRepository.getTrack(id)?.let { activeQueue.add(it) }
                    }
                    val validQueue = if (activeQueue.isNotEmpty()) activeQueue else _state.value.queue
                    val clampedIndex = clampQueueIndex(activeIndex, validQueue.size)
                    val activeTrack = validQueue.getOrNull(clampedIndex) ?: _state.value.currentTrack
                    val isLiked = activeTrack?.let { libraryRepository?.isTrackLiked(it.id) } ?: false

                    withContext(Dispatchers.Main) {
                        _state.update {
                            it.copy(
                                queue = validQueue,
                                currentQueueIndex = clampedIndex,
                                currentTrack = activeTrack,
                                isFavorite = isLiked,
                                isPlaying = isPlayingNow,
                                progressSeconds = (currentPos / 1000f).coerceAtLeast(0f),
                                shuffleEnabled = isShuffle,
                                repeatMode = currentRepeat,
                                isLoading = false,
                                playbackError = null,
                            )
                        }
                        // Seed the targeted-edit bookkeeping from the live
                        // player playlist so later queue edits can use
                        // targeted mutations instead of full rebuilds.
                        syncedPlayableIds = controllerMediaIds.toList()
                        syncedPlayableIndices = emptyList()
                    }
                    isRestoringSession = false
                    return@launch
                }

                val savedData = persistence.loadSavedPlaybackData()
                if (savedData == null || (savedData.queueTrackIds.isEmpty() && savedData.currentTrackId == null)) {
                    isRestoringSession = false
                    return@launch
                }

                val restoredQueue = mutableListOf<MediaTrack>()
                for (id in savedData.queueTrackIds) {
                    val track = musicRepository.getTrack(id)
                    if (track != null) {
                        restoredQueue.add(track)
                    }
                }

                if (restoredQueue.isEmpty() && savedData.currentTrackId != null) {
                    musicRepository.getTrack(savedData.currentTrackId)?.let { restoredQueue.add(it) }
                }

                if (restoredQueue.isEmpty()) {
                    isRestoringSession = false
                    return@launch
                }

                val clampedIndex = clampQueueIndex(savedData.currentQueueIndex, restoredQueue.size)
                val restoredCurrentTrack = restoredQueue[clampedIndex]
                val restoredPosSec = (savedData.currentPositionMs / 1000f).coerceAtLeast(0f)
                val isLiked = libraryRepository?.isTrackLiked(restoredCurrentTrack.id) ?: false

                withContext(Dispatchers.Main) {
                    _state.update {
                        it.copy(
                            queue = restoredQueue,
                            currentQueueIndex = clampedIndex,
                            currentTrack = restoredCurrentTrack,
                            isFavorite = isLiked,
                            progressSeconds = restoredPosSec,
                            shuffleEnabled = savedData.shuffleEnabled,
                            repeatMode = savedData.repeatMode,
                            isPlaying = false,
                            isLoading = false,
                            playbackError = null,
                        )
                    }
                }

                val playableItems = mutableListOf<MediaItem>()
                var playableIndex = 0

                for ((i, track) in restoredQueue.withIndex()) {
                    val source = cachedSourceFor(track)
                    val item = createMediaItemFromSource(track, source)
                    if (item != null) {
                        if (i == clampedIndex) {
                            playableIndex = playableItems.size
                        }
                        playableItems.add(item)
                    }
                }

                withContext(Dispatchers.Main) {
                    val controller = mediaController ?: return@withContext
                    // Double check controller was not populated concurrently while resolving sources
                    if (controller.mediaItemCount > 0) return@withContext
                    if (playableItems.isNotEmpty()) {
                        val targetPos = savedData.currentPositionMs
                        try {
                            controller.setMediaItems(playableItems, playableIndex.coerceIn(0, playableItems.lastIndex), targetPos)
                            controller.shuffleModeEnabled = savedData.shuffleEnabled
                            controller.repeatMode = when (savedData.repeatMode) {
                                1 -> Player.REPEAT_MODE_ALL
                                2 -> Player.REPEAT_MODE_ONE
                                else -> Player.REPEAT_MODE_OFF
                            }
                            controller.prepare()
                            controller.pause()
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    }
                }
            } finally {
                isRestoringSession = false
            }
        }
    }

    private fun setupPlayerListener(controller: MediaController?) {
        // Capture a non-null reference: the listener object below cannot
        // smart-cast the nullable parameter, and every callback here
        // requires a controller.
        val attached = controller ?: return
        // Keep the listener reference so release() can detach it; otherwise
        // every manager instance leaks a listener on its controller.
        val listener = object : Player.Listener {
                override fun onIsPlayingChanged(isPlaying: Boolean) {
                    _state.update { it.copy(isPlaying = isPlaying) }
                    if (isPlaying) {
                        _state.update { it.copy(isLoading = false, playbackError = null) }
                        startProgressTicker()
                        val currentTrack = _state.value.currentTrack
                        if (currentTrack != null) {
                            recordPlaybackIfPlayable(currentTrack)
                        }
                    } else {
                        stopProgressTicker()
                        persistCurrentSession()
                    }
                }

                override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                    if (attached.mediaItemCount == 0) return
                    val currentQueue = _state.value.queue
                    if (currentQueue.isEmpty()) return
                    Log.d(TAG, "[Transition] reason=$reason mediaId=${mediaItem?.mediaId} " +
                        "playerIndex=${attached.currentMediaItemIndex}/${attached.mediaItemCount} " +
                        "queue=${currentQueue.size} playWhenReady=${attached.playWhenReady} " +
                        "playing=${attached.isPlaying}")

                    // M27.4 verification logging
                    val fromTrack = _state.value.currentTrack?.id ?: "none"
                    val toTrack = mediaItem?.mediaId ?: "none"
                    Log.d(TAG, "[PLAYBACK_TRANSITION] reason=$reason from=$fromTrack to=$toTrack " +
                        "media3Index=${attached.currentMediaItemIndex} " +
                        "queueIndex=${_state.value.currentQueueIndex} " +
                        "queueSize=${currentQueue.size} media3Size=${attached.mediaItemCount}")

                    // Resolve target index from timeline position and synced playable indices (Bug B fix)
                    val mediaId = mediaItem?.mediaId
                    val playerIndex = attached.currentMediaItemIndex

                    val targetIndex = resolveTransitionQueueIndex(
                        playerIndex = playerIndex,
                        mediaId = mediaId,
                        queueIds = currentQueue.map { it.id },
                        syncedPlayableIndices = syncedPlayableIndices,
                    )

                    val activeTrack = currentQueue[targetIndex]
                    // M27.3: only invalidate async work when actually CHANGING
                    // tracks. The initial PLAYLIST_CHANGED transition for the
                    // already-current track (same id) must NOT bump the token:
                    // it is part of the same selection, and bumping here
                    // self-invalidated scheduleAutoplayFor (issued by the same
                    // playTrack call) depending on network race timing — the
                    // root cause of intermittently missing autoplay queues.
                    // Genuine advances (different id, including repeat/shuffle
                    // moves) still invalidate as before.
                    if (activeTrack.id != _state.value.currentTrack?.id) {
                        activePlaybackToken++
                    }
                    prefetchNextForKey = null
                    recoveryJob?.cancel()
                    recoveredTracks.remove(activeTrack.id)
                    val isLiked = libraryRepository?.isTrackLiked(activeTrack.id) ?: false
                    _state.update { state ->
                        state.copy(
                            currentQueueIndex = targetIndex,
                            currentTrack = activeTrack,
                            isFavorite = isLiked,
                            progressSeconds = 0f,
                            playbackError = null,
                        )
                    }
                    persistCurrentSession()
                    recordPlaybackIfPlayable(activeTrack)
                    // M27.6: an auto-advanced track becomes current exactly
                    // like a tapped one — fetch its full details (artwork,
                    // duration) in the background and republish. Playback
                    // never waits for this.
                    if (activeTrack.id != fromTrack) {
                        refreshCurrentTrackDetails(activeTrack.id, activePlaybackToken)
                    }
                }

                override fun onPlaybackStateChanged(playbackState: Int) {
                    when (playbackState) {
                        Player.STATE_BUFFERING -> {
                            _state.update { it.copy(isLoading = true) }
                        }
                        Player.STATE_READY -> {
                            val durSec = (attached.duration / 1000).toInt().coerceAtLeast(1)
                            _state.update { state ->
                                val activeTrack = state.currentTrack?.copy(durationSeconds = durSec) ?: state.currentTrack
                                state.copy(currentTrack = activeTrack, isLoading = false, playbackError = null)
                            }
                        }
                        Player.STATE_ENDED -> {
                            _state.update { it.copy(isPlaying = false, isLoading = false) }
                        }
                        Player.STATE_IDLE -> {
                            // Waiting or idle
                        }
                    }
                }

                override fun onShuffleModeEnabledChanged(shuffleModeEnabled: Boolean) {
                    _state.update { it.copy(shuffleEnabled = shuffleModeEnabled) }
                    persistCurrentSession()
                }

                override fun onRepeatModeChanged(repeatMode: Int) {
                    val appRepeat = when (repeatMode) {
                        Player.REPEAT_MODE_ALL -> 1
                        Player.REPEAT_MODE_ONE -> 2
                        else -> 0
                    }
                    _state.update { it.copy(repeatMode = appRepeat) }
                    persistCurrentSession()
                }

                override fun onPlayerError(error: PlaybackException) {
                    Log.w(TAG, "[PlaybackRecovery] onPlayerError: ${error.errorCodeName} (${error.errorCode}): ${error.message}")
                    _state.update { it.copy(isLoading = false) }
                    val currentTrack = _state.value.currentTrack
                    val isLocal = currentTrack?.mediaUri?.isNotBlank() == true
                    if (currentTrack == null || isLocal) {
                        Log.d(TAG, "[PlaybackRecovery] Track is local or null, preserving local error behavior")
                        _state.update { it.copy(isPlaying = false, playbackError = "Playback failed: ${error.message}") }
                        return
                    }

                    // Check retry guard
                    if (recoveredTracks[currentTrack.id] == true) {
                        Log.w(TAG, "[PlaybackRecovery] Recovery already attempted for track=${currentTrack.id}, stopping retry loop")
                        _state.update { it.copy(isPlaying = false, playbackError = "Playback unavailable") }
                        Toast.makeText(applicationContext, "Streaming error: playback unavailable", Toast.LENGTH_SHORT).show()
                        return
                    }

                    // Start recovery for remote track
                    Log.d(TAG, "[PlaybackRecovery] Remote playback error for track=${currentTrack.id}")
                    val token = activePlaybackToken
                    val savedPosMs = attached.currentPosition.coerceAtLeast(0L)
                    val queue = _state.value.queue
                    val queueIndex = _state.value.currentQueueIndex

                    recoveredTracks[currentTrack.id] = true
                    invalidateCachedSource(currentTrack.id)
                    _state.update { it.copy(isLoading = true) }

                    // Tracked so a newer selection (or a natural transition)
                    // cancels a stale recovery before it can resurrect an old
                    // track after the user moved on.
                    recoveryJob?.cancel()
                    recoveryJob = scope.launch {
                        Log.d(TAG, "[PlaybackRecovery] Resolving fresh source for track=${currentTrack.id}")
                        val freshSource = sourceResolver.resolve(currentTrack)
                        if (freshSource.isPlayable) {
                            sourceCache[currentTrack.id] = freshSource
                            Log.d(TAG, "[PlaybackRecovery] Fresh source resolved for track=${currentTrack.id}")

                            // Check stale recovery token & current track
                            if (isRecoveryStale(token, activePlaybackToken, currentTrack.id, _state.value.currentTrack?.id)) {
                                Log.d(TAG, "[PlaybackRecovery] Recovery ignored because current track changed")
                                return@launch
                            }

                            Log.d(TAG, "[PlaybackRecovery] Restoring position=$savedPosMs ms for track=${currentTrack.id}")
                            playQueueOnExoPlayer(queue, queueIndex, startPositionMs = savedPosMs)
                            _state.update { it.copy(isPlaying = true, isLoading = false, playbackError = null) }
                            Log.d(TAG, "[PlaybackRecovery] Recovery succeeded for track=${currentTrack.id}")
                        } else {
                            Log.w(TAG, "[PlaybackRecovery] Recovery failed: fresh source unavailable for track=${currentTrack.id}")
                            if (!isRecoveryStale(token, activePlaybackToken, currentTrack.id, _state.value.currentTrack?.id)) {
                                _state.update { it.copy(isPlaying = false, isLoading = false, playbackError = "Streaming unavailable") }
                                pauseExoPlayer()
                                Toast.makeText(applicationContext, "Streaming not available for this track yet", Toast.LENGTH_SHORT).show()
                            }
                        }
                    }
                }
            }
        playerListener = listener
        controller?.addListener(listener)
    }

    private fun recordPlaybackIfPlayable(track: MediaTrack) {
        scope.launch {
            if (cachedSourceFor(track).isPlayable && libraryRepository != null) {
                libraryRepository.recordTrackPlayed(track)
            }
        }
    }

    /**
     * M27.6: enrich the current track with full catalog details (artwork,
     * duration) after an automatic transition. Runs on IO; republishes on
     * Main only if the track is still current and the token is fresh.
     * Playback and artwork load in parallel — never blocking.
     */
    private fun refreshCurrentTrackDetails(trackId: String, token: Long) {
        scope.launch(Dispatchers.IO) {
            val artStart = System.currentTimeMillis()
            Log.d(TAG, "[ARTWORK] fetch start trackId=$trackId")
            val detailed = try {
                musicRepository.getTrack(trackId)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.d(TAG, "[ARTWORK] fetch failed trackId=$trackId: ${e.message}")
                null
            }
            if (detailed == null) {
                Log.d(TAG, "[ARTWORK] no detail trackId=$trackId (backend returned null)")
                return@launch
            }
            if (isSyncStale(token, activePlaybackToken)) return@launch
            val loadedMs = System.currentTimeMillis() - artStart
            withContext(Dispatchers.Main) {
                if (isSyncStale(token, activePlaybackToken)) return@withContext
                val current = _state.value.currentTrack
                if (current?.id != trackId) return@withContext
                val fallbackArt = com.gresseymusic.wave.data.remote.YtMusicApiClient
                    .artworkOrYoutubeFallback(detailed.artworkUrl, trackId)
                    ?: current.artworkUrl
                val patched = current.copy(
                    artworkUrl = fallbackArt,
                    durationSeconds = detailed.durationSeconds
                        .takeIf { it > 1 } ?: current.durationSeconds,
                    album = detailed.album.takeIf { it.isNotBlank() } ?: current.album,
                )
                if (patched != current) {
                    _state.update { st ->
                        st.copy(
                            currentTrack = patched,
                            queue = st.queue.map { q ->
                                if (q.id == trackId) {
                                    q.copy(
                                        artworkUrl = patched.artworkUrl,
                                        durationSeconds = patched.durationSeconds,
                                    )
                                } else q
                            },
                        )
                    }
                    Log.d(TAG, "[ARTWORK] loaded trackId=$trackId durationMs=$loadedMs artwork=${!patched.artworkUrl.isNullOrBlank()}")
                }
            }
        }
    }

    private fun startProgressTicker() {
        stopProgressTicker()
        tickerTickCount = 0
        progressTickerJob = scope.launch(Dispatchers.Main) {
            while (isActive) {
                mediaController?.let { controller ->
                    if (controller.isPlaying) {
                        val currentPosSec = (controller.currentPosition / 1000f).coerceAtLeast(0f)
                        val durSec = (controller.duration / 1000).toInt().coerceAtLeast(1)
                        _state.update { state ->
                            // Avoid copying the track (and emitting) when only
                            // the position advanced: the duration overwrite
                            // runs only while it actually changes, so screens
                            // collecting the track don't recompose every tick.
                            val current = state.currentTrack
                            val updatedTrack =
                                if (current != null && current.durationSeconds != durSec) {
                                    current.copy(durationSeconds = durSec)
                                } else {
                                    current
                                }
                            if (updatedTrack === current && state.progressSeconds == currentPosSec) {
                                state
                            } else {
                                state.copy(
                                    currentTrack = updatedTrack,
                                    progressSeconds = currentPosSec,
                                )
                            }
                        }

                        tickerTickCount++
                        if (tickerTickCount % 10 == 0) {
                            persistCurrentPosition(controller.currentPosition)
                        }
                        maybePrefetchNext()
                    }
                }
                delay(500L)
            }
        }
    }

    private fun stopProgressTicker() {
        progressTickerJob?.cancel()
        progressTickerJob = null
    }

    /**
     * M27.6 seamless experience: once the current track enters its final
     * 30 seconds, resolve the next queue item's playback source in the
     * background so it is already cached when the Media3 boundary hits.
     * Runs at most once per track pair; never touches the player, the
     * queue, or the UI — purely a cache warm-up. Playback never waits.
     */
    private fun maybePrefetchNext() {
        val snapshot = _state.value
        val current = snapshot.currentTrack ?: return
        val next = snapshot.queue.getOrNull(snapshot.currentQueueIndex + 1) ?: return
        if (!shouldPrefetchNext(
                durationSeconds = current.durationSeconds,
                progressSeconds = snapshot.progressSeconds,
                hasNext = true,
            )
        ) {
            return
        }
        val key = "${current.id}->${next.id}"
        if (prefetchNextForKey == key) return
        prefetchNextForKey = key
        scope.launch(Dispatchers.IO) {
            val preStart = System.currentTimeMillis()
            val source = cachedSourceFor(next)
            Log.d(TAG, "[Prefetch] next=${next.id} playable=${source.isPlayable} " +
                "durationMs=${System.currentTimeMillis() - preStart}")
        }
    }

    /**
     * Fast path: start playback for a single track immediately without full playlist sync.
     * Used for single-track autoplay contexts where we want instant playback start.
     */
    private fun playSingleTrackFast(track: MediaTrack, token: Long, source: PlaybackSource) {
        val controller = mediaController ?: return
        try {
            val item = createMediaItemFromSource(track, source)
            item?.let { mediaItem ->
                controller.setMediaItems(listOf(mediaItem), 0, 0L)
                controller.prepare()
                controller.play()
                syncedPlayableIds = listOf(track.id)
                syncedPlayableIndices = listOf(0)
                Log.d(TAG, "[FastPath] Single track playback started for ${track.id}")
            }
        } catch (e: Exception) {
            Log.w(TAG, "[FastPath] Failed to start single track, falling back to full sync", e)
            // Fall back to full sync
            playQueueOnExoPlayer(listOf(track), 0)
        }
    }

    /**
     * Stop-first (M28b): an explicit new selection halts the current track
     * immediately instead of overlapping it while the next source resolves
     * over the network. The player listener confirms the pause (stops the
     * ticker, persists position). Skip next/previous stay gapless via
     * Media3 transitions and are untouched, as are queue appends.
     */
    private fun stopCurrentForSwitch() {
        try {
            mediaController?.pause()
        } catch (_: Exception) {
        }
    }

    /**
     * Plays a single track. For single-track contexts (Home / Search /
     * Library / card taps), an autoplay queue is automatically generated
     * and appended after the track, providing continuous listening without
     * requiring the user to assemble a queue manually. If the autoplay
     * fetch fails or returns nothing, playback still works with just the
     * selected track.
     *
     * [isExplicitQueue] is set to false so future calls to playQueue() can
     * upgrade it to an intentional queue.
     */
    fun playTrack(track: MediaTrack) {
        Log.d(TAG, "[PlaybackManager] playTrack called: ${track.id} ${track.title}")
        // Stop the current song first: the next source may take seconds
        // to resolve, and the old track must not keep playing under it.
        stopCurrentForSwitch()
        // Single-track tap: always start fresh with just this track, then
        // append autoplay. Discard any previous autoplay-generated queue.
        isExplicitQueue = false
        autoplayJob?.cancel()

        val isLiked = libraryRepository?.isTrackLiked(track.id) ?: false
        val singleQueue = listOf(track)
        val targetIndex = 0

        val token = ++activePlaybackToken
        val playTrackEntryMs = System.currentTimeMillis()
        prefetchNextForKey = null
        recoveredTracks.remove(track.id)
        _state.update {
            it.copy(
                currentTrack = track,
                queue = singleQueue,
                currentQueueIndex = targetIndex,
                isFavorite = isLiked,
                isLoading = true,
                progressSeconds = 0f,
                playbackError = null,
            )
        }

        // M27.4 playback verification
        Log.d(TAG, "[PLAYBACK_VERIFY] requestedTrack=${track.id} " +
            "currentTrack=${track.id} queueIndex=$targetIndex queueSize=${singleQueue.size} " +
            "media3Index=pending media3Size=pending " +
            "playWhenReady=false playbackState=LOADING")

        // M27.6: kick off continuation fetch IMMEDIATELY in parallel —
        // the fetch runs while the current track source resolves, so Up
        // Next metadata is ready without delaying playback start.
        scheduleAutoplayFor(track, token)

        // CRITICAL: Resolve source for current track FIRST, then start playback immediately.
        // Continuation fetch runs in parallel in background.
        activePlaybackJob?.cancel()
        recoveryJob?.cancel()
        activePlaybackJob = scope.launch {
            val resolveStart = System.currentTimeMillis()
            val source = cachedSourceFor(track)
            val resolveMs = System.currentTimeMillis() - resolveStart
            Log.d(TAG, "[SOURCE_RESOLUTION] track=${track.id} durationMs=$resolveMs playable=${source.isPlayable}")
            if (isSyncStale(token, activePlaybackToken)) return@launch
            val isPlayable = source.isPlayable

            _state.update {
                it.copy(
                    isPlaying = isPlayable,
                    isLoading = false,
                    progressSeconds = 0f,
                    playbackError = if (isPlayable) null else "Streaming not available",
                )
            }

            if (isPlayable) {
                // M27.5: Fast path - start playback immediately without full playlist sync
                val media3Start = System.currentTimeMillis()
                playSingleTrackFast(track, token, source)
                Log.d(TAG, "[MEDIA3] setMediaItem+prepare+play durationMs=${System.currentTimeMillis() - media3Start} track=${track.id}")
                Log.d(TAG, "[PLAYBACK_LATENCY] tapToPlayMs~${System.currentTimeMillis() - playTrackEntryMs} track=${track.id} (from playTrack entry to Media3 play call)")
                recordPlaybackIfPlayable(track)

                // M28: Prefetch next track's source immediately after playback starts,
                // so skip-next is instant. Runs in background, non-blocking.
                if (token == activePlaybackToken) {
                    scope.launch(Dispatchers.IO) {
                        val stateSnapshot = state.value
                        if (stateSnapshot.currentQueueIndex < stateSnapshot.queue.size - 1) {
                            val nextTrack = stateSnapshot.queue[stateSnapshot.currentQueueIndex + 1]
                            if (nextTrack != null && !sourceCache.containsKey(nextTrack.id)) {
                                Log.d(TAG, "[PREFETCH] warming next track ${nextTrack.id}")
                                cachedSourceFor(nextTrack)
                            }
                        }
                    }
                }
            } else {
                pauseExoPlayer()
                Toast.makeText(applicationContext, "Streaming not available for this track yet", Toast.LENGTH_SHORT).show()
            }
            persistCurrentSession()
        }
    }

    /**
     * Seed-artist search pool (M28d): same-voice candidates for thin pools
     * and thin backend lists. Best-effort, capped, never throws except on
     * genuine cancellation.
     */
    private suspend fun searchArtistPool(artist: String, excludeId: String): List<MediaTrack> {
        if (artist.isBlank()) return emptyList()
        return try {
            when (val result = musicRepository.getSearchResults(artist)) {
                is com.gresseymusic.wave.data.repository.CatalogResult.Success ->
                    result.data.filter { it.id.isNotBlank() && it.id != excludeId }.take(10)
                else -> emptyList()
            }
        } catch (e: kotlinx.coroutines.CancellationException) {
            throw e
        } catch (e: Exception) {
            Log.d(PlaybackManager.TAG, "[Autoplay] Artist pool fetch failed: ${e.message}")
            emptyList()
        }
    }

    /**
     * Generates and appends an autoplay queue after [currentTrack] in the
     * background. Cancels silently if [token] becomes stale (user already
     * navigated to a different track).
     *
     * Source priority (M27.1): the YouTube Music watch-continuation queue
     * from the backend first (real similar/up-next metadata); the local
     * [AutoplayEngine] only as a fallback. Never injects mock/test tracks.
     * Explicit queues are preserved: this method only runs for single-track
     * contexts and returns early once [isExplicitQueue] is set.
     */
    private fun scheduleAutoplayFor(currentTrack: MediaTrack, token: Long) {
        Log.d(PlaybackManager.TAG, "[PlaybackManager] scheduleAutoplayFor called for ${currentTrack.id} token=$token")
        autoplayJob?.cancel()
        autoplayJob = scope.launch(kotlinx.coroutines.Dispatchers.IO) {
            try {
                Log.d(PlaybackManager.TAG, "[Autoplay] Schedule start for '${currentTrack.id}' token=$token active=${activePlaybackToken} explicit=$isExplicitQueue")
                if (isSyncStale(token, activePlaybackToken)) {
                    Log.d(PlaybackManager.TAG, "[Autoplay] Aborted before fetch: stale token=$token active=${activePlaybackToken}")
                    return@launch
                }

                // Snapshot library signals once (thread-safe StateFlow reads)
                // for both paths: vibe language context for the backend
                // continuation, and the full signal set for the local
                // fallback engine below.
                val recentlyPlayed = libraryRepository?.recentlyPlayed?.value ?: emptyList()
                val likedTracks = libraryRepository?.likedTracks?.value ?: emptyList()
                val savedArtists = libraryRepository?.savedArtists?.value ?: emptyList()
                val userPlaylists = libraryRepository?.userPlaylists?.value ?: emptyList()
                val libraryTracks = recentlyPlayed + likedTracks + userPlaylists.flatMap { it.tracks }

                // Parallel fetch (M28d): backend continuation + seed-artist
                // search pool. The artist pool rescues thin/generic backend
                // lists (same voice near the top) and enriches the local
                // fallback; fetching up front costs no extra latency.
                // Best-effort and non-blocking: failures yield empty lists
                // and fall through to the local engine below.
                val watchDeferred = async {
                    if (com.gresseymusic.wave.data.recommendation.ContinuationQueueLogic
                            .shouldFetchContinuation(isExplicitQueue)
                    ) {
                        musicRepository.getWatchContinuation(
                            currentTrack.id,
                            com.gresseymusic.wave.data.recommendation.ContinuationQueueLogic.CONTINUATION_LIMIT,
                        )
                    } else {
                        emptyList()
                    }
                }
                val artistDeferred = async {
                    if (!isExplicitQueue && currentTrack.artist.isNotBlank()) {
                        searchArtistPool(currentTrack.artist, currentTrack.id)
                    } else {
                        emptyList()
                    }
                }
                val watchTracks = try {
                    watchDeferred.await()
                } catch (e: kotlinx.coroutines.CancellationException) {
                    artistDeferred.cancel()
                    throw e
                } catch (e: Exception) {
                    Log.d(PlaybackManager.TAG, "[Autoplay] Watch continuation failed, using local engine: ${e.message}")
                    emptyList()
                }

                if (isSyncStale(token, activePlaybackToken)) {
                    Log.d(PlaybackManager.TAG, "[Autoplay] Aborted after fetch: stale token=$token active=${activePlaybackToken}")
                    artistDeferred.cancel()
                    return@launch
                }

                val artistPool = try {
                    artistDeferred.await()
                } catch (e: kotlinx.coroutines.CancellationException) {
                    throw e
                } catch (e: Exception) {
                    Log.d(PlaybackManager.TAG, "[Autoplay] Artist pool fetch failed: ${e.message}")
                    emptyList()
                }

                if (isSyncStale(token, activePlaybackToken)) {
                    return@launch
                }

Log.d(PlaybackManager.TAG, "[Autoplay] Watch fetch returned ${watchTracks.size} tracks, artist pool ${artistPool.size} for '${currentTrack.id}'")

                // M28c generic-response guard: a continuation with zero vibe
                // matches for a determinable-language seed means the backend
                // returned the same trending list for every song — discard
                // it and build locally instead.
                val useContinuation = watchTracks.isNotEmpty() &&
                    com.gresseymusic.wave.data.recommendation.VibeMatch.shouldUseContinuation(
                        seed = currentTrack,
                        watchTracks = watchTracks,
                        libraryTracks = libraryTracks,
                    )
                if (watchTracks.isNotEmpty() && !useContinuation) {
                    Log.d(PlaybackManager.TAG, "[Autoplay] Discarding generic continuation (0 vibe matches for '${currentTrack.id}'), local engine next")
                }

                val autoplayTracks = if (useContinuation) {
                    com.gresseymusic.wave.data.recommendation.ContinuationQueueLogic.buildContinuationQueue(
                        currentTrackId = currentTrack.id,
                        watchTracks = watchTracks,
                        seed = currentTrack,
                        libraryTracks = libraryTracks,
                        artistPool = artistPool,
                    )
                } else {
                    // Fallback: local similarity heuristics over real
                    // catalog and library signals (snapshotted above) plus
                    // the prefetched seed-artist pool.
                    val catalogSections = when (val result = musicRepository.getHomeCatalog()) {
                        is com.gresseymusic.wave.data.repository.CatalogResult.Success -> result.data
                        else -> emptyList()
                    }

                    if (isSyncStale(token, activePlaybackToken)) return@launch

                    AutoplayEngine.generateAutoplayQueue(
                        currentTrack = currentTrack,
                        recentlyPlayed = recentlyPlayed,
                        likedTracks = likedTracks,
                        savedArtists = savedArtists,
                        userPlaylists = userPlaylists,
                        catalogSections = catalogSections,
                        searchPool = artistPool,
                        limit = AutoplayEngine.DEFAULT_LIMIT,
                    )
                }

                if (autoplayTracks.isEmpty() || isSyncStale(token, activePlaybackToken)) return@launch

                // M27.4 continuation verification logging
                val firstNext = autoplayTracks.firstOrNull()?.id ?: "none"
                val artworkPresent = autoplayTracks.take(3).map { it.artworkUrl?.isNotBlank() == true }
                Log.d(PlaybackManager.TAG, "[CONTINUATION_VERIFY] current=${currentTrack.id} returnedCount=${autoplayTracks.size} " +
                    "queueSize=${_state.value.queue.size + autoplayTracks.size} " +
                    "firstNext=$firstNext artworkPresent=$artworkPresent")
                // Debug: log first 3 track artwork URLs
                autoplayTracks.take(3).forEachIndexed { idx, t ->
                    Log.d(PlaybackManager.TAG, "[CONTINUATION_ARTWORK] idx=$idx id=${t.id} title=${t.title} artworkUrl=${t.artworkUrl}")
                }

                // Append autoplay tracks to the queue only if the user is
                // still on the single-track autoplay context (not an album/
                // playlist/explicit queue they navigated to since).
                //
                // M27.2: source resolution runs here on IO (never on Main —
                // uncached tracks need network extraction), while only the
                // state publish + controller mutation run on Main. The Up
                // Next list therefore appears immediately from metadata while
                // each item joins the playable ExoPlayer queue as it
                // resolves; unresolvable items stay visible but are skipped
                // at transition time by the media-id mapping.
                // M27.6: publish metadata FIRST so Up Next appears instantly
                // (title/artist/duration-or-fallback), then resolve sources in
                // small background batches. Playback never waits for this.
                if (isSyncStale(token, activePlaybackToken)) return@launch
                if (isExplicitQueue) return@launch  // user switched to explicit queue

                val existingIds = _state.value.queue.map { it.id }.toSet()
                val newAutoplay = autoplayTracks.filter { it.id !in existingIds }
                if (newAutoplay.isEmpty() || isSyncStale(token, activePlaybackToken)) return@launch

                withContext(kotlinx.coroutines.Dispatchers.Main) {
                    if (isSyncStale(token, activePlaybackToken)) return@withContext
                    if (isExplicitQueue) return@withContext  // re-check on Main
                    val existingQueue = _state.value.queue
                    val stillNew = newAutoplay.filter { fresh -> existingQueue.none { it.id == fresh.id } }
                    if (stillNew.isNotEmpty()) {
                        _state.update { it.copy(queue = existingQueue + stillNew) }
                        persistCurrentSession()
                        Log.d(PlaybackManager.TAG, "[Autoplay] Published ${stillNew.size} metadata tracks for '${currentTrack.title}' " +
                            "(queue=${existingQueue.size + stillNew.size})")
                    }
                }

                // M27.6: resolve sources + missing durations lazily in
                // background batches. Each batch appends playable items to
                // Media3 and patches durations from the detail endpoint.
                for (batch in newAutoplay.chunked(AUTOPLAY_BATCH_SIZE)) {
                    ensureActive()
                    if (isSyncStale(token, activePlaybackToken)) return@launch
                    if (isExplicitQueue) return@launch

                    val resolvedById = LinkedHashMap<String, MediaItem>()
                    val durationPatch = LinkedHashMap<String, MediaTrack>()
                    for (autoTrack in batch) {
                        ensureActive()
                        if (isSyncStale(token, activePlaybackToken)) return@launch
                        try {
                            var effectiveTrack = autoTrack
                            // M27.6 duration fix: watch metadata carries no
                            // usable duration — fetch details once (cached by
                            // repository layer where applicable), in the
                            // background batch, never blocking playback.
                            if (effectiveTrack.durationSeconds <= 1) {
                                try {
                                    musicRepository.getTrack(effectiveTrack.id)?.let { detailed ->
                                        if (detailed.durationSeconds > 1 ||
                                            !detailed.artworkUrl.isNullOrBlank()
                                        ) {
                                            effectiveTrack = effectiveTrack.copy(
                                                durationSeconds = detailed.durationSeconds
                                                    .takeIf { it > 1 }
                                                    ?: effectiveTrack.durationSeconds,
                                                artworkUrl = detailed.artworkUrl
                                                    ?: effectiveTrack.artworkUrl,
                                            )
                                        }
                                    }
                                } catch (e: kotlinx.coroutines.CancellationException) {
                                    throw e
                                } catch (e: Exception) {
                                    // Keep metadata fallback duration.
                                }
                            }
                            if (effectiveTrack != autoTrack) {
                                durationPatch[autoTrack.id] = effectiveTrack
                            }
                            val src = cachedSourceFor(effectiveTrack)
                            val item = createMediaItemFromSource(effectiveTrack, src)
                            if (item != null) resolvedById[autoTrack.id] = item
                        } catch (e: kotlinx.coroutines.CancellationException) {
                            throw e
                        } catch (e: Exception) {
                            Log.d(PlaybackManager.TAG, "[Autoplay] Skipping unresolvable track '${autoTrack.title}': ${e.message}")
                        }
                    }

                    withContext(kotlinx.coroutines.Dispatchers.Main) {
                        if (isSyncStale(token, activePlaybackToken)) return@withContext
                        if (isExplicitQueue) return@withContext
                        // Patch durations/artwork-urls without reordering.
                        if (durationPatch.isNotEmpty()) {
                            _state.update { st ->
                                st.copy(
                                    queue = st.queue.map { q ->
                                        durationPatch[q.id]?.let { patched ->
                                            q.copy(
                                                durationSeconds = patched.durationSeconds,
                                                artworkUrl = patched.artworkUrl,
                                            )
                                        } ?: q
                                    },
                                )
                            }
                        }
                        val controller = mediaController
                        val playableNow = batch.mapNotNull { t -> resolvedById[t.id] }
                        if (controller != null && playableNow.isNotEmpty()) {
                            try {
                                if (!isSyncStale(token, activePlaybackToken)) {
                                    for (item in playableNow) {
                                        controller.addMediaItem(item)
                                    }
                                    syncedPlayableIds = syncedPlayableIds + playableNow.map { it.mediaId }
                                }
                            } catch (e: Exception) {
                                Log.d(PlaybackManager.TAG, "[Autoplay] Append batch to ExoPlayer failed: ${e.message}")
                            }
                        }
                    }
                }

                withContext(kotlinx.coroutines.Dispatchers.Main) {
                    if (isSyncStale(token, activePlaybackToken)) return@withContext
                    val controller = mediaController
                    persistCurrentSession()
                    Log.d(PlaybackManager.TAG, "[Autoplay] Generated ${newAutoplay.size} tracks for '${currentTrack.title}' by '${currentTrack.artist}' " +
                        "(queue=${_state.value.queue.size}, controller=${controller?.mediaItemCount ?: -1})")
                }
            } catch (e: kotlinx.coroutines.CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.d(PlaybackManager.TAG, "[Autoplay] Recommendation fetch failed: ${e.message}")
            }
        }
}

        fun playQueue(queue: List<MediaTrack>, startIndex: Int = 0) {
        if (queue.isEmpty()) return
        // Stop-first: same contract as single-track taps.
        stopCurrentForSwitch()
        // This is an intentional multi-track context (album, playlist, etc.).
        // Mark as explicit so autoplay does not append over it.
        isExplicitQueue = true
        autoplayJob?.cancel()
        val validIndex = startIndex.coerceIn(0, queue.lastIndex)
        val selectedTrack = queue[validIndex]
        val isLiked = libraryRepository?.isTrackLiked(selectedTrack.id) ?: false

        val token = ++activePlaybackToken
        prefetchNextForKey = null
        recoveredTracks.remove(selectedTrack.id)
        _state.update {
            it.copy(
                queue = queue,
                currentQueueIndex = validIndex,
                currentTrack = selectedTrack,
                isFavorite = isLiked,
                isLoading = true,
                progressSeconds = 0f,
                playbackError = null,
            )
        }

        // M27.4 playback verification
        Log.d(TAG, "[PLAYBACK_VERIFY] requestedTrack=${selectedTrack.id} " +
            "currentTrack=${selectedTrack.id} queueIndex=$validIndex queueSize=${queue.size} " +
            "media3Index=pending media3Size=pending " +
            "playWhenReady=false playbackState=LOADING")

        activePlaybackJob?.cancel()
        recoveryJob?.cancel()
        activePlaybackJob = scope.launch {
            val source = cachedSourceFor(selectedTrack)
            if (isSyncStale(token, activePlaybackToken)) return@launch
            val isPlayable = source.isPlayable

            _state.update {
                it.copy(
                    isPlaying = isPlayable,
                    isLoading = false,
                    progressSeconds = 0f,
                    playbackError = if (isPlayable) null else "Streaming not available",
                )
            }

            if (isPlayable) {
                playQueueOnExoPlayer(queue, validIndex)
                recordPlaybackIfPlayable(selectedTrack)

                // M28: Prefetch next track's source for instant skip-next.
                if (token == activePlaybackToken && validIndex < queue.size - 1) {
                    scope.launch(Dispatchers.IO) {
                        val nextTrack = queue[validIndex + 1]
                        if (!sourceCache.containsKey(nextTrack.id)) {
                            Log.d(TAG, "[PREFETCH] warming next track ${nextTrack.id}")
                            cachedSourceFor(nextTrack)
                        }
                    }
                }
            } else {
                pauseExoPlayer()
                Toast.makeText(applicationContext, "Streaming not available for this track yet", Toast.LENGTH_SHORT).show()
            }
            persistCurrentSession()
        }
    }

    private fun playQueueOnExoPlayer(
        queue: List<MediaTrack>,
        startIndex: Int,
        startPositionMs: Long = 0L,
    ) {
        val controller = mediaController ?: return
        // M27.3 diagnostic (verbose): identify which path rebuilds the
        // Media3 playlist. Coroutine lambdas compile to PlaybackManager$*
        // classes, hence the contains() match.
        val callerFrame = Thread.currentThread().stackTrace.firstOrNull {
            it.className.contains("PlaybackManager") &&
                !it.methodName.startsWith("playQueueOnExoPlayer") &&
                !it.methodName.startsWith("access$")
        }
        Log.v(TAG, "[Sync] playQueueOnExoPlayer from=${callerFrame?.methodName}:${callerFrame?.lineNumber} " +
            "queue=${queue.size} startIndex=$startIndex token=$activePlaybackToken")
        // Full playlist sync. Newer syncs obsolete older ones: the token is
        // captured here and re-checked after the (possibly slow) source
        // resolution and again on the Main thread before touching the player,
        // so a stale sync can never overwrite a newer selection.
        // Source resolution runs on IO; only the MediaController calls below
        // run on Main, as Media3 requires.
        val token = activePlaybackToken
        playlistSyncJob?.cancel()
        playlistSyncJob = scope.launch(Dispatchers.IO) {
            try {
                val validMediaItems = mutableListOf<MediaItem>()
                val playableIds = mutableListOf<String>()
                val playableIndices = mutableListOf<Int>()
                var playableTargetIndex = 0

                for ((i, track) in queue.withIndex()) {
                    ensureActive()
                    val source = cachedSourceFor(track)
                    val item = createMediaItemFromSource(track, source)
                    if (item != null) {
                        if (i == startIndex) {
                            playableTargetIndex = validMediaItems.size
                        }
                        validMediaItems.add(item)
                        playableIds.add(track.id)
                        playableIndices.add(i)
                    }
                }

                if (isSyncStale(token, activePlaybackToken)) return@launch
                withContext(Dispatchers.Main) {
                    if (isSyncStale(token, activePlaybackToken)) return@withContext
                    val currentController = mediaController ?: return@withContext
                    try {
                        if (validMediaItems.isNotEmpty()) {
                            val clampedIndex = playableTargetIndex.coerceIn(0, validMediaItems.lastIndex)
                            val validStartPos = startPositionMs.coerceAtLeast(0L)
                            currentController.setMediaItems(validMediaItems, clampedIndex, validStartPos)
                            currentController.prepare()
                            currentController.play()
                        } else {
                            currentController.pause()
                        }
                        syncedPlayableIds = playableIds
                        syncedPlayableIndices = playableIndices
                    } catch (e: CancellationException) {
                        throw e
                    } catch (e: Exception) {
                        Log.w(TAG, "Playlist sync failed", e)
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.w(TAG, "Playlist sync failed", e)
            }
        }
    }

    private fun createMediaItemFromSource(track: MediaTrack, source: PlaybackSource): MediaItem? {
        val metadataBuilder = MediaMetadata.Builder()
            .setTitle(track.title)
            .setArtist(track.artist)
            .setAlbumTitle(track.album)
        if (!track.artworkUrl.isNullOrBlank()) {
            try {
                metadataBuilder.setArtworkUri(android.net.Uri.parse(track.artworkUrl))
            } catch (e: Exception) {
                // Ignore malformed uri, artwork will fall back to default
            }
        }
        val metadata = metadataBuilder.build()

        return when (source) {
            is PlaybackSource.LocalUri -> {
                MediaItem.Builder()
                    .setMediaId(track.id)
                    .setUri(source.uri)
                    .setMediaMetadata(metadata)
                    .build()
            }
            is PlaybackSource.RemoteUri -> {
                val builder = MediaItem.Builder()
                    .setMediaId(track.id)
                    .setUri(source.uri)
                    .setMediaMetadata(metadata)
                if (!source.mimeType.isNullOrBlank()) {
                    builder.setMimeType(source.mimeType)
                }
                builder.build()
            }
            is PlaybackSource.Unavailable -> null
        }
    }

    private fun pauseExoPlayer() {
        val controller = mediaController ?: return
        try {
            if (controller.isPlaying) {
                controller.pause()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun togglePlayPause() {
        // Optimistic UI flip first — the player listener confirms the truth.
        // Previously this awaited a (possibly network) source resolution
        // before touching the player, which made pause feel laggy.
        _state.update { it.copy(isPlaying = !it.isPlaying) }
        scope.launch {
            val currentTrack = _state.value.currentTrack
            if (!cachedSourceFor(currentTrack).isPlayable) {
                _state.update { it.copy(isPlaying = false) }
                Toast.makeText(applicationContext, "Streaming not available for this track yet", Toast.LENGTH_SHORT).show()
                return@launch
            }

            val controller = mediaController
            if (controller != null) {
                try {
                    if (controller.isPlaying) {
                        controller.pause()
                    } else {
                        if ((controller.playbackState == Player.STATE_ENDED) || (controller.mediaItemCount == 0)) {
                            playQueueOnExoPlayer(_state.value.queue, _state.value.currentQueueIndex)
                        } else {
                            controller.play()
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
            persistCurrentSession()
        }
    }

    fun toggleFavorite() {
        val currentTrack = _state.value.currentTrack ?: return
        scope.launch {
            if (libraryRepository != null) {
                val nowLiked = libraryRepository.toggleTrackLiked(currentTrack)
                _state.update { it.copy(isFavorite = nowLiked) }
            } else {
                _state.update { it.copy(isFavorite = !_state.value.isFavorite) }
            }
        }
    }

    fun toggleShuffle() {
        val newShuffle = !_state.value.shuffleEnabled
        _state.update { it.copy(shuffleEnabled = newShuffle) }
        mediaController?.let { controller ->
            controller.shuffleModeEnabled = newShuffle
        }
        persistCurrentSession()
    }

    fun cycleRepeatMode() {
        val newRepeat = nextRepeatMode(_state.value.repeatMode)
        _state.update { it.copy(repeatMode = newRepeat) }
        mediaController?.let { controller ->
            val media3RepeatMode = when (newRepeat) {
                1 -> Player.REPEAT_MODE_ALL
                2 -> Player.REPEAT_MODE_ONE
                else -> Player.REPEAT_MODE_OFF
            }
            controller.repeatMode = media3RepeatMode
        }
        persistCurrentSession()
    }

    /**
     * Audio flavor (M28): Normal (1.0x, dry) vs SnR (0.8x pitched down,
     * 50% reverb) vs Nightcore (1.2x pitched up, dry). State flips
     * instantly; the player application is best-effort and never throws —
     * speed + pitch via `setPlaybackParameters`, reverb via a PresetReverb
     * aux send for SnR only. Defaults to Normal on fresh installs.
     */
    fun setAudioMode(mode: AudioMode) {
        if (_state.value.audioMode == mode) {
            // Still re-apply: a reconnected controller may hold defaults.
            applyAudioModeToController()
            return
        }
        _state.update { it.copy(audioMode = mode) }
        Log.d(TAG, "[AudioMode] mode=$mode speed=${audioSpeed(mode)} pitch=${audioPitch(mode)} reverb=${audioReverbSend(mode)}")
        applyAudioModeToController()
    }

    private fun applyAudioModeToController() {
        val controller = mediaController
        val mode = _state.value.audioMode
        if (controller != null) {
            try {
                controller.setPlaybackParameters(
                    PlaybackParameters(audioSpeed(mode), audioPitch(mode)),
                )
            } catch (e: Exception) {
                Log.w(TAG, "[AudioMode] speed/pitch apply failed", e)
            }
        }
        // Reverb DSP lives in the service (owns the ExoPlayer); the state
        // flag here is always exact even if the device ignores aux routing.
        try {
            AudioPlaybackService.setAudioMode(mode)
        } catch (e: Exception) {
            Log.w(TAG, "[AudioMode] reverb delegate failed", e)
        }
    }

    fun seekTo(positionSeconds: Float) {
        val currentTrack = _state.value.currentTrack
        val positionMillis = (positionSeconds * 1000).toLong()
        // Instant UI feedback; the ticker converges to the true position
        // once the player completes the seek.
        _state.update { it.copy(progressSeconds = positionSeconds) }
        scope.launch {
            if (!cachedSourceFor(currentTrack).isPlayable) return@launch

            try {
                mediaController?.seekTo(positionMillis)
            } catch (e: Exception) {
                e.printStackTrace()
            }
            persistCurrentPosition(positionMillis)
        }
    }

    fun skipToNext() {
        val skipCaller = Thread.currentThread().stackTrace.firstOrNull {
            it.className.contains("PlaybackManager") &&
                !it.methodName.startsWith("skipToNext") &&
                !it.methodName.startsWith("access$")
        }
        Log.v(TAG, "[Skip] skipToNext invoked by=${skipCaller?.methodName}:${skipCaller?.lineNumber} " +
            "hasNext=${mediaController?.hasNextMediaItem()}")
        val controller = mediaController
        if (controller != null && controller.hasNextMediaItem()) {
            activePlaybackToken++
            controller.seekToNextMediaItem()
        } else {
            val currentState = _state.value
            if (currentState.queue.isNotEmpty()) {
                val nextIndex = (currentState.currentQueueIndex + 1) % currentState.queue.size
                val nextTrack = currentState.queue[nextIndex]
                val token = ++activePlaybackToken
                prefetchNextForKey = null
                recoveredTracks.remove(nextTrack.id)
                val isLiked = libraryRepository?.isTrackLiked(nextTrack.id) ?: false

                _state.update {
                    it.copy(
                        currentQueueIndex = nextIndex,
                        currentTrack = nextTrack,
                        isFavorite = isLiked,
                        isLoading = true,
                        progressSeconds = 0f,
                        playbackError = null,
                    )
                }
                if (nextTrack.artworkUrl.isNullOrBlank() || nextTrack.durationSeconds <= 1) {
                    refreshCurrentTrackDetails(nextTrack.id, token)
                }

                activePlaybackJob?.cancel()
                activePlaybackJob = scope.launch {
                    val source = cachedSourceFor(nextTrack)
                    if (isSyncStale(token, activePlaybackToken)) return@launch
                    val isPlayable = source.isPlayable

                    _state.update {
                        it.copy(
                            isPlaying = isPlayable,
                            isLoading = false,
                            progressSeconds = 0f,
                            playbackError = if (isPlayable) null else "Streaming not available",
                        )
                    }
                    if (isPlayable) {
                        playQueueOnExoPlayer(currentState.queue, nextIndex)
                        recordPlaybackIfPlayable(nextTrack)

                        // M28: Prefetch the track after next for instant double-skip.
                        if (token == activePlaybackToken && nextIndex < currentState.queue.size - 1) {
                            scope.launch(Dispatchers.IO) {
                                val nextNextTrack = currentState.queue[nextIndex + 1]
                                if (!sourceCache.containsKey(nextNextTrack.id)) {
                                    Log.d(TAG, "[PREFETCH] warming next-next track ${nextNextTrack.id}")
                                    cachedSourceFor(nextNextTrack)
                                }
                            }
                        }
                    } else {
                        pauseExoPlayer()
                    }
                }
            }
        }
        persistCurrentSession()
    }

    fun skipToPrevious() {
        val prevCaller = Thread.currentThread().stackTrace.firstOrNull {
            it.className.contains("PlaybackManager") &&
                !it.methodName.startsWith("skipToPrevious") &&
                !it.methodName.startsWith("access$")
        }
        Log.v(TAG, "[Skip] skipToPrevious invoked by=${prevCaller?.methodName}:${prevCaller?.lineNumber} " +
            "hasPrev=${mediaController?.hasPreviousMediaItem()}")
        val controller = mediaController
        if (controller != null && controller.hasPreviousMediaItem()) {
            activePlaybackToken++
            controller.seekToPreviousMediaItem()
        } else {
            val currentState = _state.value
            if (currentState.queue.isNotEmpty()) {
                val prevIndex = if (currentState.currentQueueIndex - 1 < 0) {
                    currentState.queue.lastIndex
                } else {
                    currentState.currentQueueIndex - 1
                }
                val prevTrack = currentState.queue[prevIndex]
                val token = ++activePlaybackToken
                prefetchNextForKey = null
                recoveredTracks.remove(prevTrack.id)
                val isLiked = libraryRepository?.isTrackLiked(prevTrack.id) ?: false

                _state.update {
                    it.copy(
                        currentQueueIndex = prevIndex,
                        currentTrack = prevTrack,
                        isFavorite = isLiked,
                        isLoading = true,
                        progressSeconds = 0f,
                        playbackError = null,
                    )
                }
                if (prevTrack.artworkUrl.isNullOrBlank() || prevTrack.durationSeconds <= 1) {
                    refreshCurrentTrackDetails(prevTrack.id, token)
                }

                activePlaybackJob?.cancel()
                activePlaybackJob = scope.launch {
                    val source = cachedSourceFor(prevTrack)
                    if (isSyncStale(token, activePlaybackToken)) return@launch
                    val isPlayable = source.isPlayable

                    _state.update {
                        it.copy(
                            isPlaying = isPlayable,
                            isLoading = false,
                            progressSeconds = 0f,
                            playbackError = if (isPlayable) null else "Streaming not available",
                        )
                    }
                    if (isPlayable) {
                        playQueueOnExoPlayer(currentState.queue, prevIndex)
                        recordPlaybackIfPlayable(prevTrack)
                    } else {
                        pauseExoPlayer()
                    }
                }
            }
        }
        persistCurrentSession()
    }

    fun playQueueItem(index: Int) {
        val currentQueue = _state.value.queue
        if (index !in currentQueue.indices) return
        // Stop-first: same contract as single-track taps.
        stopCurrentForSwitch()
        val targetTrack = currentQueue[index]
        val isLiked = libraryRepository?.isTrackLiked(targetTrack.id) ?: false

        val token = ++activePlaybackToken
        prefetchNextForKey = null
        recoveredTracks.remove(targetTrack.id)
        _state.update {
            it.copy(
                currentQueueIndex = index,
                currentTrack = targetTrack,
                isFavorite = isLiked,
                isLoading = true,
                progressSeconds = 0f,
                playbackError = null,
            )
        }
        // Queue-tap artwork guarantee: continuation/metadata tracks may
        // carry a blank artworkUrl at tap time. Enrich in the background
        // (playback never waits) so the mini player + Now Playing always
        // converge on the real thumbnail.
        if (targetTrack.artworkUrl.isNullOrBlank() || targetTrack.durationSeconds <= 1) {
            refreshCurrentTrackDetails(targetTrack.id, token)
        }

        activePlaybackJob?.cancel()
        recoveryJob?.cancel()
        activePlaybackJob = scope.launch {
            val source = cachedSourceFor(targetTrack)
            if (isSyncStale(token, activePlaybackToken)) return@launch
            val isPlayable = source.isPlayable

            _state.update {
                it.copy(
                    isPlaying = isPlayable,
                    isLoading = false,
                    progressSeconds = 0f,
                    playbackError = if (isPlayable) null else "Streaming not available",
                )
            }

            if (isPlayable) {
                playQueueOnExoPlayer(currentQueue, index)
                recordPlaybackIfPlayable(targetTrack)
            } else {
                pauseExoPlayer()
                Toast.makeText(applicationContext, "Streaming not available for this track yet", Toast.LENGTH_SHORT).show()
            }
            persistCurrentSession()
        }
    }

    /**
     * Controller media ids snapshot, or null without a usable controller.
     * Must be called on Main, like all MediaController reads.
     */
    private fun controllerMediaIdsOrNull(): List<String>? {
        val controller = mediaController ?: return null
        return try {
            List(controller.mediaItemCount) { i -> controller.getMediaItemAt(i).mediaId }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to snapshot controller playlist", e)
            null
        }
    }

    /**
     * Targeted player edits are only safe when shuffle is off (shuffle
     * reorders the player playlist independently of the app queue) and the
     * controller playlist still matches the last full sync exactly.
     * Callers fall back to a full rebuild otherwise — correctness first.
     */
    private fun canUseTargetedPlayerEdit(controllerIds: List<String>): Boolean {
        return !_state.value.shuffleEnabled && controllerIds == syncedPlayableIds
    }

    /**
     * Targeted removal of a non-playing track from the player playlist.
     * Returns false when a targeted edit is unsafe so the caller rebuilds.
     * Fully synchronous on the caller (Main) thread, so no interleaving with
     * other mutations is possible.
     */
    private fun removeTrackFromPlayer(removedQueueIndex: Int, preRemovalQueue: List<MediaTrack>): Boolean {
        val controller = mediaController ?: return true // nothing synced; state-only update suffices
        val controllerIds = controllerMediaIdsOrNull() ?: return false
        if (!canUseTargetedPlayerEdit(controllerIds)) return false
        val removedId = preRemovalQueue.getOrNull(removedQueueIndex)?.id ?: return false
        val playerIndex = playerIndexOfTrack(controllerIds, removedId)
        if (playerIndex == -1) return true // not in the player playlist (unplayable); nothing to do
        return try {
            controller.removeMediaItem(playerIndex)
            syncedPlayableIds = syncedPlayableIds.toMutableList().apply { removeAt(playerIndex) }
            true
        } catch (e: Exception) {
            Log.w(TAG, "Targeted queue remove failed, falling back to rebuild", e)
            false
        }
    }

    /**
     * Targeted move of a track within the player playlist. Same synchronous
     * safety contract as [removeTrackFromPlayer].
     */
    private fun moveTrackInPlayer(movedId: String, newQueue: List<MediaTrack>, toQueueIndex: Int): Boolean {
        val controller = mediaController ?: return true
        val controllerIds = controllerMediaIdsOrNull() ?: return false
        if (!canUseTargetedPlayerEdit(controllerIds)) return false
        val fromPlayer = playerIndexOfTrack(controllerIds, movedId)
        if (fromPlayer == -1) return true // not in the player playlist; nothing to do
        val toPlayer = playerIndexForQueuePos(newQueue.map { it.id }, controllerIds, toQueueIndex)
        if (toPlayer == -1) return false
        return try {
            controller.moveMediaItem(fromPlayer, toPlayer)
            syncedPlayableIds = syncedPlayableIds.toMutableList().apply { add(toPlayer, removeAt(fromPlayer)) }
            true
        } catch (e: Exception) {
            Log.w(TAG, "Targeted queue move failed, falling back to rebuild", e)
            false
        }
    }

    /**
     * Targeted removal of everything after the current track. Synchronous,
     * same safety contract as [removeTrackFromPlayer].
     */
    private fun clearUpNextInPlayer(currentTrackId: String?, currentQueueIndex: Int): Boolean {
        val controller = mediaController ?: return true
        val controllerIds = controllerMediaIdsOrNull() ?: return false
        if (!canUseTargetedPlayerEdit(controllerIds)) return false
        if (currentTrackId == null) return false
        val playerCurrent = playerIndexOfTrack(controllerIds, currentTrackId)
        if (playerCurrent == -1) return false
        return try {
            for (i in controllerIds.lastIndex downTo playerCurrent + 1) {
                controller.removeMediaItem(i)
            }
            syncedPlayableIds = syncedPlayableIds.take(playerCurrent + 1)
            true
        } catch (e: Exception) {
            Log.w(TAG, "Targeted clear-up-next failed, falling back to rebuild", e)
            false
        }
    }

    /**
     * Targeted insertion of a single newly added track into the player
     * playlist. Source resolution needs IO, so this is async: it applies only
     * if no newer queue mutation superseded it ([newQueue] instance check)
     * and the player still holds exactly the pre-insert content; otherwise
     * it falls back to a full rebuild, which always converges.
     */
    private fun insertTrackIntoPlayer(
        newQueue: List<MediaTrack>,
        track: MediaTrack,
        insertQueuePos: Int,
        fallbackQueueIndex: Int,
        fallbackPositionMs: Long,
    ) {
        val newQueueIds = newQueue.map { it.id }
        scope.launch(Dispatchers.IO) {
            val source = cachedSourceFor(track)
            val item = createMediaItemFromSource(track, source)
            withContext(Dispatchers.Main) {
                val controller = mediaController
                if (_state.value.queue !== newQueue || controller == null) {
                    // Superseded by a newer mutation (which owns player sync
                    // from here), or no controller to sync to.
                    return@withContext
                }
                val controllerIds = controllerMediaIdsOrNull()
                val expectedPreInsert = newQueueIds.toMutableList().apply {
                    if (insertQueuePos in indices) removeAt(insertQueuePos)
                }
                if (controllerIds != null &&
                    canUseTargetedPlayerEdit(controllerIds) &&
                    syncedPlayableIds == expectedPreInsert &&
                    item != null
                ) {
                    val pos = playerInsertIndexForQueuePos(newQueueIds, controllerIds, insertQueuePos)
                    if (pos != -1) {
                        try {
                            if (pos >= controllerIds.size) controller.addMediaItem(item)
                            else controller.addMediaItem(pos, item)
                            syncedPlayableIds = syncedPlayableIds.toMutableList().apply {
                                add(pos.coerceIn(0, size), track.id)
                            }
                            return@withContext
                        } catch (e: Exception) {
                            Log.w(TAG, "Targeted queue insert failed, falling back to rebuild", e)
                        }
                    }
                }
                playQueueOnExoPlayer(newQueue, fallbackQueueIndex, fallbackPositionMs)
            }
        }
    }

    fun removeFromQueue(index: Int) {
        val currentQueue = _state.value.queue
        if (index !in currentQueue.indices) return
        val currentIndex = _state.value.currentQueueIndex
        val newQueue = currentQueue.toMutableList().apply { removeAt(index) }

        if (newQueue.isEmpty()) {
            _state.update {
                it.copy(
                    queue = emptyList(),
                    currentQueueIndex = 0,
                    currentTrack = null,
                    isPlaying = false,
                    progressSeconds = 0f,
                )
            }
            pauseExoPlayer()
            mediaController?.clearMediaItems()
            syncedPlayableIds = emptyList()
            syncedPlayableIndices = emptyList()
            persistCurrentSession()
            return
        }

        val removePlan = planQueueRemove(currentQueue.size, index, currentIndex) ?: return
        val newIndex = removePlan.newIndex
        val trackChanged = removePlan.trackChanged
        val activeTrack = newQueue[newIndex]

        if (trackChanged) {
            val token = ++activePlaybackToken
            recoveredTracks.remove(activeTrack.id)
            activePlaybackJob?.cancel()
            recoveryJob?.cancel()
            activePlaybackJob = scope.launch {
                val source = cachedSourceFor(activeTrack)
                if (isSyncStale(token, activePlaybackToken)) return@launch
                val isPlayable = source.isPlayable
                val isLiked = libraryRepository?.isTrackLiked(activeTrack.id) ?: false

                _state.update {
                    it.copy(
                        queue = newQueue,
                        currentQueueIndex = newIndex,
                        currentTrack = activeTrack,
                        isFavorite = isLiked,
                        isPlaying = isPlayable,
                        progressSeconds = 0f,
                    )
                }
                if (isPlayable) {
                    playQueueOnExoPlayer(newQueue, newIndex)
                    recordPlaybackIfPlayable(activeTrack)
                } else {
                    pauseExoPlayer()
                }
                persistCurrentSession()
            }
        } else {
            val currentPos = mediaController?.currentPosition ?: (_state.value.progressSeconds * 1000).toLong()
            _state.update {
                it.copy(
                    queue = newQueue,
                    currentQueueIndex = newIndex,
                )
            }
            // Targeted removal preserves the playing track without restarting
            // audio; falls back to a full rebuild when unsafe.
            if (!removeTrackFromPlayer(index, currentQueue)) {
                playQueueOnExoPlayer(newQueue, newIndex, startPositionMs = currentPos)
            }
            persistCurrentSession()
        }
    }

    fun moveQueueItem(fromIndex: Int, toIndex: Int) {
        val currentQueue = _state.value.queue
        if (fromIndex !in currentQueue.indices || toIndex !in currentQueue.indices || fromIndex == toIndex) return

        val currentIndex = _state.value.currentQueueIndex
        val currentTrack = _state.value.currentTrack

        val newQueue = currentQueue.toMutableList()
        val item = newQueue.removeAt(fromIndex)
        newQueue.add(toIndex, item)

        val newCurrentIndex = resolveCurrentIndexAfterMove(
            newQueueIds = newQueue.map { it.id },
            currentTrackId = currentTrack?.id,
            fallbackIndex = currentIndex,
        )

        val currentPos = mediaController?.currentPosition ?: (_state.value.progressSeconds * 1000).toLong()
        _state.update {
            it.copy(
                queue = newQueue,
                currentQueueIndex = newCurrentIndex,
            )
        }
        if (!moveTrackInPlayer(item.id, newQueue, toIndex)) {
            playQueueOnExoPlayer(newQueue, newCurrentIndex, startPositionMs = currentPos)
        }
        persistCurrentSession()
    }

    fun playNext(track: MediaTrack) {
        val currentQueue = _state.value.queue
        if (currentQueue.isEmpty()) {
            playTrack(track)
            return
        }

        val currentIndex = _state.value.currentQueueIndex
        val playNextPlan = planPlayNext(currentQueue, MediaTrack::id, currentIndex, track)
        val newQueue = playNextPlan.queue
        val insertPos = playNextPlan.insertPos
        val adjustedCurrentIndex = playNextPlan.currentIndex

        val currentPos = mediaController?.currentPosition ?: (_state.value.progressSeconds * 1000).toLong()
        _state.update {
            it.copy(
                queue = newQueue,
                currentQueueIndex = adjustedCurrentIndex,
            )
        }
        insertTrackIntoPlayer(newQueue, track, insertPos, adjustedCurrentIndex, currentPos)
        persistCurrentSession()
        Toast.makeText(applicationContext, "Playing next: ${track.title}", Toast.LENGTH_SHORT).show()
    }

    fun addToQueue(track: MediaTrack) {
        val currentQueue = _state.value.queue
        if (currentQueue.isEmpty()) {
            playTrack(track)
            return
        }

        val currentIndex = _state.value.currentQueueIndex
        val newQueue = currentQueue + track
        val currentPos = mediaController?.currentPosition ?: (_state.value.progressSeconds * 1000).toLong()

        _state.update {
            it.copy(queue = newQueue)
        }
        insertTrackIntoPlayer(newQueue, track, newQueue.lastIndex, currentIndex, currentPos)
        persistCurrentSession()
        Toast.makeText(applicationContext, "Added to queue: ${track.title}", Toast.LENGTH_SHORT).show()
    }

    /**
     * Stops playback completely: halts the player, clears the playlist and
     * the current track so the Mini Player dismisses. Favorites, recents
     * and playlists are untouched. Used by the mini-player swipe-to-stop
     * gesture.
     */
    fun stopPlaybackCompletely() {
        Log.d(TAG, "[PlaybackManager] stopPlaybackCompletely")
        // Invalidate any in-flight resolve/sync/autoplay work.
        activePlaybackToken++
        activePlaybackJob?.cancel()
        autoplayJob?.cancel()
        recoveryJob?.cancel()
        prefetchNextForKey = null
        _state.update {
            it.copy(
                currentTrack = null,
                isPlaying = false,
                isLoading = false,
                isFavorite = false,
                progressSeconds = 0f,
                queue = emptyList(),
                currentQueueIndex = 0,
                playbackError = null,
            )
        }
        try {
            mediaController?.let { controller ->
                if (controller.isPlaying) controller.pause()
                controller.stop()
                controller.clearMediaItems()
            }
        } catch (e: Exception) {
            Log.w(TAG, "[PlaybackManager] stop playback failed", e)
        }
        syncedPlayableIds = emptyList()
        syncedPlayableIndices = emptyList()
        persistCurrentSession()
    }

    /**
     * Speculatively warms stream sources for soon-tappable tracks so taps
     * start instantly from cache. Bounded, sequential, skips anything
     * already cached; failures are swallowed (normal resolve covers taps).
     */
    fun prefetchTrackSources(tracks: List<MediaTrack>, limit: Int = 4) {
        val candidates = tracks
            .filter { it.id.isNotBlank() && !sourceCache.containsKey(it.id) }
            .take(limit.coerceAtLeast(0))
        if (candidates.isEmpty()) return
        scope.launch(Dispatchers.IO) {
            for (track in candidates) {
                if (!isActive) return@launch
                try {
                    cachedSourceFor(track)
                } catch (_: Exception) {
                    // Swallowed: tap-time resolution remains the fallback.
                }
            }
        }
    }

    fun clearUpNext() {
        val currentQueue = _state.value.queue
        val currentIndex = _state.value.currentQueueIndex
        if (!shouldClearUpNext(currentQueue.size, currentIndex)) return

        // Retain tracks up to and including the current playing track
        val newQueue = currentQueue.subList(0, currentIndex + 1)
        val currentTrackId = currentQueue.getOrNull(currentIndex)?.id
        val currentPos = mediaController?.currentPosition ?: (_state.value.progressSeconds * 1000).toLong()

        _state.update {
            it.copy(queue = newQueue)
        }
        if (!clearUpNextInPlayer(currentTrackId, currentIndex)) {
            playQueueOnExoPlayer(newQueue, currentIndex, startPositionMs = currentPos)
        }
        persistCurrentSession()
        Toast.makeText(applicationContext, "Up next cleared", Toast.LENGTH_SHORT).show()
    }

    private fun captureSnapshotOnMainThread(): PlaybackSessionSnapshot {
        val snapshotState = _state.value
        val posMs = mediaController?.currentPosition?.coerceAtLeast(0L)
            ?: (snapshotState.progressSeconds * 1000).toLong()
        return PlaybackSessionSnapshot(
            trackId = snapshotState.currentTrack?.id,
            queueIds = snapshotState.queue.map { it.id },
            queueIndex = snapshotState.currentQueueIndex,
            positionMs = posMs,
            isPlaying = snapshotState.isPlaying,
            shuffleEnabled = snapshotState.shuffleEnabled,
            repeatMode = snapshotState.repeatMode,
        )
    }

    fun persistCurrentSession() {
        val snapshot = captureSnapshotOnMainThread()
        // Skip byte-identical snapshots: pause/stop/edit signals overlap and
        // would otherwise rewrite the same DataStore blob repeatedly.
        if (!shouldPersistPlaybackSession(lastPersistedSnapshot, snapshot)) return
        lastPersistedSnapshot = snapshot
        scope.launch(Dispatchers.IO) {
            persistenceMutex.withLock {
                persistence.savePlaybackSession(
                    trackId = snapshot.trackId,
                    queueIds = snapshot.queueIds,
                    queueIndex = snapshot.queueIndex,
                    positionMs = snapshot.positionMs,
                    isPlaying = snapshot.isPlaying,
                    shuffleEnabled = snapshot.shuffleEnabled,
                    repeatMode = snapshot.repeatMode,
                )
            }
        }
    }

    private fun persistCurrentPosition(positionMs: Long) {
        scope.launch(Dispatchers.IO) {
            persistenceMutex.withLock {
                persistence.savePosition(positionMs)
            }
        }
    }

    /**
     * Re-syncs visible UI state from the live MediaController (M27.1).
     *
     * Called when FreQ returns to the foreground: the AudioPlaybackService
     * keeps owning the player across backgrounding, but a recreated Activity
     * (or a state snapshot taken while backgrounded) may hold stale or empty
     * UI state. This re-reads the controller playlist, resolves metadata for
     * known IDs, and republishes the current track/queue/playing state so the
     * Mini Player and Now Playing always represent the MediaSession — never a
     * stale Compose-only snapshot. Safe to call any time: no-ops when the
     * controller is absent, released, or has no items, and never clears
     * existing state when metadata resolution fails (e.g. offline).
     *
     * Never stops playback and performs no network work on Main (metadata
     * lookups run on IO, like session restore).
     */
    fun refreshFromController() {
        if (released) return
        val token = activePlaybackToken
        scope.launch(Dispatchers.Main) {
            val controller = mediaController ?: return@launch
            if (released || isSyncStale(token, activePlaybackToken)) return@launch
            if (controller.mediaItemCount <= 0) return@launch
            val ids = (0 until controller.mediaItemCount).mapNotNull { index ->
                controller.getMediaItemAt(index).mediaId.takeIf { it.isNotBlank() }
            }
            if (ids.isEmpty() || isSyncStale(token, activePlaybackToken)) return@launch
            val liveIndex = controller.currentMediaItemIndex.coerceIn(0, ids.lastIndex)
            val livePlaying = controller.isPlaying
            val livePositionSec = (controller.currentPosition / 1000f).coerceAtLeast(0f)
            val liveShuffle = controller.shuffleModeEnabled
            val liveRepeat = when (controller.repeatMode) {
                Player.REPEAT_MODE_ALL -> 1
                Player.REPEAT_MODE_ONE -> 2
                else -> 0
            }
            scope.launch(Dispatchers.IO) {
                if (isSyncStale(token, activePlaybackToken)) return@launch
                val queue = ids.mapNotNull { id ->
                    try {
                        musicRepository.getTrack(id)
                    } catch (e: CancellationException) {
                        throw e
                    } catch (e: Exception) {
                        null
                    }
                }
                if (queue.isEmpty() || isSyncStale(token, activePlaybackToken)) return@launch
                withContext(Dispatchers.Main) {
                    if (released || isSyncStale(token, activePlaybackToken)) return@withContext
                    val clamped = liveIndex.coerceIn(0, queue.lastIndex)
                    val track = queue[clamped]
                    _state.update {
                        it.copy(
                            queue = queue,
                            currentQueueIndex = clamped,
                            currentTrack = track,
                            isFavorite = libraryRepository?.isTrackLiked(track.id) ?: it.isFavorite,
                            isPlaying = livePlaying,
                            progressSeconds = livePositionSec,
                            shuffleEnabled = liveShuffle,
                            repeatMode = liveRepeat,
                            isLoading = false,
                            playbackError = null,
                        )
                    }
                    syncedPlayableIds = ids
                    applyAudioModeToController()
                    if (livePlaying) startProgressTicker() else stopProgressTicker()
                }
            }
        }
    }

    /**
     * UI-side cleanup for Activity destruction/recreation (M12).
     *
     * Idempotent. Releases only the UI-owned controller binding and cancels
     * PlaybackManager-owned jobs — never the service player, so background
     * playback survives Activity recreation. The service owns the
     * MediaSession/ExoPlayer lifecycle (M10); a new manager instance simply
     * reconnects via [initializeMediaController].
     */
    fun release() {
        if (released) return
        released = true
        unregisterRouteCallback()
        persistCurrentSession()
        stopProgressTicker()
        activePlaybackJob?.cancel()
        activePlaybackJob = null
        recoveryJob?.cancel()
        recoveryJob = null
        playlistSyncJob?.cancel()
        playlistSyncJob = null
        restoreJob?.cancel()
        restoreJob = null
        autoplayJob?.cancel()
        autoplayJob = null
        try {
            playerListener?.let { listener ->
                mediaController?.removeListener(listener)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to detach player listener", e)
        }
        playerListener = null
        controllerFuture?.let {
            try {
                MediaController.releaseFuture(it)
            } catch (e: Exception) {
                Log.w(TAG, "Failed to release controller future", e)
            }
        }
        controllerFuture = null
        mediaController = null
        syncedPlayableIds = emptyList()
        syncedPlayableIndices = emptyList()
    }

    companion object {
        private const val TAG = "PlaybackManager"

        /** M27.6: lazy continuation resolution batch size. */
        const val AUTOPLAY_BATCH_SIZE = 5
    }
}

val LocalPlaybackManager = compositionLocalOf<PlaybackManager> {
    error("PlaybackManager not provided")
}
