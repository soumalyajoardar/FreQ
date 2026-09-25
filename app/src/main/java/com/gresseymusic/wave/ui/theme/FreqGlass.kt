package com.gresseymusic.wave.ui.theme

import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Glass tonal levels (M15). Exactly one concept, four strengths:
 *
 * - [Subtle]: in-list rows, nested containers — barely-there lift.
 * - [Standard]: cards, rails, default glass surface.
 * - [Strong]: headers over artwork, emphasized panels.
 * - [Floating]: mini player, bottom bar, toasts — near-opaque so controls
 *   stay readable over any content.
 *
 * Glass is a *hierarchy*, not a default: structural backgrounds stay solid
 * or atmospheric; only the levels above turn to glass.
 */
enum class FreqGlassTone {
    Subtle,
    Standard,
    Strong,
    Floating,
}

/** Resolved glass recipe for one tone in the active theme. */
@Immutable
data class FreqGlassStyle(
    val fill: Color,
    val border: Color,
    val highlight: Color,
    val borderWidth: Dp = 1.dp,
    /** Soft drop shadow; glass glows rather than lifts. */
    val shadow: Dp = FreqElevation.card,
    val shadowAlpha: Float = FreqElevation.SHADOW_ALPHA_CARD,
)

/**
 * Resolves [tone] against [colors]. Pure — unit-tested for alpha ordering
 * (subtle < standard < strong) and opaque-enough floating surfaces.
 */
fun glassStyleFor(tone: FreqGlassTone, colors: FreqColors): FreqGlassStyle {
    return when (tone) {
        FreqGlassTone.Subtle -> FreqGlassStyle(
            fill = colors.glassSubtle,
            border = colors.glassBorder,
            highlight = colors.glassHighlight,
            shadow = FreqElevation.none,
            shadowAlpha = FreqElevation.SHADOW_ALPHA_SUBTLE,
        )
        FreqGlassTone.Standard -> FreqGlassStyle(
            fill = colors.glassStandard,
            border = colors.glassBorder,
            highlight = colors.glassHighlight,
            shadow = FreqElevation.card,
            shadowAlpha = FreqElevation.SHADOW_ALPHA_CARD,
        )
        FreqGlassTone.Strong -> FreqGlassStyle(
            fill = colors.glassStrong,
            border = colors.glassBorderStrong,
            highlight = colors.glassHighlight,
            shadow = FreqElevation.card,
            shadowAlpha = FreqElevation.SHADOW_ALPHA_CARD,
        )
        FreqGlassTone.Floating -> FreqGlassStyle(
            fill = colors.glassFloating,
            border = colors.glassBorderStrong,
            highlight = colors.glassHighlight,
            shadow = FreqElevation.floating,
            shadowAlpha = FreqElevation.SHADOW_ALPHA_FLOATING,
        )
    }
}
