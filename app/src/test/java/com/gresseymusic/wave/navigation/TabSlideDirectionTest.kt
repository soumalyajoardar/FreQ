package com.gresseymusic.wave.navigation

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Directional tab slides: later tabs push right-to-left (forward),
 * earlier tabs slide left-to-right (backward).
 */
class TabSlideDirectionTest {

    @Test
    fun `home to search slides forward`() {
        assertTrue(waveSlideForward("home", "search"))
    }

    @Test
    fun `home to library slides forward`() {
        assertTrue(waveSlideForward("home", "library"))
    }

    @Test
    fun `search to library slides forward`() {
        assertTrue(waveSlideForward("search", "library"))
    }

    @Test
    fun `search to home slides backward`() {
        assertFalse(waveSlideForward("search", "home"))
    }

    @Test
    fun `library to search slides backward`() {
        assertFalse(waveSlideForward("library", "search"))
    }

    @Test
    fun `library to home slides backward`() {
        assertFalse(waveSlideForward("library", "home"))
    }

    @Test
    fun `same tab never slides backward`() {
        assertFalse(waveSlideForward("home", "home"))
        assertFalse(waveSlideForward("search", "search"))
    }

    @Test
    fun `tab to detail is a forward push`() {
        assertTrue(waveSlideForward("home", "album/xyz"))
        assertTrue(waveSlideForward("search", "artist/xyz"))
    }

    @Test
    fun `detail to tab is a backward return`() {
        assertFalse(waveSlideForward("album/xyz", "home"))
        assertFalse(waveSlideForward("now_playing", "search"))
    }

    @Test
    fun `detail to detail stays forward`() {
        assertTrue(waveSlideForward("album/xyz", "artist/abc"))
    }
}
