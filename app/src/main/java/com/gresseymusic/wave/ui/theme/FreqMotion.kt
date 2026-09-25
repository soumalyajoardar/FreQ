package com.gresseymusic.wave.ui.theme

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.Easing
import androidx.compose.animation.core.FastOutSlowInEasing

/**
 * FreQ motion language (M15). Fluid and subtle: ease in/out everywhere,
 * short durations, nothing bouncy, nothing decorative.
 */
object FreqMotion {
    /** Press / selection feedback. */
    const val PRESS_MS = 120

    /** Appearing / disappearing content. */
    const val FADE_MS = 180

    /** Sheet presentation, artwork transitions, mini-player morphs. */
    const val MORPH_MS = 260

    /** Crossfade between artwork images. */
    const val ARTWORK_FADE_MS = 220

    /**
     * Spatial enter/exit travel (M27.3): rise/settle, shared-axis moves,
     * coordinated entrances. Paired with translate + subtle scale, never
     * fade-only, never bounce.
     */
    const val ENTER_MS = 200

    val standard: Easing = FastOutSlowInEasing
    val emphasize: Easing = CubicBezierEasing(0.2f, 0.0f, 0.0f, 1.0f)
    val decelerate: Easing = CubicBezierEasing(0.0f, 0.0f, 0.2f, 1.0f)
}
