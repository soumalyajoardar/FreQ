package com.gresseymusic.wave.ui.components

import androidx.compose.ui.unit.dp
import com.gresseymusic.wave.ui.theme.FreqSpacing
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Mini Player three-control layout budget (M27.2).
 *
 * Previous / Play-Pause / Next are fixed 44dp targets beside 48dp artwork;
 * only the text column flexes (weight + ellipsis). This pins the arithmetic
 * so the Next button can never be pushed off-screen, even at 320dp width.
 */
class MiniPlayerLayoutM272Test {

    @Test
    fun `all three controls meet 44dp touch targets`() {
        assertTrue(FreqSpacing.touchTargetDense >= 44.dp)
    }

    @Test
    fun `fixed chrome fits narrow 320dp screens with text room to spare`() {
        val artwork = FreqSpacing.artworkThumb.value
        val controls = 3 * FreqSpacing.touchTargetDense.value
        val gaps = 4 * FreqSpacing.xs.value
        val innerPadding = 2 * FreqSpacing.sm.value
        val outerGutter = 2 * FreqSpacing.md.value
        val fixedTotal = artwork + controls + gaps + innerPadding + outerGutter
        // 320dp device must leave >= 48dp for the ellipsized text column.
        assertTrue(fixedTotal <= 320f - 48f)
    }
}
