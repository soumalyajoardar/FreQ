package com.gresseymusic.wave.ui.theme

import org.junit.Assert.*
import org.junit.Test

/**
 * WCAG contrast regression tests (M15 Areas 3, 19). FreQ is dark-only:
 * every text role must meet AA (4.5) on the dark background; accents
 * and functional hues used for graphics/large text must meet 3.0.
 */
class FreqContrastTest {

    @Test
    fun `dark text roles meet AA on background`() {
        val c = DarkFreqColors
        assertContrastAtLeast("dark textPrimary", c.textPrimary, c.background, 4.5)
        assertContrastAtLeast("dark textSecondary", c.textSecondary, c.background, 4.5)
        assertContrastAtLeast("dark textMuted", c.textMuted, c.background, 4.5)
    }

    @Test
    fun `icon roles meet AA`() {
        assertContrastAtLeast("dark iconPrimary", DarkFreqColors.iconPrimary, DarkFreqColors.background, 4.5)
        assertContrastAtLeast("dark iconSecondary", DarkFreqColors.iconSecondary, DarkFreqColors.background, 4.5)
    }

    @Test
    fun `functional hues stay legible`() {
        assertContrastAtLeast("dark error", DarkFreqColors.error, DarkFreqColors.background, 4.5)
        assertContrastAtLeast("dark success", DarkFreqColors.success, DarkFreqColors.background, 4.5)
        assertContrastAtLeast("dark warning", DarkFreqColors.warning, DarkFreqColors.background, 3.0)
    }

    @Test
    fun `accents meet non-text contrast`() {
        listOf(
            "dark accentPrimary" to (DarkFreqColors.accentPrimary to DarkFreqColors.background),
            "dark accentSecondary" to (DarkFreqColors.accentSecondary to DarkFreqColors.background),
            "dark accentTertiary" to (DarkFreqColors.accentTertiary to DarkFreqColors.background),
            "dark accentPink" to (DarkFreqColors.accentPink to DarkFreqColors.background),
        ).forEach { (name, pair) ->
            assertContrastAtLeast(name, pair.first, pair.second, 3.0)
        }
    }

    @Test
    fun `on-accent text is readable on primary gradient ends`() {
        // Button labels sit on the accent gradient; both ends must clear AA.
        val dark = DarkFreqColors
        assertContrastAtLeast("dark onAccent/primary", dark.onAccent, dark.accentPrimary, 4.5)
        assertContrastAtLeast("dark onAccent/secondary", dark.onAccent, dark.accentSecondary, 3.0)
    }

    private fun assertContrastAtLeast(
        name: String,
        foreground: androidx.compose.ui.graphics.Color,
        background: androidx.compose.ui.graphics.Color,
        minimum: Double,
    ) {
        val ratio = contrastRatio(foreground, background)
        assertTrue("$name contrast $ratio below $minimum", ratio >= minimum)
    }
}
