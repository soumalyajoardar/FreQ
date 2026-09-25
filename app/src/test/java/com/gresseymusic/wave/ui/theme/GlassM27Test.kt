package com.gresseymusic.wave.ui.theme

import androidx.compose.ui.unit.dp
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * M27 glass/material guards: floating surfaces stay translucent (never
 * opaque black), hierarchy ordering holds, touch targets meet 44dp.
 */
class GlassM27Test {

    @Test
    fun `floating glass is translucent never opaque`() {
        val darkFloating = glassStyleFor(FreqGlassTone.Floating, DarkFreqColors)
        // M27.4: true floating glass is more transparent (~0.60 alpha)
        // but maintains readability via border/highlight contrast.
        assertTrue(darkFloating.fill.alpha < 1.0f)
        assertTrue(darkFloating.fill.alpha in 0.50f..0.75f)
    }

    @Test
    fun `glass hierarchy ordering holds`() {
        val subtle = glassStyleFor(FreqGlassTone.Subtle, DarkFreqColors)
        val standard = glassStyleFor(FreqGlassTone.Standard, DarkFreqColors)
        val strong = glassStyleFor(FreqGlassTone.Strong, DarkFreqColors)
        assertTrue(subtle.fill.alpha < standard.fill.alpha)
        assertTrue(standard.fill.alpha <= strong.fill.alpha)
    }

    @Test
    fun `mini player touch targets meet 44dp`() {
        assertTrue(FreqSpacing.touchTargetDense >= 44.dp)
        assertTrue(FreqSpacing.touchTargetMin >= 44.dp)
        assertTrue(FreqSpacing.artworkThumb >= 44.dp)
    }

    @Test
    fun `motion tokens stay coherent and fast`() {
        assertTrue(FreqMotion.PRESS_MS <= 150)
        assertTrue(FreqMotion.FADE_MS <= 200)
        assertTrue(FreqMotion.MORPH_MS <= 300)
        assertTrue(FreqMotion.ARTWORK_FADE_MS <= 300)
        // M27.3 spatial enter token: inside the 120–300ms motion budget.
        assertTrue(FreqMotion.ENTER_MS in 120..300)
    }
}
