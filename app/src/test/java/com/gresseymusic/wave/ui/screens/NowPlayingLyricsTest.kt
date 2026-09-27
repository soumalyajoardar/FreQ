package com.gresseymusic.wave.ui.screens

import com.gresseymusic.wave.data.model.SyncedLyricLine
import com.gresseymusic.wave.player.isSameTrackSelected
import org.junit.Assert.*
import org.junit.Test

class NowPlayingLyricsTest {

    private val synced = listOf(
        SyncedLyricLine(timeMs = 10_000L, text = "First"),
        SyncedLyricLine(timeMs = 20_000L, text = "Second"),
        SyncedLyricLine(timeMs = 30_000L, text = "Third"),
    )

    @Test
    fun `before first cue yields none`() {
        assertEquals(-1, currentLyricIndex(synced, 0f))
        assertEquals(-1, currentLyricIndex(synced, 9.9f))
    }

    @Test
    fun `cue holds until next cue`() {
        assertEquals(0, currentLyricIndex(synced, 10f))
        assertEquals(0, currentLyricIndex(synced, 19.9f))
        assertEquals(1, currentLyricIndex(synced, 20f))
        assertEquals(2, currentLyricIndex(synced, 99f))
    }

    @Test
    fun `empty and NaN guard`() {
        assertEquals(-1, currentLyricIndex(emptyList(), 15f))
        assertEquals(-1, currentLyricIndex(synced, Float.NaN))
    }

    @Test
    fun `same track tap redirects instead of restarting`() {
        assertTrue(isSameTrackSelected("abc", "abc"))
        assertFalse(isSameTrackSelected("abc", "xyz"))
        assertFalse(isSameTrackSelected(null, "abc"))
        assertFalse(isSameTrackSelected("abc", ""))
    }
}
