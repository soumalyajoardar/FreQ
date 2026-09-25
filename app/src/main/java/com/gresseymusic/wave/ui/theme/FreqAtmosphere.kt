package com.gresseymusic.wave.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance

/**
 * Artwork atmosphere foundation (M15 Area 7).
 *
 * Artwork colors wash the background as a soft, low-opacity glow; glass UI
 * layers above it. Everything here is restrained by design: two washed
 * colors, a vignette for edge depth, and a contrast scrim behind text.
 */

/** Maximum wash opacity — atmosphere must never overpower content. */
const val ATMOSPHERE_MAX_ALPHA = 0.28f

/**
 * Picks two washed ambient colors from a track's gradient palette.
 * Pure and unit-tested. Falls back to the theme accent wash when the
 * palette is missing or too dark to glow.
 */
fun ambientColorsFor(
    gradientColors: List<Color>,
    fallbackPrimary: Color,
    fallbackSecondary: Color,
): Pair<Color, Color> {
    val usable = gradientColors.filter { it.luminance() > 0.02f }
    if (usable.size < 2) return Pair(fallbackPrimary, fallbackSecondary)
    return Pair(
        usable[0].copy(alpha = ATMOSPHERE_MAX_ALPHA.coerceAtMost(usable[0].alpha)),
        usable[1].copy(alpha = (ATMOSPHERE_MAX_ALPHA * 0.75f).coerceAtMost(usable[1].alpha)),
    )
}

/**
 * Soft diagonal ambient wash from two colors. Remembered by callers via
 * [rememberAmbientWash].
 */
fun ambientWash(primary: Color, secondary: Color, background: Color): Brush {
    return Brush.linearGradient(
        colors = listOf(primary, secondary, background),
        start = Offset(0f, 0f),
        end = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY),
    )
}

@Composable
fun rememberAmbientWash(
    gradientColors: List<Color>,
    colors: FreqColors = FreqTheme.colors,
): Brush {
    val (primary, secondary) = remember(gradientColors) {
        ambientColorsFor(gradientColors, colors.atmospherePrimary, colors.atmosphereSecondary)
    }
    return remember(primary, secondary, colors.background) {
        ambientWash(primary, secondary, colors.background)
    }
}

/** Edge vignette that deepens atmosphere corners without touching content. */
fun vignetteBrush(scrim: Color): Brush {
    return Brush.radialGradient(
        colors = listOf(Color.Transparent, scrim.copy(alpha = scrim.alpha * 0.55f)),
    )
}

/** Readability scrim drawn behind text over artwork. */
fun readabilityScrim(scrim: Color): Brush {
    return Brush.verticalGradient(
        colors = listOf(Color.Transparent, scrim),
    )
}
