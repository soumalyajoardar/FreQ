package com.gresseymusic.wave.navigation

import androidx.compose.ui.unit.dp
import com.gresseymusic.wave.ui.components.WaveBottomTab
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Mini Player background-recovery navigation (M27.1).
 *
 * The Mini Player body must open Now Playing directly from any route —
 * never Home, never a duplicate — so returning from background always
 * restores visible playback UI while Media3 keeps playing.
 */
class MiniPlayerRecoveryTest {

    @Test
    fun `mini tap opens now playing from every foreground route`() {
        assertTrue(shouldOpenNowPlaying("home", true))
        assertTrue(shouldOpenNowPlaying("search", true))
        assertTrue(shouldOpenNowPlaying("library", true))
        assertTrue(shouldOpenNowPlaying("queue", true))
        assertTrue(shouldOpenNowPlaying("settings", true))
        assertTrue(shouldOpenNowPlaying("album/x", true))
    }

    @Test
    fun `mini tap never leaves now playing or duplicates it`() {
        assertFalse(shouldOpenNowPlaying("now_playing", true))
    }

    @Test
    fun `no navigation without accepted playback state`() {
        assertFalse(shouldOpenNowPlaying("home", false))
        assertFalse(shouldOpenNowPlaying("library", false))
    }

    @Test
    fun `bottom navigation keeps home search library settings destinations`() {
        val routes = WaveBottomTab.entries.map { it.route }
        assertEquals(listOf("home", "search", "library", "settings"), routes)
    }

    @Test
    fun `bottom navigation capsule stays a bounded floating pill`() {
        // Pill must be wide enough for 4x 56dp targets yet bounded so it
        // never renders as a full-width solid bar.
        val maxWidth = com.gresseymusic.wave.ui.components.BottomNavCapsuleMaxWidth
        assertTrue(maxWidth >= 280.dp)
        assertTrue(maxWidth <= 480.dp)
    }
}
