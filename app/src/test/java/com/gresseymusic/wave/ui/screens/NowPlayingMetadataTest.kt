package com.gresseymusic.wave.ui.screens

import org.junit.Assert.*
import org.junit.Test

/**
 * Now Playing metadata/a11y rule tests (M16). The album-context line hides
 * backend placeholder defaults, and control labels stay meaningful.
 */
class NowPlayingMetadataTest {

    @Test
    fun `real album shows context`() {
        assertTrue(shouldShowAlbumContext("WHEN WE ALL FALL ASLEEP", "bad guy"))
    }

    @Test
    fun `blank album hides context`() {
        assertFalse(shouldShowAlbumContext("", "Song"))
        assertFalse(shouldShowAlbumContext("   ", "Song"))
        assertFalse(shouldShowAlbumContext(null, "Song"))
    }

    @Test
    fun `single placeholder hides context`() {
        // "Single" is a DTO fallback, not real metadata.
        assertFalse(shouldShowAlbumContext("Single", "Song"))
    }

    @Test
    fun `album echoing title hides context`() {
        assertFalse(shouldShowAlbumContext("Midnight", "Midnight"))
    }

    @Test
    fun `repeat descriptions cover all modes`() {
        assertEquals("Repeat off", repeatContentDescription(0))
        assertEquals("Repeat all", repeatContentDescription(1))
        assertEquals("Repeat one", repeatContentDescription(2))
        assertEquals("Repeat off", repeatContentDescription(99))
    }

    @Test
    fun `shuffle descriptions cover both states`() {
        assertEquals("Shuffle on", shuffleContentDescription(true))
        assertEquals("Shuffle off", shuffleContentDescription(false))
    }
}
