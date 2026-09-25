package com.gresseymusic.wave.ui.screens

import com.gresseymusic.wave.player.MediaTrack
import org.junit.Assert.*
import org.junit.Test

/**
 * Playlist display-rule tests (M22). Curator and count lines derive from
 * real backend fields only — absent metadata is omitted, never fabricated.
 */
class PlaylistMetaTest {

    @Test
    fun `curator line uses real author`() {
        assertEquals("Curated by YouTube Music", curatorLine("YouTube Music"))
        assertEquals("Curated by FreQ Curation", curatorLine("FreQ Curation"))
    }

    @Test
    fun `curator line hides missing author`() {
        assertNull(curatorLine(null))
        assertNull(curatorLine(""))
        assertNull(curatorLine("   "))
    }

    @Test
    fun `count line uses real size`() {
        assertEquals("No tracks yet", playlistTrackCountLine(0))
        assertEquals("No tracks yet", playlistTrackCountLine(-1))
        assertEquals("1 track", playlistTrackCountLine(1))
        assertEquals("13 tracks", playlistTrackCountLine(13))
        assertEquals("100 tracks", playlistTrackCountLine(100))
    }

    @Test
    fun `stats line combines count and runtime`() {
        assertEquals("50 Songs • 3h 12m", formatPlaylistStats(50, 3 * 3600 + 12 * 60))
        assertEquals("1 Song • 4m 5s", formatPlaylistStats(1, 245))
        assertEquals("0 Songs • 0s", formatPlaylistStats(0, 0))
    }

    @Test
    fun `long durations format hours minutes seconds`() {
        assertEquals("3h 12m", formatDurationLong(3 * 3600 + 12 * 60))
        assertEquals("1h 0m", formatDurationLong(3600))
        assertEquals("45m 10s", formatDurationLong(2710))
        assertEquals("4m", formatDurationLong(240))
        assertEquals("45s", formatDurationLong(45))
        assertEquals("0s", formatDurationLong(-9))
    }

    @Test
    fun `fame gate needs real audience`() {
        assertTrue(isFamousArtist("Artist • 674M monthly audience"))
        assertTrue(isFamousArtist("Artist • 1.2M subscribers"))
        assertFalse(isFamousArtist("Artist • 12.5K monthly audience"))
        assertFalse(isFamousArtist("Artist"))
        assertFalse(isFamousArtist(null))
        assertFalse(isFamousArtist(""))
    }

    @Test
    fun `audience counts parse KMB suffixes`() {
        assertEquals(674_000_000L, parseAudienceCount("Artist • 674M monthly audience"))
        assertEquals(1_200_000L, parseAudienceCount("Artist • 1.2M subscribers"))
        assertEquals(12_500L, parseAudienceCount("Artist • 12.5K monthly audience"))
        assertNull(parseAudienceCount("Artist"))
        assertNull(parseAudienceCount(null))
    }

    @Test
    fun `exact title match names the top song`() {
        val track = MediaTrack(id = "x", title = "Espresso", artist = "Sabrina Carpenter", album = "Single")
        assertTrue(isTopSongMatch("espresso", track))
        assertTrue(isTopSongMatch("  Espresso  ", track))
        assertFalse(isTopSongMatch("espr", track))
        assertFalse(isTopSongMatch("", track))
    }
}
