package com.gresseymusic.wave.ui.components

import org.junit.Assert.*
import org.junit.Test

/**
 * Now Playing display-logic tests (M16). Pure progress math, time labels,
 * and metadata-visibility rules — the visual layer pins these so the
 * redesign cannot silently change seek behavior.
 */
class NowPlayingLogicTest {

    @Test
    fun `fraction spans zero to one`() {
        assertEquals(0f, progressFraction(0f, 200), 0f)
        assertEquals(0.5f, progressFraction(100f, 200), 0.0001f)
        assertEquals(1f, progressFraction(200f, 200), 0f)
    }

    @Test
    fun `fraction clamps out-of-range positions`() {
        assertEquals(0f, progressFraction(-5f, 200), 0f)
        assertEquals(1f, progressFraction(999f, 200), 0f)
    }

    @Test
    fun `fraction guards unknown durations and NaN`() {
        assertEquals(0f, progressFraction(10f, 0), 0f)
        assertEquals(0f, progressFraction(10f, -3), 0f)
        assertEquals(0f, progressFraction(Float.NaN, 200), 0f)
    }

    @Test
    fun `seek maps fractions to seconds`() {
        assertEquals(0f, seekSecondsFromFraction(0f, 200), 0f)
        assertEquals(100f, seekSecondsFromFraction(0.5f, 200), 0.001f)
        assertEquals(200f, seekSecondsFromFraction(1f, 200), 0f)
    }

    @Test
    fun `seek clamps fractions and guards`() {
        assertEquals(0f, seekSecondsFromFraction(-0.2f, 200), 0f)
        assertEquals(200f, seekSecondsFromFraction(1.5f, 200), 0f)
        assertEquals(0f, seekSecondsFromFraction(0.5f, 0), 0f)
        assertEquals(0f, seekSecondsFromFraction(Float.NaN, 200), 0f)
    }

    @Test
    fun `fraction and seek round-trip`() {
        val duration = 194
        listOf(0f, 12.5f, 97f, 193.9f).forEach { position ->
            val roundTripped = seekSecondsFromFraction(progressFraction(position, duration), duration)
            assertEquals(position, roundTripped, 0.001f)
        }
    }

    @Test
    fun `time labels format minutes and seconds`() {
        assertEquals("0:00", formatSeekTime(0))
        assertEquals("0:05", formatSeekTime(5))
        assertEquals("3:14", formatSeekTime(194))
        assertEquals("10:00", formatSeekTime(600))
        assertEquals("0:00", formatSeekTime(-9))
    }
}
