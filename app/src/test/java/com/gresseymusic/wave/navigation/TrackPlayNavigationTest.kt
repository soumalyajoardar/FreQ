package com.gresseymusic.wave.navigation

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * M27 track-tap → Now Playing navigation guard. Navigation fires exactly
 * once from an explicit tap after PlaybackManager acceptance, never from
 * state observers, never duplicating or looping.
 */
class TrackPlayNavigationTest {

    @Test
    fun `opens from home search library and details`() {
        assertTrue(shouldOpenNowPlaying("home", true))
        assertTrue(shouldOpenNowPlaying("search", true))
        assertTrue(shouldOpenNowPlaying("library", true))
        assertTrue(shouldOpenNowPlaying("album/1", true))
        assertTrue(shouldOpenNowPlaying("artist/1", true))
        assertTrue(shouldOpenNowPlaying("playlist/1", true))
        assertTrue(shouldOpenNowPlaying("user_playlist/1", true))
        assertTrue(shouldOpenNowPlaying("queue", true))
        assertTrue(shouldOpenNowPlaying(null, true))
    }

    @Test
    fun `never navigates before playback accepted`() {
        assertFalse(shouldOpenNowPlaying("home", false))
        assertFalse(shouldOpenNowPlaying("search", false))
        assertFalse(shouldOpenNowPlaying(null, false))
    }

    @Test
    fun `never duplicates when already on now playing`() {
        assertFalse(shouldOpenNowPlaying("now_playing", true))
        assertFalse(shouldOpenNowPlaying("now_playing", false))
    }
}
