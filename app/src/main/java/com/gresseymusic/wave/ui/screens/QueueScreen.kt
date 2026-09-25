package com.gresseymusic.wave.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.gresseymusic.wave.data.repository.LocalMusicRepository
import com.gresseymusic.wave.player.LocalPlaybackManager
import com.gresseymusic.wave.player.MediaTrack
import com.gresseymusic.wave.ui.components.AddToPlaylistDialog
import com.gresseymusic.wave.ui.components.FreqArtwork
import com.gresseymusic.wave.ui.components.FreqConfirmDialog
import com.gresseymusic.wave.ui.components.FreqEmptyState
import com.gresseymusic.wave.ui.components.FreqGlassSurface
import com.gresseymusic.wave.ui.components.FreqGlassBackend
import com.gresseymusic.wave.ui.components.FreqPlayPauseIcon
import com.gresseymusic.wave.ui.components.FreqIconButton
import com.gresseymusic.wave.ui.components.FreqSectionHeader
import com.gresseymusic.wave.ui.components.formatQueueDuration
import com.gresseymusic.wave.ui.theme.FreqElevation
import com.gresseymusic.wave.ui.theme.FreqGlassTone
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.theme.FreqSpacing
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.Typography
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private val PauseIconSmall: ImageVector = ImageVector.Builder(
    name = "PauseSmall",
    defaultWidth = 24.dp,
    defaultHeight = 24.dp,
    viewportWidth = 24f,
    viewportHeight = 24f,
).apply {
    path(fill = SolidColor(Color.White)) {
        moveTo(6f, 19f)
        horizontalLineToRelative(4f)
        verticalLineTo(5f)
        horizontalLineTo(6f)
        verticalLineToRelative(14f)
        close()
        moveTo(14f, 5f)
        verticalLineToRelative(14f)
        horizontalLineToRelative(4f)
        verticalLineTo(5f)
        horizontalLineToRelative(-4f)
        close()
    }
}.build()

/**
 * FreQ Queue (M20). A live listening workspace with two sharply separated
 * zones: the anchored NOW PLAYING card and the ordered UP NEXT sequence.
 *
 * Rows stay calm — artwork, identity, duration, one 44dp overflow holding
 * every real action (Play, Move up/down, Play Next, Add to Queue, Add to
 * Playlist, Remove). Reorder keeps the existing move semantics through
 * deliberate menu actions rather than risky drag gestures. All playback
 * flows through the existing PlaybackManager calls.
 */
@Composable
fun QueueScreen(
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier,
    onCurrentTrackClick: () -> Unit = {},
) {
    val playbackManager = LocalPlaybackManager.current
    // Narrow collectors: progress ticks (2x/sec) must not recompose the
    // queue list. Only queue/index/track/playing changes re-run this screen.
    val queue by remember(playbackManager) {
        playbackManager.state.map { it.queue }.distinctUntilChanged()
    }.collectAsState(initial = playbackManager.state.value.queue)
    val currentQueueIndex by remember(playbackManager) {
        playbackManager.state.map { it.currentQueueIndex }.distinctUntilChanged()
    }.collectAsState(initial = playbackManager.state.value.currentQueueIndex)
    val currentTrack by remember(playbackManager) {
        playbackManager.state.map { it.currentTrack }.distinctUntilChanged()
    }.collectAsState(initial = playbackManager.state.value.currentTrack)
    val isPlaying by remember(playbackManager) {
        playbackManager.state.map { it.isPlaying }.distinctUntilChanged()
    }.collectAsState(initial = playbackManager.state.value.isPlaying)

    var playlistTrack by remember { mutableStateOf<MediaTrack?>(null) }
    var showClearConfirm by remember { mutableStateOf(false) }

    // Lazily resolve honest durations for continuation tracks that carry
    // no duration metadata (they render "--:--" until patched). Bounded
    // parallel fetch; failures simply stay unknown.
    val musicRepository = LocalMusicRepository.current
    var resolvedDurations by remember { mutableStateOf(mapOf<String, Int>()) }
    LaunchedEffect(queue) {
        val known = resolvedDurations
        val missing = queue
            .filter { it.durationSeconds <= 1 && it.id.isNotBlank() && !known.containsKey(it.id) }
            .take(24)
        if (missing.isEmpty()) return@LaunchedEffect
        val fetched = missing.map { track ->
            async {
                val seconds = try {
                    withContext(Dispatchers.IO) {
                        musicRepository.getTrack(track.id)?.durationSeconds ?: 0
                    }
                } catch (_: Exception) {
                    0
                }
                track.id to seconds
            }
        }.awaitAll().toMap()
        resolvedDurations = known + fetched
    }

    val dialogTrack = playlistTrack
    if (dialogTrack != null) {
        AddToPlaylistDialog(
            track = dialogTrack,
            onDismiss = { playlistTrack = null },
        )
    }
    if (showClearConfirm) {
        FreqConfirmDialog(
            title = "Clear Up Next?",
            message = "This removes every upcoming track. The current track keeps playing.",
            confirmText = "Clear",
            destructive = true,
            onConfirm = {
                showClearConfirm = false
                playbackManager.clearUpNext()
            },
            onDismiss = { showClearConfirm = false },
        )
    }

    val upNextIndices = visibleUpNextIndices(queue.size, currentQueueIndex)

    Column(
        modifier = modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(horizontal = FreqSpacing.md)
    ) {
        QueueHeader(
            onBackClick = onBackClick,
            totalCount = queue.size,
            upNextCount = upNextIndices.size,
        )

        Spacer(modifier = Modifier.height(FreqSpacing.md))

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
        ) {
            item(key = "now_playing_section") {
                Text(
                    text = "NOW PLAYING",
                    style = Typography.labelSmall,
                    color = FreqTheme.colors.textMuted,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(bottom = FreqSpacing.xs),
                )

                val nowPlaying = currentTrack
                if (nowPlaying != null) {
                    NowPlayingQueueCard(
                        track = nowPlaying,
                        isPlaying = isPlaying,
                        onCardClick = onCurrentTrackClick,
                        onPlayPauseClick = { playbackManager.togglePlayPause() },
                    )
                } else {
                    FreqGlassSurface(
                        tone = FreqGlassTone.Standard,
                        shape = FreqShapes.card,
                    ) {
                        Text(
                            text = "No track playing",
                            style = Typography.bodyMedium,
                            color = FreqTheme.colors.textMuted,
                            modifier = Modifier.padding(FreqSpacing.md),
                        )
                    }
                }
            }

            item(key = "up_next_header") {
                Spacer(modifier = Modifier.height(FreqSpacing.sm))
                if (upNextIndices.isNotEmpty()) {
                    FreqSectionHeader(
                        title = "Up Next · ${upNextIndices.size}",
                        actionText = "Clear",
                        onActionClick = { showClearConfirm = true },
                    )
                } else {
                    FreqSectionHeader(title = "Up Next")
                }
            }

            if (upNextIndices.isEmpty()) {
                item(key = "empty_up_next") {
                    if (currentTrack == null) {
                        FreqEmptyState(
                            message = "Your queue is empty. Play songs from Search, " +
                                "Home, or your Library to fill it.",
                        )
                    } else {
                        FreqGlassSurface(
                            tone = FreqGlassTone.Subtle,
                            shape = FreqShapes.card,
                        ) {
                            Text(
                                text = "Nothing queued after this track.",
                                style = Typography.bodySmall,
                                color = FreqTheme.colors.textMuted,
                                modifier = Modifier.padding(
                                    horizontal = FreqSpacing.md,
                                    vertical = FreqSpacing.sm,
                                ),
                            )
                        }
                    }
                }
            } else {
                itemsIndexed(
                    items = upNextIndices,
                    key = { _, realIndex ->
                        val itemTrack = queue.getOrNull(realIndex)
                        "${itemTrack?.id ?: realIndex}_$realIndex"
                    },
                ) { listPosition, realIndex ->
                    val itemTrack = queue.getOrNull(realIndex)
                    if (itemTrack != null) {
                        val (canMoveUp, canMoveDown) =
                            moveAvailability(listPosition, upNextIndices.lastIndex)
                        QueueTrackRow(
                            indexInUpNext = listPosition + 1,
                            track = itemTrack,
                            resolvedDurationSeconds = resolvedDurations[itemTrack.id] ?: 0,
                            canMoveUp = canMoveUp,
                            canMoveDown = canMoveDown,
                            onPlayItem = { playbackManager.playQueueItem(realIndex) },
                            onRemove = { playbackManager.removeFromQueue(realIndex) },
                            onMoveUp = { playbackManager.moveQueueItem(realIndex, realIndex - 1) },
                            onMoveDown = { playbackManager.moveQueueItem(realIndex, realIndex + 1) },
                            onPlayNext = { playbackManager.playNext(itemTrack) },
                            onAddToQueue = { playbackManager.addToQueue(itemTrack) },
                            onAddToPlaylist = { playlistTrack = itemTrack },
                        )
                    }
                }
            }

            item(key = "queue_bottom_spacer") {
                Spacer(modifier = Modifier.height(FreqSpacing.xl))
            }
        }
    }
}

@Composable
private fun QueueHeader(
    onBackClick: () -> Unit,
    totalCount: Int,
    upNextCount: Int,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        FreqIconButton(
            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
            contentDescription = "Back",
            onClick = onBackClick,
        )

        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "Queue",
                style = Typography.titleMedium,
                color = FreqTheme.colors.textPrimary,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = queueSubtitleText(totalCount, upNextCount),
                style = Typography.labelSmall,
                color = FreqTheme.colors.textMuted,
            )
        }

        Spacer(modifier = Modifier.size(FreqSpacing.touchTargetDense))
    }
}

@Composable
private fun NowPlayingQueueCard(
    track: MediaTrack,
    isPlaying: Boolean,
    onCardClick: () -> Unit,
    onPlayPauseClick: () -> Unit,
) {
    val colors = FreqTheme.colors
    FreqGlassSurface(
        tone = FreqGlassTone.Strong,
        shape = FreqShapes.cardLarge,
        modifier = Modifier.clickable(
            role = Role.Button,
            onClickLabel = "Open Now Playing for ${track.title}",
            onClick = onCardClick,
        ),
    ) {
        Row(
            modifier = Modifier.padding(FreqSpacing.md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            FreqArtwork(
                artworkUrl = track.artworkUrl,
                colors = track.gradientColors.ifEmpty {
                    listOf(colors.textSecondary, colors.textMuted)
                },
                shape = FreqShapes.card,
                iconSize = FreqSpacing.iconLg,
                modifier = Modifier.size(56.dp),
            )

            Spacer(modifier = Modifier.width(FreqSpacing.md))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = track.title,
                    style = Typography.titleMedium,
                    color = colors.textPrimary,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = track.artist,
                    style = Typography.bodySmall,
                    color = colors.textSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }

            Spacer(modifier = Modifier.width(FreqSpacing.sm))

            // M27.6: frosted-glass play disc with morphing icon (HAZE —
            // small Prismal capsules SIGSEGV the RenderThread on some
            // GPUs, so discs stay on the stable frost path).
            FreqGlassSurface(
                modifier = Modifier
                    .size(FreqSpacing.touchTargetMin)
                    .clip(FreqShapes.circle)
                    .clickable(
                        role = Role.Button,
                        onClickLabel = if (isPlaying) "Pause" else "Play",
                        onClick = onPlayPauseClick,
                    ),
                tone = FreqGlassTone.Floating,
                shape = FreqShapes.circle,
                shadow = FreqElevation.none,
                glassBackend = FreqGlassBackend.HAZE,
                contentAlignment = Alignment.Center,
            ) {
                FreqPlayPauseIcon(
                    isPlaying = isPlaying,
                    pauseIcon = PauseIconSmall,
                    tint = colors.textPrimary,
                    iconSize = FreqSpacing.iconLg,
                    contentDescription = null,
                )
            }
        }
    }
}

@Composable
private fun QueueTrackRow(
    indexInUpNext: Int,
    track: MediaTrack,
    resolvedDurationSeconds: Int = 0,
    canMoveUp: Boolean,
    canMoveDown: Boolean,
    onPlayItem: () -> Unit,
    onRemove: () -> Unit,
    onMoveUp: () -> Unit,
    onMoveDown: () -> Unit,
    onPlayNext: () -> Unit,
    onAddToQueue: () -> Unit,
    onAddToPlaylist: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var showMenu by remember { mutableStateOf(false) }
    val colors = FreqTheme.colors
    // Prefer the lazily resolved duration; fall back to the queued value.
    val shownDurationSeconds = remember(track, resolvedDurationSeconds) {
        if (resolvedDurationSeconds > 1) resolvedDurationSeconds else track.durationSeconds
    }

    FreqGlassSurface(
        tone = FreqGlassTone.Subtle,
        shape = FreqShapes.card,
        modifier = modifier.clickable(
            role = Role.Button,
            onClickLabel = "Play ${track.title} by ${track.artist}",
            onClick = onPlayItem,
        ),
    ) {
        Row(
            modifier = Modifier.padding(
                horizontal = FreqSpacing.md,
                vertical = FreqSpacing.sm,
            ),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Queue thumbnails: real artwork when present, gradient
            // placeholder otherwise — rows never render bare.
            FreqArtwork(
                artworkUrl = track.artworkUrl,
                colors = track.gradientColors.ifEmpty {
                    listOf(colors.textSecondary, colors.textMuted)
                },
                shape = FreqShapes.artworkSmall,
                iconSize = FreqSpacing.iconMd,
                contentDescription = "Artwork for ${track.title}",
                modifier = Modifier.size(FreqSpacing.artworkThumb),
            )

            Spacer(modifier = Modifier.width(FreqSpacing.sm))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = track.title,
                    style = Typography.titleMedium,
                    color = colors.textPrimary,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = track.artist,
                    style = Typography.bodySmall,
                    color = colors.textSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }

            Spacer(modifier = Modifier.width(FreqSpacing.xs))

            Text(
                text = formatQueueDuration(shownDurationSeconds),
                style = Typography.bodySmall,
                color = colors.textMuted,
                modifier = Modifier.padding(end = FreqSpacing.xs),
            )

            Box {
                FreqIconButton(
                    imageVector = Icons.Default.MoreVert,
                    contentDescription = "More options for ${track.title}",
                    onClick = { showMenu = true },
                    glass = false,
                    tint = colors.textSecondary,
                )

                DropdownMenu(
                    expanded = showMenu,
                    onDismissRequest = { showMenu = false },
                    modifier = Modifier.background(colors.surfaceElevated),
                ) {
                    DropdownMenuItem(
                        text = { Text("Play", color = colors.textPrimary) },
                        onClick = {
                            showMenu = false
                            onPlayItem()
                        },
                    )
                    DropdownMenuItem(
                        text = { Text("Move up", color = queueMenuTint(colors, canMoveUp)) },
                        enabled = canMoveUp,
                        onClick = {
                            showMenu = false
                            onMoveUp()
                        },
                    )
                    DropdownMenuItem(
                        text = { Text("Move down", color = queueMenuTint(colors, canMoveDown)) },
                        enabled = canMoveDown,
                        onClick = {
                            showMenu = false
                            onMoveDown()
                        },
                    )
                    DropdownMenuItem(
                        text = { Text("Play Next", color = colors.textPrimary) },
                        onClick = {
                            showMenu = false
                            onPlayNext()
                        },
                    )
                    DropdownMenuItem(
                        text = { Text("Add to Queue", color = colors.textPrimary) },
                        onClick = {
                            showMenu = false
                            onAddToQueue()
                        },
                    )
                    DropdownMenuItem(
                        text = { Text("Add to Playlist", color = colors.textPrimary) },
                        onClick = {
                            showMenu = false
                            onAddToPlaylist()
                        },
                    )
                    DropdownMenuItem(
                        text = { Text("Remove", color = colors.error) },
                        onClick = {
                            showMenu = false
                            onRemove()
                        },
                    )
                }
            }
        }
    }
}

/**
 * Menu tint for move actions: full primary when available, muted when the
 * move is disabled at the list edge. Pure and unit-tested.
 */
fun queueMenuTint(
    colors: com.gresseymusic.wave.ui.theme.FreqColors,
    enabled: Boolean,
): Color {
    return if (enabled) colors.textPrimary else colors.textMuted
}

/**
 * Up Next indices: positions strictly after the current track. Empty unless
 * the queue is non-empty and the current index is valid. Pure and
 * unit-tested.
 */
fun visibleUpNextIndices(queueSize: Int, currentIndex: Int): List<Int> {
    if (queueSize <= 0 || currentIndex !in 0 until queueSize) return emptyList()
    if (currentIndex >= queueSize - 1) return emptyList()
    return ((currentIndex + 1)..queueSize - 1).toList()
}

/**
 * Honest header counts from real state. Pure and unit-tested.
 */
fun queueSubtitleText(totalTracks: Int, upNextCount: Int): String {
    if (totalTracks <= 0) return "Empty"
    val total = "$totalTracks " + if (totalTracks == 1) "track" else "tracks"
    if (upNextCount <= 0) return total
    return "$total • $upNextCount up next"
}

/**
 * Move availability within the Up Next list. Pure and unit-tested.
 */
fun moveAvailability(listPosition: Int, lastIndex: Int): Pair<Boolean, Boolean> {
    return Pair(listPosition > 0, listPosition < lastIndex)
}