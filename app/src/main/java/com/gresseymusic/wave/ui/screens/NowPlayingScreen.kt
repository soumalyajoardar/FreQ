package com.gresseymusic.wave.ui.screens

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.progressSemantics
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.gresseymusic.wave.player.AudioMode
import com.gresseymusic.wave.player.LocalPlaybackManager
import com.gresseymusic.wave.player.MediaTrack
import com.gresseymusic.wave.player.audioLabel
import com.gresseymusic.wave.data.repository.LocalMusicRepository
import com.gresseymusic.wave.ui.components.AddToPlaylistDialog
import com.gresseymusic.wave.ui.components.FreqArtwork
import com.gresseymusic.wave.ui.components.FreqEmptyState
import com.gresseymusic.wave.ui.components.FreqGlassSurface
import com.gresseymusic.wave.ui.components.FreqGlassBackend
import com.gresseymusic.wave.ui.components.FreqIconButton
import com.gresseymusic.wave.ui.components.formatSeekTime
import com.gresseymusic.wave.ui.components.progressFraction
import com.gresseymusic.wave.ui.components.seekSecondsFromFraction
import com.gresseymusic.wave.ui.theme.FreqElevation
import com.gresseymusic.wave.ui.theme.FreqGlassTone
import com.gresseymusic.wave.ui.theme.LocalHazeState
import dev.chrisbanes.haze.hazeSource
import com.gresseymusic.wave.ui.theme.FreqResponsive
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.theme.FreqSpacing
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.Typography
import com.gresseymusic.wave.ui.theme.rememberAmbientWash
import com.gresseymusic.wave.ui.theme.vignetteBrush
import com.gresseymusic.wave.ui.theme.readabilityScrim
import androidx.compose.ui.draw.blur
import androidx.compose.ui.layout.ContentScale
import coil.compose.SubcomposeAsyncImage
import coil.compose.SubcomposeAsyncImageContent

private val PauseIcon: ImageVector = ImageVector.Builder(
    name = "Pause",
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

private val PreviousIcon: ImageVector = ImageVector.Builder(
    name = "Previous",
    defaultWidth = 24.dp,
    defaultHeight = 24.dp,
    viewportWidth = 24f,
    viewportHeight = 24f,
).apply {
    path(fill = SolidColor(Color.White)) {
        // Chunky bar + bold left-pointing triangle, Apple-style.
        moveTo(5f, 5.5f)
        horizontalLineToRelative(2.2f)
        verticalLineToRelative(13f)
        horizontalLineTo(5f)
        close()
        moveTo(8.4f, 12f)
        lineTo(18.6f, 18.5f)
        verticalLineTo(5.5f)
        close()
    }
}.build()

private val NextIcon: ImageVector = ImageVector.Builder(
    name = "Next",
    defaultWidth = 24.dp,
    defaultHeight = 24.dp,
    viewportWidth = 24f,
    viewportHeight = 24f,
).apply {
    path(fill = SolidColor(Color.White)) {
        // Chunky right-pointing triangle + bar, Apple-style.
        moveTo(5.4f, 5.5f)
        lineToRelative(10.2f, 6.5f)
        lineTo(5.4f, 18.5f)
        verticalLineToRelative(-13f)
        close()
        moveTo(16.8f, 5.5f)
        verticalLineToRelative(13f)
        horizontalLineToRelative(2.2f)
        verticalLineTo(5.5f)
        horizontalLineToRelative(-2.2f)
        close()
    }
}.build()

private val ShuffleIcon: ImageVector = ImageVector.Builder(    name = "Shuffle",
    defaultWidth = 24.dp,
    defaultHeight = 24.dp,
    viewportWidth = 24f,
    viewportHeight = 24f,
).apply {
    path(fill = SolidColor(Color.White)) {
        // Crossed-arrows shuffle glyph (Material shuffle geometry).
        moveTo(10.59f, 9.17f)
        lineTo(5.41f, 4f)
        lineTo(4f, 5.41f)
        lineTo(9.17f, 10.58f)
        lineTo(10.59f, 9.17f)
        close()
        moveTo(14.5f, 4f)
        lineTo(16.54f, 6.04f)
        lineTo(4f, 18.59f)
        lineTo(5.41f, 20f)
        lineTo(17.96f, 7.46f)
        lineTo(20f, 9.5f)
        lineTo(20f, 4f)
        lineTo(14.5f, 4f)
        close()
        moveTo(14.83f, 13.41f)
        lineTo(13.42f, 14.82f)
        lineTo(16.55f, 17.95f)
        lineTo(14.5f, 20f)
        lineTo(20f, 20f)
        lineTo(20f, 14.5f)
        lineTo(17.96f, 16.54f)
        lineTo(14.83f, 13.41f)
        close()
    }
}.build()

private val RepeatIcon: ImageVector = ImageVector.Builder(
    name = "Repeat",
    defaultWidth = 24.dp,
    defaultHeight = 24.dp,
    viewportWidth = 24f,
    viewportHeight = 24f,
).apply {
    path(fill = SolidColor(Color.White)) {
        // Looped-arrows repeat glyph (Material repeat geometry).
        moveTo(7f, 7f)
        horizontalLineTo(17f)
        verticalLineTo(10f)
        lineTo(21f, 6f)
        lineTo(17f, 2f)
        verticalLineTo(5f)
        horizontalLineTo(5f)
        verticalLineTo(11f)
        horizontalLineTo(7f)
        verticalLineTo(7f)
        close()
        moveTo(17f, 17f)
        horizontalLineTo(7f)
        verticalLineTo(14f)
        lineTo(3f, 18f)
        lineTo(7f, 22f)
        verticalLineTo(19f)
        horizontalLineTo(19f)
        verticalLineTo(13f)
        horizontalLineTo(17f)
        verticalLineTo(17f)
        close()
    }
}.build()

/**
 * FreQ flagship Now Playing (M16).
 *
 * ARTWORK → SONG IDENTITY → POSITION → PRIMARY CONTROLS → SECONDARY ACTIONS.
 * The artwork anchors an artwork-derived atmosphere; identity text sits
 * directly on the atmosphere for readability. All playback behavior flows
 * through the existing PlaybackManager calls.
 */
@Composable
fun NowPlayingScreen(
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    onQueueClick: () -> Unit = {},
) {
    val playbackManager = LocalPlaybackManager.current
    val playbackState by playbackManager.state.collectAsState()
    val track = playbackState.currentTrack
    val colors = FreqTheme.colors

    Box(modifier = modifier.fillMaxSize()) {
        if (track == null) {
            // Honest empty state — never fake songs or artwork.
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .statusBarsPadding(),
            ) {
                NowPlayingTopBar(
                    onDismiss = onDismiss,
                )
                FreqEmptyState(
                    message = "Nothing playing yet — pick a track to start listening.",
                    modifier = Modifier.fillMaxSize(),
                )
            }
            return@Box
        }

        // M27 flagship background: CURRENT TRACK artwork as atmosphere.
        // Full-screen crop → heavy-but-elegant blur → dark readability scrim
        // → vignette → crisp foreground. Swaps instantly on track change
        // (no crossfade). Performance: Coil disk-cached decode sized to
        // layout, single static blur layer (no per-frame work), remembered
        // brushes, no recomposition on progress ticks (track object only).
        val fallbackWash = rememberAmbientWash(track.gradientColors)
        val vignette = remember(colors) { vignetteBrush(colors.scrim) }
        val scrimBrush = remember(colors) { readabilityScrim(colors.scrim) }
        // Haze sampling source: the player buttons are Haze glass, so the
        // artwork atmosphere registers here. Prismal stays reserved for the
        // mini-player and navbar shell surfaces.
        val hazeState = LocalHazeState.current
        Box(
            modifier = Modifier
                .fillMaxSize()
                .then(
                    if (hazeState != null) {
                        Modifier.hazeSource(hazeState)
                    } else {
                        Modifier
                    },
                ),
        ) {
        if (!track.artworkUrl.isNullOrBlank()) {
            SubcomposeAsyncImage(
                model = track.artworkUrl,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxSize()
                    .blur(36.dp),
                loading = {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(fallbackWash),
                    )
                },
                error = {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(fallbackWash),
                    )
                },
                success = { SubcomposeAsyncImageContent() },
            )
        } else {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(fallbackWash),
            )
        }
        // Readability scrim: dark theme uses the strong dark scrim — never a
        // generic blue wash.
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(scrimBrush),
        )
        // Extra legibility veil over the blurred art (translucent bg tint).
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(colors.background.copy(alpha = 0.32f)),
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(vignette),
        )
        }

        // M27.2 fixed player composition: non-scrollable. The artwork flexes
        // (weight) inside the leftover viewport so every control always fits;
        // short screens use compact caps + spacing via responsive tokens.
        val configuration = LocalConfiguration.current
        val shortScreen = configuration.screenHeightDp < FreqResponsive.SHORT_HEIGHT_DP
        val artworkCap = nowPlayingArtworkCapDp(shortScreen)
        val sectionSpacing = if (shortScreen) FreqSpacing.sm else FreqSpacing.md

        // Mock-faithful column: top bar, square artwork, title row,
        // neutral thumbless progress, oversized play controls, then
        // Up Next. No volume bar (queue lives behind the Up Next card).
        var showAddToPlaylist by remember { mutableStateOf(false) }

        // Lyrics flip (M28): tapping the artwork flips it to a lyrics
        // card. Lyrics fetch once per track, on first flip; results are
        // keyed by track id so track changes reset everything.
        val musicRepository = LocalMusicRepository.current
        var showLyrics by remember(track.id) { mutableStateOf(false) }
        var lyricsLines by remember(track.id) { mutableStateOf<List<String>?>(null) }
        var lyricsLoading by remember(track.id) { mutableStateOf(false) }
        var lyricsFetched by remember(track.id) { mutableStateOf(false) }
        LaunchedEffect(track.id, showLyrics) {
            if (!showLyrics || lyricsFetched) return@LaunchedEffect
            lyricsFetched = true
            lyricsLoading = true
            try {
                lyricsLines = musicRepository.getLyrics(track)
            } finally {
                lyricsLoading = false
            }
        }
        val density = LocalDensity.current
        val flipRotation by animateFloatAsState(
            targetValue = if (showLyrics) 180f else 0f,
            animationSpec = tween(durationMillis = ARTWORK_FLIP_MS),
            label = "artworkLyricsFlip",
        )
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = FreqSpacing.lg)
                .padding(top = FreqSpacing.sm, bottom = nowPlayingBottomClearanceDp(shortScreen)),
            verticalArrangement = Arrangement.spacedBy(sectionSpacing),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            NowPlayingTopBar(
                onDismiss = onDismiss,
                album = track.album,
                title = track.title,
                isFavorite = playbackState.isFavorite,
                onPlayNextClick = { track.let { playbackManager.playNext(it) } },
                onAddToQueueClick = { track.let { playbackManager.addToQueue(it) } },
                onAddToPlaylistClick = { showAddToPlaylist = true },
                onToggleFavoriteClick = { playbackManager.toggleFavorite() },
            )

            // Artwork hero stays crisp (never blurred). Soft neutral shadow
            // provides floating depth — no colored halo wash. The weighted
            // stage lets the hero shrink on short screens instead of pushing
            // controls off-screen. Track changes swap instantly.
            // Tapping flips horizontally to the lyrics card (and back).
            Box(
                modifier = Modifier
                    .weight(1f, fill = true)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center,
            ) {
                val flipModifier = Modifier
                    .fillMaxWidth(NOW_PLAYING_ARTWORK_FRACTION)
                    .aspectRatio(1f)
                    .sizeIn(maxWidth = artworkCap, maxHeight = artworkCap)
                    .widthIn(max = FreqResponsive.contentMaxWidth)
                    .graphicsLayer {
                        rotationY = flipRotation
                        cameraDistance = 12f * density.density
                    }
                    .clip(FreqShapes.artwork)
                    .clickable(
                        role = Role.Button,
                        indication = null,
                        interactionSource = remember { MutableInteractionSource() },
                        onClickLabel = if (showLyrics) "Show artwork" else "Show lyrics",
                        onClick = { showLyrics = !showLyrics },
                    )
                if (flipRotation <= 90f) {
                    FreqArtwork(
                        artworkUrl = track.artworkUrl,
                        colors = track.gradientColors,
                        shape = FreqShapes.artwork,
                        iconSize = 56.dp,
                        contentDescription = "Artwork for ${track.title}",
                        modifier = flipModifier.shadow(
                            FreqSpacing.md,
                            FreqShapes.artwork,
                            ambientColor = Color.Black,
                            spotColor = Color.Black,
                        ),
                    )
                } else {
                    ArtworkLyricsBack(
                        title = track.title,
                        lines = lyricsLines,
                        loading = lyricsLoading,
                        modifier = flipModifier.graphicsLayer {
                            rotationY = 180f
                        },
                    )
                }
            }

            // Content column runs full-width: text, progress, controls
            // and Up Next breathe edge-to-edge while the artwork keeps
            // its own 0.88 hero sizing.
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(sectionSpacing),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
            NowPlayingIdentity(
                title = track.title,
                artist = track.artist,
                isFavorite = playbackState.isFavorite,
                onFavoriteClick = { playbackManager.toggleFavorite() },
            )

            NowPlayingPhotoSeek(
                positionSeconds = playbackState.progressSeconds,
                durationSeconds = playbackState.durationSeconds,
                onSeek = { playbackManager.seekTo(it) },
                enabled = !playbackState.isLoading,
            )

            NowPlayingControls(
                isPlaying = playbackState.isPlaying,
                isLoading = playbackState.isLoading,
                shuffleEnabled = playbackState.shuffleEnabled,
                repeatMode = playbackState.repeatMode,
                onPlayPauseClick = { playbackManager.togglePlayPause() },
                onShuffleClick = { playbackManager.toggleShuffle() },
                onRepeatClick = { playbackManager.cycleRepeatMode() },
                onNextClick = { playbackManager.skipToNext() },
                onPreviousClick = { playbackManager.skipToPrevious() },
            )

            NowPlayingNightcoreToggle(
                mode = playbackState.audioMode,
                onSelect = { playbackManager.setAudioMode(it) },
            )

            if (playbackState.playbackError != null) {
                Text(
                    text = playbackState.playbackError ?: "",
                    style = Typography.bodySmall,
                    color = colors.error,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }

            val queue = playbackState.queue
            val currentQueueIndex = playbackState.currentQueueIndex
            val upNextTrack = nextTrackForNowPlaying(queue, currentQueueIndex)
            val upNextCount = upNextCountForNowPlaying(queue.size, currentQueueIndex)
            NowPlayingPhotoUpNext(
                nextTrack = upNextTrack,
                upNextCount = upNextCount,
                onPlayNextClick = { playbackManager.skipToNext() },
                onQueueClick = onQueueClick,
            )
            }
        }

        if (showAddToPlaylist) {
            AddToPlaylistDialog(
                track = track,
                onDismiss = { showAddToPlaylist = false },
            )
        }
    }
}

/**
 * M27.2 hero artwork sizing: ~80% of available width with responsive caps
 * (normal 300dp ≈ −12% from 340dp, short 200dp ≈ −9% from 220dp). Pure and
 * unit-tested.
 */
const val NOW_PLAYING_ARTWORK_FRACTION = 0.88f

fun nowPlayingArtworkCapDp(shortScreen: Boolean): Dp {
    return if (shortScreen) 200.dp else 300.dp
}

/**
 * M27.3 bottom breathing room above the Android gesture area: 32dp normal,
 * 24dp on short screens (both on top of `navigationBarsPadding`), so Up
 * Next never crowds the indicator without wasting space. Pure and
 * unit-tested.
 */
fun nowPlayingBottomClearanceDp(shortScreen: Boolean): Dp {
    return if (shortScreen) FreqSpacing.lg else FreqSpacing.xl
}

/** Artwork ↔ lyrics flip duration (ms). GPU-layer rotation, one shot. */
const val ARTWORK_FLIP_MS = 450

/**
 * Lyrics back of the artwork hero (M28): same footprint as the artwork,
 * glass card with the track title, a scrollable lyric sheet, and honest
 * states for loading / unavailable. Tapping anywhere flips back (the
 * parent stage owns the toggle).
 */
@Composable
private fun ArtworkLyricsBack(
    title: String,
    lines: List<String>?,
    loading: Boolean,
    modifier: Modifier = Modifier,
) {
    val colors = FreqTheme.colors
    FreqGlassSurface(
        tone = FreqGlassTone.Strong,
        shape = FreqShapes.artwork,
        shadow = FreqElevation.none,
        contentAlignment = Alignment.TopStart,
        modifier = modifier,
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(FreqSpacing.md),
        ) {
            Text(
                text = "LYRICS",
                style = Typography.labelSmall,
                color = colors.textMuted,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
            )
            Spacer(modifier = Modifier.height(FreqSpacing.xs))
            Text(
                text = title.ifBlank { "Unknown Title" },
                style = Typography.titleMedium,
                color = colors.textPrimary,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(modifier = Modifier.height(FreqSpacing.sm))
            when {
                loading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator(
                            color = colors.textPrimary,
                            strokeWidth = 3.dp,
                            modifier = Modifier
                                .size(32.dp)
                                .semantics { contentDescription = "Loading lyrics" },
                        )
                    }
                }
                lines.isNullOrEmpty() -> {
                    Text(
                        text = "Lyrics not available for this track.",
                        style = Typography.bodyMedium,
                        color = colors.textSecondary,
                    )
                }
                else -> {
                    Column(
                        modifier = Modifier.verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(FreqSpacing.xs),
                    ) {
                        lines.forEach { line ->
                            Text(
                                text = line,
                                style = Typography.bodyMedium,
                                color = colors.textPrimary,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NowPlayingTopBar(
    onDismiss: () -> Unit,
    album: String? = null,
    title: String? = null,
    isFavorite: Boolean = false,
    onPlayNextClick: () -> Unit = {},
    onAddToQueueClick: () -> Unit = {},
    onAddToPlaylistClick: () -> Unit = {},
    onToggleFavoriteClick: () -> Unit = {},
) {
    var showMenu by remember { mutableStateOf(false) }
    val colors = FreqTheme.colors
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        FreqIconButton(
            imageVector = Icons.Default.KeyboardArrowDown,
            contentDescription = "Close player",
            onClick = onDismiss,
        )

        val showAlbum = shouldShowAlbumContext(album, title)
        Column(
            modifier = Modifier.weight(1f),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            if (showAlbum) {
                Text(
                    text = "PLAYING FROM ALBUM",
                    style = Typography.labelSmall,
                    color = FreqTheme.colors.textMuted,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                )
                Text(
                    text = album.orEmpty(),
                    style = Typography.labelMedium,
                    color = FreqTheme.colors.textPrimary,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            } else {
                Text(
                    text = "Now Playing",
                    style = Typography.labelMedium,
                    color = FreqTheme.colors.textSecondary,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                )
            }
        }

        // Song options: play next, queue, playlist, favorite.
        Box {
            FreqIconButton(
                imageVector = Icons.Default.MoreVert,
                contentDescription = "More options",
                onClick = { showMenu = true },
            )

            DropdownMenu(
                expanded = showMenu,
                onDismissRequest = { showMenu = false },
                // Dark frosted menu: near-opaque black tint with a hairline
                // glass edge. True backdrop blur isn't possible inside a
                // Popup (separate window above the composition, so Haze has
                // nothing to sample) — the black tint + edge reads as the
                // same dark glass.
                shape = FreqShapes.card,
                containerColor = Color(0xFF101218).copy(alpha = 0.88f),
                tonalElevation = 0.dp,
                shadowElevation = FreqSpacing.sm,
                modifier = Modifier.border(
                    1.dp,
                    colors.glassBorder,
                    FreqShapes.card,
                ),
            ) {
                DropdownMenuItem(
                    text = { Text("Play next", color = colors.textPrimary) },
                    onClick = {
                        showMenu = false
                        onPlayNextClick()
                    },
                )
                DropdownMenuItem(
                    text = { Text("Add to queue", color = colors.textPrimary) },
                    onClick = {
                        showMenu = false
                        onAddToQueueClick()
                    },
                )
                DropdownMenuItem(
                    text = { Text("Add to playlist", color = colors.textPrimary) },
                    onClick = {
                        showMenu = false
                        onAddToPlaylistClick()
                    },
                )
                DropdownMenuItem(
                    text = {
                        Text(
                            if (isFavorite) "Remove from favorites" else "Add to favorites",
                            color = colors.textPrimary,
                        )
                    },
                    onClick = {
                        showMenu = false
                        onToggleFavoriteClick()
                    },
                )
            }
        }
    }
}

@Composable
private fun NowPlayingIdentity(
    title: String,
    artist: String,
    isFavorite: Boolean,
    onFavoriteClick: () -> Unit,
) {
    val colors = FreqTheme.colors
    // Monochrome ringed heart: white filled heart when liked, gray
    // outline otherwise. Frosted Haze glass like every player button.
    val heartActive = isFavorite
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // 2dp start guard: glyph left bearings must never touch a pixel
        // edge (some GPUs rasterize edge glyphs 1px short).
        Column(modifier = Modifier.weight(1f).padding(start = 2.dp)) {
            Text(
                text = title.ifBlank { "Unknown Title" },
                style = Typography.displaySmall,
                color = colors.textPrimary,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(modifier = Modifier.height(FreqSpacing.xxs))
            Text(
                text = artist.ifBlank { "Unknown Artist" },
                style = Typography.bodyMedium,
                color = colors.textSecondary,
                fontWeight = FontWeight.Normal,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }

        Spacer(modifier = Modifier.width(FreqSpacing.sm))

        // Monochrome heart: white filled heart when liked, muted outline
        // otherwise. Frosted Haze glass like every player button.
        FreqGlassSurface(
            tone = FreqGlassTone.Floating,
            shape = FreqShapes.circle,
            shadow = FreqElevation.card,
            blur = 24.dp,
            glassBackend = FreqGlassBackend.HAZE,
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(56.dp)
                .clip(FreqShapes.circle)
                .clickable(
                    role = Role.Button,
                    onClickLabel = if (heartActive) "Remove from favorites" else "Add to favorites",
                    indication = ripple(),
                    interactionSource = remember { MutableInteractionSource() },
                    onClick = onFavoriteClick,
                ),
        ) {
            Icon(
                imageVector = if (heartActive) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                contentDescription = if (heartActive) "Remove from favorites" else "Add to favorites",
                tint = if (heartActive) colors.textPrimary else colors.textSecondary,
                modifier = Modifier.size(26.dp),
            )
        }
    }
}

@Composable
private fun NowPlayingControls(
    isPlaying: Boolean,
    isLoading: Boolean,
    shuffleEnabled: Boolean,
    repeatMode: Int,
    onPlayPauseClick: () -> Unit,
    onShuffleClick: () -> Unit,
    onRepeatClick: () -> Unit,
    onNextClick: () -> Unit,
    onPreviousClick: () -> Unit,
) {
    // MusicUI-style transport bar (component-library player-bar pattern):
    // a single frosted-glass pill holding the whole cluster — small
    // utility buttons at the ends (shuffle / repeat), skip buttons
    // flanking one high-contrast solid play disc. One glass surface
    // instead of five keeps overdraw low; everything is static.
    FreqGlassSurface(
        tone = FreqGlassTone.Floating,
        shape = FreqShapes.pill,
        shadow = FreqElevation.card,
        blur = 24.dp,
        glassBackend = FreqGlassBackend.HAZE,
        contentAlignment = Alignment.Center,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = FreqSpacing.sm, vertical = FreqSpacing.xs),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            TransportUtilityButton(
                imageVector = ShuffleIcon,
                contentDescription = shuffleContentDescription(shuffleEnabled),
                onClick = onShuffleClick,
                isActive = shuffleEnabled,
            )

            TransportSkipButton(
                imageVector = PreviousIcon,
                contentDescription = "Previous track",
                onClick = onPreviousClick,
            )

            TransportPlayDisc(
                isPlaying = isPlaying,
                isLoading = isLoading,
                onClick = onPlayPauseClick,
            )

            TransportSkipButton(
                imageVector = NextIcon,
                contentDescription = "Next track",
                onClick = onNextClick,
            )

            TransportUtilityButton(
                imageVector = RepeatIcon,
                contentDescription = repeatContentDescription(repeatMode),
                onClick = onRepeatClick,
                isActive = repeatMode > 0,
            )
        }
    }
}

/**
 * Audio flavor switch (M28): replaces the old playback-speed control.
 * Order is SnR · Normal · Nightcore with Normal in the center. Selection
 * cross-fades smoothly (tween): Normal stays white, SnR turns blue,
 * Nightcore turns purple. Instant swap of state, never of pixels.
 */
@Composable
private fun NowPlayingNightcoreToggle(
    mode: AudioMode,
    onSelect: (AudioMode) -> Unit,
) {
    FreqGlassSurface(
        tone = FreqGlassTone.Subtle,
        shape = FreqShapes.pill,
        shadow = FreqElevation.none,
        blur = 0.dp,
        glassBackend = FreqGlassBackend.HAZE,
        contentAlignment = Alignment.Center,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = FreqSpacing.xs, vertical = FreqSpacing.xs),
            horizontalArrangement = Arrangement.spacedBy(FreqSpacing.xs),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            flavorOrder.forEach { (flavor, pill) ->
                NightcoreSegment(
                    label = audioLabel(flavor),
                    selected = mode == flavor,
                    activeColor = pill,
                    onClick = if (mode != flavor) {
                        { onSelect(flavor) }
                    } else {
                        null
                    },
                    description = "${audioLabel(flavor)} mode",
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

/** Flavor order (SnR left, Normal center, Nightcore right) + active pill. */
private val flavorOrder: List<Pair<AudioMode, Color>> = listOf(
    AudioMode.SNR to Color(0xFF3B82F6),
    AudioMode.NORMAL to Color.White,
    AudioMode.NIGHTCORE to Color(0xFF8B5CF6),
)

@Composable
private fun NightcoreSegment(
    label: String,
    selected: Boolean,
    activeColor: Color,
    onClick: (() -> Unit)?,
    description: String,
    modifier: Modifier = Modifier,
) {
    val colors = FreqTheme.colors
    // Smooth cross-fade between transparent and the flavor color (white /
    // blue / purple); text follows white-on-color vs dark-on-white.
    // No glow — flat contrast only.
    val pillColor by animateColorAsState(
        targetValue = if (selected) activeColor else Color.Transparent,
        animationSpec = tween(durationMillis = FLAVOR_FADE_MS),
        label = "flavorPill",
    )
    val textColor by animateColorAsState(
        targetValue = when {
            !selected -> colors.textSecondary
            activeColor == Color.White -> colors.onAccent
            else -> Color.White
        },
        animationSpec = tween(durationMillis = FLAVOR_FADE_MS),
        label = "flavorText",
    )
    Box(
        modifier = modifier
            .clip(FreqShapes.pill)
            .background(pillColor, FreqShapes.pill)
            .then(
                if (onClick != null) {
                    Modifier.clickable(
                        role = Role.Button,
                        indication = ripple(),
                        interactionSource = remember { MutableInteractionSource() },
                        onClickLabel = description,
                        onClick = onClick,
                    )
                } else {
                    Modifier.semantics { contentDescription = "$label, selected" }
                },
            )
            .padding(vertical = FreqSpacing.xs),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            style = Typography.labelMedium,
            color = textColor,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

/** Flavor pill cross-fade duration (ms). */
const val FLAVOR_FADE_MS = 300

/**
 * Small end utility button (shuffle / repeat). Fully transparent — no
 * circle, no wash, no glow. Active state is just the brighter icon
 * (white on, muted off); static, no animation.
 */
@Composable
private fun TransportUtilityButton(
    imageVector: ImageVector,
    contentDescription: String,
    onClick: () -> Unit,
    isActive: Boolean = false,
) {
    val colors = FreqTheme.colors
    // No background in either state — the icon alone carries on/off.
    Box(
        modifier = Modifier
            .size(48.dp)
            .clip(FreqShapes.circle)
            .clickable(
                role = Role.Button,
                indication = ripple(),
                interactionSource = remember { MutableInteractionSource() },
                onClickLabel = contentDescription,
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = imageVector,
            contentDescription = contentDescription,
            tint = if (isActive) colors.textPrimary else colors.textSecondary,
            modifier = Modifier.size(22.dp),
        )
    }
}

/**
 * Skip button (previous / next). Transparent over the bar glass with a
 * white symbol — no per-button glass, no glow halo, no animation.
 */
@Composable
private fun TransportSkipButton(
    imageVector: ImageVector,
    contentDescription: String,
    onClick: () -> Unit,
    buttonSize: Dp = 60.dp,
    iconSize: Dp = 32.dp,
) {
    Box(
        modifier = Modifier
            .size(buttonSize)
            .clip(FreqShapes.circle)
            .clickable(
                role = Role.Button,
                indication = ripple(),
                interactionSource = remember { MutableInteractionSource() },
                onClickLabel = contentDescription,
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = imageVector,
            contentDescription = contentDescription,
            tint = Color.White,
            modifier = Modifier.size(iconSize),
        )
    }
}

/**
 * Primary play disc: prismal liquid-glass circle with a crisp symbol —
 * the single high-contrast action in the bar. Swaps instantly, no morph.
 */
@Composable
private fun TransportPlayDisc(
    isPlaying: Boolean,
    isLoading: Boolean,
    onClick: () -> Unit,
    size: Dp = 76.dp,
    iconSize: Dp = 36.dp,
) {
    val playPauseDescription = if (isPlaying) "Pause" else "Play"

    // Solid high-contrast disc: one opaque white circle with a dark
    // symbol. Frosted glass washed out over bright artwork (barely
    // visible), and Prismal lenses SIGSEGV this GPU — flat white is
    // both the most legible and the most stable.
    Box(
        modifier = Modifier
            .size(size)
            .shadow(FreqSpacing.sm, FreqShapes.circle)
            .clip(FreqShapes.circle)
            .background(Color.White)
            .clickable(
                role = Role.Button,
                indication = ripple(),
                interactionSource = remember { MutableInteractionSource() },
                onClickLabel = playPauseDescription,
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                color = PlayDiscInk,
                strokeWidth = 3.dp,
                modifier = Modifier
                    .size(iconSize)
                    .semantics { contentDescription = playPauseDescription },
            )
        } else {
            Icon(
                imageVector = if (isPlaying) PauseIcon else Icons.Default.PlayArrow,
                contentDescription = playPauseDescription,
                tint = PlayDiscInk,
                modifier = Modifier.size(iconSize),
            )
        }
    }
}

/** Dark ink for the symbol on the solid white play disc. */
private val PlayDiscInk: Color = Color(0xFF101218)

/**
 * Monochrome progress: neutral light fill on a dark track, no thumb.
 * Elapsed left and total duration right. Reuses tested seek math/helpers.
 */
@Composable
private fun NowPlayingPhotoSeek(
    positionSeconds: Float,
    durationSeconds: Int,
    onSeek: (Float) -> Unit,
    enabled: Boolean = true,
) {
    val colors = FreqTheme.colors
    var dragging by remember { mutableStateOf(false) }
    var dragPosition by remember { mutableStateOf(0f) }
    val range = 0f..durationSeconds.toFloat().coerceAtLeast(1f)
    val shownPosition = if (dragging) dragPosition else positionSeconds.coerceIn(range)
    val fraction = progressFraction(shownPosition, durationSeconds)

    Column(modifier = Modifier.fillMaxWidth()) {
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxWidth()
                .height(FreqSpacing.touchTargetMin)
                .semantics(mergeDescendants = true) {
                    contentDescription =
                        "Seek, ${formatSeekTime(shownPosition.toInt())} of ${formatSeekTime(durationSeconds)}"
                }
                .progressSemantics(shownPosition, range),
            contentAlignment = Alignment.CenterStart,
        ) {
            val trackHeight = 8.dp
            // Glass timeline: frosted Haze pill as the track bed, neutral
            // light fill and thumb drawn crisply on top.
            FreqGlassSurface(
                tone = FreqGlassTone.Subtle,
                shape = FreqShapes.pill,
                shadow = FreqElevation.none,
                blur = 24.dp,
                glassBackend = FreqGlassBackend.HAZE,
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(trackHeight),
            ) {
            }
            Box(
                modifier = Modifier
                    .fillMaxWidth(fraction)
                    .height(trackHeight)
                    .clip(FreqShapes.pill)
                    .background(colors.textPrimary),
            )
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(FreqSpacing.touchTargetMin)
                    .pointerInput(enabled, durationSeconds) {
                        if (!enabled) return@pointerInput
                        detectTapGestures { tapOffset ->
                            onSeek(
                                seekSecondsFromFraction(
                                    (tapOffset.x / size.width).toFloat(),
                                    durationSeconds,
                                ),
                            )
                        }
                    }
                    .pointerInput(enabled, durationSeconds) {
                        if (!enabled) return@pointerInput
                        var active = false
                        detectHorizontalDragGestures(
                            onDragStart = {
                                active = true
                                dragging = true
                                dragPosition = positionSeconds.coerceIn(range)
                            },
                            onDragCancel = {
                                active = false
                                dragging = false
                            },
                            onDragEnd = {
                                if (active) {
                                    active = false
                                    dragging = false
                                    onSeek(dragPosition)
                                }
                            },
                            onHorizontalDrag = { change, _ ->
                                change.consume()
                                dragPosition = seekSecondsFromFraction(
                                    (change.position.x / size.width).toFloat(),
                                    durationSeconds,
                                )
                            },
                        )
                    },
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                text = formatSeekTime(shownPosition.toInt()),
                style = Typography.labelSmall,
                color = colors.textMuted,
            )
            Text(
                text = formatSeekTime(durationSeconds),
                style = Typography.labelSmall,
                color = colors.textMuted,
            )
        }
    }
}

/**
 * Early-stage Up Next bar pinned to the bottom: artwork, "UP NEXT" caps
 * label, next title/artist, overflow opens the queue. Tapping the bar
 * plays the next track. Always visible so queue access never disappears;
 * honest empty text when nothing is queued.
 */
@Composable
private fun NowPlayingPhotoUpNext(
    nextTrack: MediaTrack?,
    upNextCount: Int,
    onPlayNextClick: () -> Unit,
    onQueueClick: () -> Unit,
) {
    val colors = FreqTheme.colors
    FreqGlassSurface(
        tone = FreqGlassTone.Subtle,
        shape = FreqShapes.cardLarge,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(
                    role = Role.Button,
                    onClickLabel = if (nextTrack != null) {
                        "Play next: ${nextTrack.title}"
                    } else {
                        "Open queue"
                    },
                    onClick = {
                        if (nextTrack != null) onPlayNextClick() else onQueueClick()
                    },
                )
                .padding(FreqSpacing.sm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (nextTrack != null) {
                FreqArtwork(
                    artworkUrl = nextTrack.artworkUrl,
                    colors = nextTrack.gradientColors,
                    shape = FreqShapes.artworkSmall,
                    iconSize = FreqSpacing.iconMd,
                    contentDescription = "Artwork for ${nextTrack.title}",
                    modifier = Modifier.size(FreqSpacing.artworkThumb),
                )
            } else {
                Box(
                    modifier = Modifier
                        .size(FreqSpacing.artworkThumb)
                        .clip(FreqShapes.artworkSmall)
                        .background(colors.surfaceElevated),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = null,
                        tint = colors.textMuted,
                        modifier = Modifier.size(FreqSpacing.iconMd),
                    )
                }
            }
            Spacer(modifier = Modifier.width(FreqSpacing.sm))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = if (upNextCount > 1) "UP NEXT · $upNextCount" else "UP NEXT",
                    style = Typography.labelSmall,
                    color = colors.textMuted,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                )
                if (nextTrack != null) {
                    Text(
                        text = nextTrack.title.ifBlank { "Unknown Title" },
                        style = Typography.titleMedium,
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = nextTrack.artist.ifBlank { "Unknown Artist" },
                        style = Typography.bodySmall,
                        color = colors.textSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                } else {
                    Text(
                        text = "Nothing queued after this track.",
                        style = Typography.bodySmall,
                        color = colors.textSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            Spacer(modifier = Modifier.width(FreqSpacing.xs))
            // Queue entry: list icon opens the queue showing the songs.
            FreqIconButton(
                imageVector = Icons.Default.List,
                contentDescription = "Open queue",
                onClick = onQueueClick,
                iconSize = 22.dp,
            )
        }
    }
}

/**
 * Next track strictly after [currentIndex] (no wrap-around, unlike
 * [com.gresseymusic.wave.player.PlaybackState.nextTrack]). Null when the
 * queue is empty or nothing follows. Pure and unit-tested.
 */
fun nextTrackForNowPlaying(queue: List<MediaTrack>, currentIndex: Int): MediaTrack? {
    if (queue.isEmpty() || currentIndex !in queue.indices) return null
    return queue.getOrNull(currentIndex + 1)
}

/**
 * Count of tracks strictly after [currentIndex]. Pure and unit-tested.
 */
fun upNextCountForNowPlaying(queueSize: Int, currentIndex: Int): Int {
    if (queueSize <= 0 || currentIndex !in 0 until queueSize) return 0
    return (queueSize - currentIndex - 1).coerceAtLeast(0)
}

/**
 * Album context line rule: backend DTO fallbacks ("Single", blank, or an
 * echo of the title) are not real metadata and stay hidden. Pure and
 * unit-tested.
 */
fun shouldShowAlbumContext(album: String?, title: String?): Boolean {
    if (album.isNullOrBlank()) return false
    if (album == "Single") return false
    return album != title
}

/** Screen-reader label for the repeat mode. Pure and unit-tested. */
fun repeatContentDescription(repeatMode: Int): String {
    return when (repeatMode) {
        1 -> "Repeat all"
        2 -> "Repeat one"
        else -> "Repeat off"
    }
}

/** Screen-reader label for shuffle. Pure and unit-tested. */
fun shuffleContentDescription(enabled: Boolean): String {
    return if (enabled) "Shuffle on" else "Shuffle off"
}
