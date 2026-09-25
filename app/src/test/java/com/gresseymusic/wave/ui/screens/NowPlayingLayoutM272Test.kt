package com.gresseymusic.wave.ui.screens

import androidx.compose.ui.unit.dp
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Now Playing fixed-layout responsive rules (M27.2).
 *
 * The hero artwork is near full-bleed (fraction 0.88, caps 300/200dp)
 * with title, seek, controls and utilities aligned to its edges, so the
 * non-scrollable composition fits on normal and short screens.
 */
class NowPlayingLayoutM272Test {

    @Test
    fun `artwork fraction sits in the 86 to 90 percent band`() {
        assertTrue(NOW_PLAYING_ARTWORK_FRACTION in 0.86f..0.90f)
    }

    @Test
    fun `artwork caps shrink on short screens`() {
        assertEquals(300.dp, nowPlayingArtworkCapDp(shortScreen = false))
        assertEquals(200.dp, nowPlayingArtworkCapDp(shortScreen = true))
        assertTrue(nowPlayingArtworkCapDp(true) < nowPlayingArtworkCapDp(false))
    }

    @Test
    fun `bottom clearance clears the gesture area responsively`() {
        // 24–32dp above the navigation-bar inset on every viewport.
        assertEquals(32.dp, nowPlayingBottomClearanceDp(shortScreen = false))
        assertEquals(24.dp, nowPlayingBottomClearanceDp(shortScreen = true))
        assertTrue(nowPlayingBottomClearanceDp(false) in 24.dp..32.dp)
        assertTrue(nowPlayingBottomClearanceDp(true) in 24.dp..32.dp)
    }
}
