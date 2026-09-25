package com.gresseymusic.wave.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.Icons
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.Dp
import coil.compose.SubcomposeAsyncImage
import coil.compose.SubcomposeAsyncImageContent
import com.gresseymusic.wave.ui.components.ArtPlaceholder
import com.gresseymusic.wave.ui.components.FreqArtwork
import com.gresseymusic.wave.ui.components.FreqArtworkPlayBadge
import com.gresseymusic.wave.ui.components.FreqBackground
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.theme.FreqSpacing
import com.gresseymusic.wave.ui.theme.FreqTheme












/**
 * Time-of-day background photo (M28j): morning scene for "Good morning",
 * bright day for afternoon, sunset for evening, night sky for night —
 * matching the greeting ranges. Pure and unit-tested.
 */
fun backgroundResForHour(hour: Int): Int {
    return when (hour.coerceIn(0, 23)) {
        in 5..11 -> com.gresseymusic.wave.R.drawable.app_background_morning
        in 12..17 -> com.gresseymusic.wave.R.drawable.app_background_afternoon
        in 18..22 -> com.gresseymusic.wave.R.drawable.app_background_evening
        else -> com.gresseymusic.wave.R.drawable.app_background_night
    }
}

/** Background photo tint (20% dark veil for legibility). */
const val BACKGROUND_TINT_ALPHA = 0.6f

/**
 * FreQ artwork container (M15 Area 12). Coil image with the standard
 * gradient fallback, a hairline glass border, and artwork-geometry radii.
 * The decode is automatically sized to the layout by Coil; the same URL
 * served at multiple sizes shares the disk cache.
 */
@Composable
fun FreqArtwork(
    artworkUrl: String?,
    colors: List<Color>,
    modifier: Modifier = Modifier,
    shape: Shape = FreqShapes.artwork,
    iconSize: Dp = FreqSpacing.iconLg,
    contentDescription: String? = null,
) {
    val theme = FreqTheme.colors
    if (artworkUrl.isNullOrBlank()) {
        ArtPlaceholder(
            colors = colors,
            modifier = modifier,
            shape = shape,
            iconSize = iconSize,
        )
        return
    }
    Box(
        modifier = modifier
            .clip(shape),
    ) {
        SubcomposeAsyncImage(
            model = artworkUrl,
            contentDescription = contentDescription,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
            loading = {
                ArtPlaceholder(
                    colors = colors,
                    modifier = Modifier.fillMaxSize(),
                    shape = shape,
                    iconSize = iconSize,
                )
            },
            error = {
                ArtPlaceholder(
                    colors = colors,
                    modifier = Modifier.fillMaxSize(),
                    shape = shape,
                    iconSize = iconSize,
                )
            },
            success = { SubcomposeAsyncImageContent() },
        )
    }
}

/**
 * FreQ app background.
 *
 * When [showPhoto] is true (everywhere except the player screen, which
 * owns its artwork atmosphere): the time-of-day scene
 * ([backgroundResForHour]) fills the screen under a flat 20% dark tint.
 * When false: the legacy deep theme gradient + accent wash. Glass content
 * layers above it either way. Cheap by design: one static image decoded
 * once from resources — no per-frame work.
 */
@Composable
fun FreqBackground(
    modifier: Modifier = Modifier,
    showPhoto: Boolean = true,
    content: @Composable () -> Unit,
) {
    val colors = FreqTheme.colors
    Box(
        modifier = modifier.background(colors.background),
    ) {
        if (showPhoto) {
            // Time-of-day scene (M28j) under a flat 20% dark tint: the
            // photo carries the mood, the veil keeps text legible.
            Image(
                painter = painterResource(id = backgroundResForHour(java.time.LocalTime.now().hour)),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFF090A0F).copy(alpha = BACKGROUND_TINT_ALPHA)),
            )
        } else {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                colors.backgroundElevated,
                                colors.background,
                                colors.background,
                            ),
                        ),
                    ),
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.linearGradient(
                            colors = listOf(
                                colors.atmospherePrimary,
                                colors.atmosphereSecondary,
                                Color.Transparent,
                            ),
                        ),
                    ),
            )
        }
        content()
    }
}

/** Square play-badge overlay used on artwork cards. */
@Composable
fun FreqArtworkPlayBadge(
    modifier: Modifier = Modifier,
    iconSize: Dp = FreqSpacing.iconSm,
) {
    val colors = FreqTheme.colors
    Box(
        modifier = modifier
            .size(FreqSpacing.xl)
            .clip(FreqShapes.circle)
            .background(colors.scrim),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = Icons.Default.PlayArrow,
            contentDescription = "Play",
            tint = colors.textPrimary,
            modifier = Modifier.size(iconSize),
        )
    }
}