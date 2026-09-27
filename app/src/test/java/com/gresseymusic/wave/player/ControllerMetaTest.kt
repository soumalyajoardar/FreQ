package com.gresseymusic.wave.player

import org.junit.Assert.*
import org.junit.Test

/**
 * Controller-metadata fallback (M28u): rotation/offline must never leave
 * a playing service with an empty UI.
 */
class ControllerMetaTest {

    @Test
    fun `fallback keeps identity with blank-safe defaults`() {
        val track = fallbackTrackFromMeta(
            ControllerTrackMeta(
                id = "vid1",
                title = "Song",
                artist = "Singer",
                album = "Record",
                artworkUrl = "https://example.com/a.jpg",
            ),
        )
        assertEquals("vid1", track.id)
        assertEquals("Song", track.title)
        assertEquals("Singer", track.artist)
        assertEquals("https://example.com/a.jpg", track.artworkUrl)
    }

    @Test
    fun `fallback blanks degrade honestly and stay resolvable`() {
        val track = fallbackTrackFromMeta(
            ControllerTrackMeta(id = "vid2", title = null, artist = "", album = null, artworkUrl = null),
        )
        assertEquals("Unknown Title", track.title)
        assertEquals("Unknown Artist", track.artist)
        assertNull(track.artworkUrl)
        // The video id survives, so source resolution still works.
        assertTrue(track.isPlayable)
    }
}
