package com.gresseymusic.wave.ui.theme

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import org.junit.Assert.*
import org.junit.Test

/**
 * Design-token regression tests (M15): glass ordering, responsive
 * breakpoints, and artwork-atmosphere rules.
 */
class FreqTokensTest {

    @Test
    fun `glass fills strengthen monotonically`() {
        val dark = DarkFreqColors
        assertTrue(dark.glassSubtle.alpha < dark.glassStandard.alpha)
        assertTrue(dark.glassStandard.alpha < dark.glassStrong.alpha)
    }

    @Test
    fun `floating glass stays readable over content`() {
        // M27.4: true floating glass is more transparent (~0.60 alpha)
        // but maintains readability via border/highlight contrast.
        assertTrue(DarkFreqColors.glassFloating.alpha in 0.55f..0.70f)
    }

    @Test
    fun `glass styles resolve per tone`() {
        val subtle = glassStyleFor(FreqGlassTone.Subtle, DarkFreqColors)
        val floating = glassStyleFor(FreqGlassTone.Floating, DarkFreqColors)
        assertTrue(subtle.fill.alpha < floating.fill.alpha)
        assertEquals(DarkFreqColors.glassStandard, glassStyleFor(FreqGlassTone.Standard, DarkFreqColors).fill)
    }

    @Test
    fun `responsive breakpoints`() {
        assertEquals(12.dp, FreqResponsive.edgePaddingFor(320))
        assertEquals(12.dp, FreqResponsive.edgePaddingFor(359))
        assertEquals(FreqSpacing.screenEdge, FreqResponsive.edgePaddingFor(360))
        assertEquals(FreqSpacing.screenEdge, FreqResponsive.edgePaddingFor(412))
        assertEquals(120.dp, FreqResponsive.heroArtworkSizeFor(600))
        assertEquals(FreqSpacing.artworkHero, FreqResponsive.heroArtworkSizeFor(640))
        assertEquals(104.dp, FreqResponsive.railCardWidthFor(340))
        assertEquals(FreqSpacing.artworkCard, FreqResponsive.railCardWidthFor(400))
    }

    @Test
    fun `ambient colors fall back without usable palette`() {
        val (primary, secondary) = ambientColorsFor(
            emptyList(),
            DarkFreqColors.atmospherePrimary,
            DarkFreqColors.atmosphereSecondary,
        )
        assertEquals(DarkFreqColors.atmospherePrimary, primary)
        assertEquals(DarkFreqColors.atmosphereSecondary, secondary)
    }

    @Test
    fun `ambient colors wash artwork palette within cap`() {
        val (primary, secondary) = ambientColorsFor(
            listOf(Color(0xFFEC4899), Color(0xFF8B5CF6)),
            DarkFreqColors.atmospherePrimary,
            DarkFreqColors.atmosphereSecondary,
        )
        assertTrue(primary.alpha <= ATMOSPHERE_MAX_ALPHA)
        assertTrue(secondary.alpha <= ATMOSPHERE_MAX_ALPHA)
        assertEquals(Color(0xFFEC4899).red, primary.red, 0.001f)
    }

    @Test
    fun `near-black palette falls back`() {
        val (primary, _) = ambientColorsFor(
            listOf(Color.Black, Color(0xFF050505)),
            DarkFreqColors.atmospherePrimary,
            DarkFreqColors.atmosphereSecondary,
        )
        assertEquals(DarkFreqColors.atmospherePrimary, primary)
    }
}
