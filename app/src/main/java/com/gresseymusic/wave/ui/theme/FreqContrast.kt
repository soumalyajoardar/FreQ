package com.gresseymusic.wave.ui.theme

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance

/**
 * WCAG-conscious contrast helpers (M15 Area 3/19).
 *
 * Relative luminance follows the WCAG definition; [contrastRatio] returns
 * the (L1 + 0.05) / (L2 + 0.05) ratio. Pure and unit-tested: every FreQ
 * text role must clear AA (4.5) against its theme background.
 */
fun relativeLuminance(color: Color): Double {
    fun channel(c: Float): Double {
        val v = c.toDouble()
        return if (v <= 0.03928) v / 12.92 else Math.pow((v + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * channel(color.red) +
        0.7152 * channel(color.green) +
        0.0722 * channel(color.blue)
}

fun contrastRatio(foreground: Color, background: Color): Double {
    val lighter = maxOf(relativeLuminance(foreground), relativeLuminance(background))
    val darker = minOf(relativeLuminance(foreground), relativeLuminance(background))
    return (lighter + 0.05) / (darker + 0.05)
}

/** True when [foreground] on [background] meets WCAG AA normal-text contrast. */
fun meetsTextContrast(foreground: Color, background: Color): Boolean {
    return contrastRatio(foreground, background) >= 4.5
}
