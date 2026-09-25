package com.gresseymusic.wave.ui.screens

import com.gresseymusic.wave.ui.components.formatQueueDuration
import com.gresseymusic.wave.ui.theme.DarkFreqColors
import org.junit.Assert.*
import org.junit.Test

/**
 * Queue display-rule tests (M20). Up Next separation, honest counts, and
 * move availability — the presentation rules the redesigned screen pins.
 */
class QueueDisplayTest {

    @Test
    fun `up next is strictly after current`() {
        assertEquals(listOf(1, 2, 3), visibleUpNextIndices(4, 0))
        assertEquals(listOf(3), visibleUpNextIndices(4, 2))
        assertEquals(listOf(2), visibleUpNextIndices(3, 1))
    }

    @Test
    fun `up next empty at end or invalid index`() {
        assertTrue(visibleUpNextIndices(4, 3).isEmpty())
        assertTrue(visibleUpNextIndices(1, 0).isEmpty())
        assertTrue(visibleUpNextIndices(0, 0).isEmpty())
        assertTrue(visibleUpNextIndices(3, -1).isEmpty())
        assertTrue(visibleUpNextIndices(3, 9).isEmpty())
    }

    @Test
    fun `subtitle counts are honest`() {
        assertEquals("Empty", queueSubtitleText(0, 0))
        assertEquals("1 track", queueSubtitleText(1, 0))
        assertEquals("4 tracks", queueSubtitleText(4, 0))
        assertEquals("4 tracks • 3 up next", queueSubtitleText(4, 3))
        assertEquals("2 tracks • 1 up next", queueSubtitleText(2, 1))
    }

    @Test
    fun `move availability follows list edges`() {
        assertEquals(Pair(false, true), moveAvailability(0, 2))
        assertEquals(Pair(true, true), moveAvailability(1, 2))
        assertEquals(Pair(true, false), moveAvailability(2, 2))
        assertEquals(Pair(false, false), moveAvailability(0, 0))
    }

    @Test
    fun `move tint distinguishes disabled state`() {
        assertEquals(DarkFreqColors.textPrimary, queueMenuTint(DarkFreqColors, true))
        assertEquals(DarkFreqColors.textMuted, queueMenuTint(DarkFreqColors, false))
    }

    @Test
    fun `queue duration shows real metadata`() {
        assertEquals("3:42", formatQueueDuration(222))
        assertEquals("2:56", formatQueueDuration(176))
    }

    @Test
    fun `queue duration never fakes unknown as 0-01`() {
        // Watch-continuation metadata decodes to <= 1s; the row must show
        // an honest unknown marker, never a fabricated "0:01".
        assertEquals("--:--", formatQueueDuration(1))
        assertEquals("--:--", formatQueueDuration(0))
        assertEquals("--:--", formatQueueDuration(-5))
    }
}
