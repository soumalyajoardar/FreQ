package com.gresseymusic.wave.ui.theme

import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * FreQ elevation / shadow language (M15).
 *
 * Glass surfaces glow more than they lift: shadows stay soft, dark, and
 * short, with a companion top-highlight supplied by the glass border. Keep
 * radii tight — cinematic depth, not Material plateaus.
 */
object FreqElevation {
    val none: Dp = 0.dp
    val subtle: Dp = 2.dp
    val card: Dp = 8.dp
    val floating: Dp = 16.dp
    val modal: Dp = 24.dp

    /** Shadow opacity per level (applied over a near-black shadow color). */
    const val SHADOW_ALPHA_SUBTLE = 0.25f
    const val SHADOW_ALPHA_CARD = 0.35f
    const val SHADOW_ALPHA_FLOATING = 0.45f
    const val SHADOW_ALPHA_MODAL = 0.55f
}
