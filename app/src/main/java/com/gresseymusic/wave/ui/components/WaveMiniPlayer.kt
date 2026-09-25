package com.gresseymusic.wave.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.basicMarquee
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.ripple
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlin.math.abs
import kotlinx.coroutines.launch
import com.gresseymusic.wave.player.LocalPlaybackManager
import com.gresseymusic.wave.ui.theme.FreqElevation
import com.gresseymusic.wave.ui.theme.FreqGlassTone
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.components.FreqGlassBackend
import com.gresseymusic.wave.ui.theme.FreqSpacing
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.Typography
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map


private val PauseIconMini: ImageVector = ImageVector.Builder(
    name = "PauseMini",
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

private val PreviousIconMini: ImageVector = ImageVector.Builder(
    name = "PreviousMini",
    defaultWidth = 24.dp,
    defaultHeight = 24.dp,
    viewportWidth = 24f,
    viewportHeight = 24f,
).apply {
    path(fill = SolidColor(Color.White)) {
        moveTo(6f, 6f)
        horizontalLineToRelative(2f)
        verticalLineToRelative(12f)
        horizontalLineTo(6f)
        close()
        moveTo(9.5f, 12f)
        lineTo(18f, 18f)
        verticalLineTo(6f)
        close()
    }
}.build()

private val NextIconMini: ImageVector = ImageVector.Builder(
    name = "NextMini",
    defaultWidth = 24.dp,
    defaultHeight = 24.dp,
    viewportWidth = 24f,
    viewportHeight = 24f,
).apply {
    path(fill = SolidColor(Color.White)) {
        moveTo(6f, 18f)
        lineToRelative(8.5f, -6f)
        lineTo(6f, 6f)
        verticalLineToRelative(12f)
        close()
        moveTo(16f, 6f)
        verticalLineToRelative(12f)
        horizontalLineToRelative(2f)
        verticalLineTo(6f)
        horizontalLineToRelative(-2f)
        close()
    }
}.build()

/**
 * M27 mini player: floating rectangular glass card with a slight smooth
 * edge (never opaque black, never a pill), artwork + title/artist +
 * previous/play/next, neutral progress hairline. Compact: 44dp+ targets,
 * artwork/title never clipped, three controls always preserved with
 * adaptive spacing on small screens.
 *
 * No entrance/crossfade animations — content swaps instantly. The only
 * motion is the swipe-to-dismiss slide, rendered on the GPU layer.
 */
@Composable
fun WaveMiniPlayer(
    modifier: Modifier = Modifier,
    songTitle: String = "Atmospheric Echoes",
    artistName: String = "WAVE Soundscapes",
    artworkUrl: String? = null,
    gradientColors: List<Color> = emptyList(),
    isPlaying: Boolean = false,
    isLoading: Boolean = false,
    onPlayPauseClick: () -> Unit = {},
    onPreviousClick: () -> Unit = {},
    onNextClick: () -> Unit = {},
    onMiniPlayerClick: () -> Unit = {},
    onSwipeToStop: () -> Unit = {},
) {
    val colors = FreqTheme.colors
    // Progress hairline: collected narrowly inside the mini player so the
    // 2Hz ticker recomposes only this small surface, never the app shell.
    // Quantized to 0.5% steps to skip no-op emissions.
    val playbackManager = LocalPlaybackManager.current
    val progressFraction by remember(playbackManager) {
        playbackManager.state.map { state ->
            val duration = state.currentTrack?.durationSeconds ?: 0
            if (duration <= 0) 0f
            else ((state.progressSeconds / duration * 200).toInt() / 200f).coerceIn(0f, 1f)
        }.distinctUntilChanged()
    }.collectAsState(initial = 0f)

    // M27.6: width is constrained by the parent (centered fraction of the
    // screen), so this surface simply fills what the parent offers.
    // Rectangular floating card with a slight smooth edge.
    // Horizontal swipe anywhere on the body slides the card out toward
    // the swipe direction while fading, then stops playback completely;
    // taps still open Now Playing. Short swipes snap back.
    val density = LocalDensity.current
    val swipeThresholdPx = remember(density) { with(density) { 48.dp.toPx() } }
    // Drag offset is plain synchronous state: pointer moves write it
    // directly with zero coroutine dispatch. The Animatable only runs the
    // release settle (snap-back or fling off-screen), so a fast swipe
    // never queues dozens of snapTo coroutines — launches happen once
    // per gesture (start/cancel/end), never per move event.
    var dragDx by remember { mutableFloatStateOf(0f) }
    val settleX = remember { Animatable(0f) }
    val settleScope = rememberCoroutineScope()
    // Fresh track reuses this composable — snap any stale slide back.
    LaunchedEffect(songTitle, artworkUrl) {
        dragDx = 0f
        settleX.snapTo(0f)
    }
    // GPU-layer slide + fade driven by the drag offset: 1f at rest, 0f
    // once fully off-screen.
    val totalSlideX = dragDx + settleX.value
    val dismissAlpha = (1f - (abs(totalSlideX) / DISMISS_TRAVEL_PX)).coerceIn(0f, 1f)
    FreqGlassSurface(
        modifier = modifier
            .fillMaxWidth()
            .graphicsLayer {
                translationX = totalSlideX
                alpha = dismissAlpha
            }
            .pointerInput(onSwipeToStop, swipeThresholdPx) {
                detectHorizontalDragGestures(
                    onDragStart = { settleScope.launch { settleX.stop() } },
                    onDragCancel = {
                        // Read live state here: pointerInput lambdas
                        // outlive the composition that created them.
                        settleScope.launch {
                            settleX.snapTo(dragDx + settleX.value)
                            dragDx = 0f
                            settleX.animateTo(0f, tween(150))
                        }
                    },
                    onDragEnd = {
                        // Hand the live drag distance to the settle
                        // animator, then fling off-screen in the swipe
                        // direction (and stop) or spring back.
                        settleScope.launch {
                            val total = dragDx + settleX.value
                            settleX.snapTo(total)
                            dragDx = 0f
                            if (abs(total) >= swipeThresholdPx) {
                                val direction = if (total > 0f) 1f else -1f
                                settleX.animateTo(
                                    direction * DISMISS_TRAVEL_PX,
                                    tween(180),
                                )
                                onSwipeToStop()
                            } else {
                                settleX.animateTo(0f, tween(150))
                            }
                        }
                    },
                    onHorizontalDrag = { change, dragAmount ->
                        change.consume()
                        dragDx += dragAmount
                    },
                )
            }
            .clickable(
                role = Role.Button,
                indication = ripple(),
                interactionSource = remember { MutableInteractionSource() },
                onClickLabel = "Open Now Playing",
                onClick = onMiniPlayerClick,
            )
            .padding(horizontal = FreqSpacing.xs, vertical = FreqSpacing.xs),
        tone = FreqGlassTone.Floating,
        shape = FreqShapes.playerCard,
        glassBackend = FreqGlassBackend.PRISMAL,
    ) {
        // M27.2: fillMaxWidth bounds the weight(1f) text column so long
        // titles ellipsize instead of pushing the fixed 44dp Previous /
        // Play / Next controls off-screen. Artwork + 3 controls are fixed;
        // only the text flexes.
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(
                    horizontal = FreqSpacing.sm,
                    vertical = FreqSpacing.sm,
                ),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(FreqSpacing.xs),
        ) {
            // Thumbnail artwork: 44dp leaves the maximum room for the
            // title/artist column on narrow screens. Swaps instantly.
            FreqArtwork(
                artworkUrl = artworkUrl,
                colors = gradientColors.ifEmpty {
                    listOf(colors.textSecondary, colors.textMuted)
                },
                shape = FreqShapes.artwork,
                iconSize = FreqSpacing.iconMd,
                contentDescription = "Current track artwork",
                modifier = Modifier.size(44.dp),
            )

            // Song Title & Artist Name: flexible column that takes every
            // dp the fixed artwork + controls leave behind. Long names
            // marquee-scroll instead of hard-cutting, so nothing is ever
            // lost to ellipsis (ellipsis stays as the static fallback).
            Column(
                modifier = Modifier
                    .weight(1f, fill = true)
                    .padding(end = FreqSpacing.xs),
            ) {
                Text(
                    text = songTitle,
                    color = colors.textPrimary,
                    style = Typography.titleMedium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    softWrap = false,
                    modifier = Modifier.basicMarquee(),
                )
                Spacer(modifier = Modifier.height(FreqSpacing.xxs))
                Text(
                    text = artistName,
                    color = colors.textSecondary,
                    style = Typography.bodySmall,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    softWrap = false,
                    modifier = Modifier.basicMarquee(),
                )
            }

            // Previous / Play-Pause / Next: 44dp+ targets, all visible glass
            // circles. Symbols sit inside tangible buttons — no bare icons.
            FreqGlassSurface(
                modifier = Modifier
                    .size(FreqSpacing.touchTargetDense)
                    .clip(FreqShapes.circle)
                    .clickable(
                        role = Role.Button,
                        indication = ripple(),
                        interactionSource = remember { MutableInteractionSource() },
                        onClickLabel = "Previous track",
                        onClick = onPreviousClick,
                    ),
                tone = FreqGlassTone.Floating,
                shape = FreqShapes.circle,
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = PreviousIconMini,
                    contentDescription = "Previous track",
                    tint = colors.textPrimary,
                    modifier = Modifier.size(22.dp),
                )
            }
            // M27.6: play disc is a frosted-glass circle (HAZE, never
            // Prismal — small Prismal capsules SIGSEGV the RenderThread on
            // some GPUs). Symbol inside a tangible button, never cyan.
            FreqGlassSurface(
                modifier = Modifier
                    .size(FreqSpacing.touchTargetDense)
                    .clip(FreqShapes.circle)
                    .clickable(
                        role = Role.Button,
                        indication = ripple(),
                        interactionSource = remember { MutableInteractionSource() },
                        onClickLabel = if (isPlaying) "Pause" else "Play",
                        onClick = onPlayPauseClick,
                    ),
                tone = FreqGlassTone.Floating,
                shape = FreqShapes.circle,
                contentAlignment = Alignment.Center,
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        color = colors.textPrimary,
                        strokeWidth = 2.5.dp,
                        modifier = Modifier
                            .size(22.dp)
                            .semantics { contentDescription = "Loading" },
                    )
                } else {
                    FreqPlayPauseIcon(
                        isPlaying = isPlaying,
                        pauseIcon = PauseIconMini,
                        tint = colors.textPrimary,
                        iconSize = 22.dp,
                        contentDescription = if (isPlaying) "Pause" else "Play",
                    )
                }
            }
            FreqGlassSurface(
                modifier = Modifier
                    .size(FreqSpacing.touchTargetDense)
                    .clip(FreqShapes.circle)
                    .clickable(
                        role = Role.Button,
                        indication = ripple(),
                        interactionSource = remember { MutableInteractionSource() },
                        onClickLabel = "Next track",
                        onClick = onNextClick,
                    ),
                tone = FreqGlassTone.Floating,
                shape = FreqShapes.circle,
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = NextIconMini,
                    contentDescription = "Next track",
                    tint = colors.textPrimary,
                    modifier = Modifier.size(22.dp),
                )
            }
        }

        // Neutral progress hairline (never blue gradient).
        Box(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .fillMaxWidth()
                .padding(horizontal = FreqSpacing.md),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(progressFraction)
                    .height(2.dp)
                    .clip(FreqShapes.pill)
                    .background(colors.textPrimary.copy(alpha = 0.85f)),
            )
        }
    }
}

/**
 * Off-screen travel (px) for the swipe-to-dismiss slide. The card fades
 * proportionally over this distance, so it vanishes exactly as it exits.
 */
const val DISMISS_TRAVEL_PX = 1000f
