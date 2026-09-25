package com.gresseymusic.wave.ui.screens

import com.gresseymusic.wave.player.MediaTrack
import org.junit.Assert.*
import org.junit.Test

/**
 * Search grouping/summary tests (M18). Album rails group real returned
 * tracks by genuine album metadata; counts derive from actual data.
 */
class SearchGroupingTest {

    private fun track(
        id: String,
        album: String = "Album",
        artist: String = "Artist",
    ) = MediaTrack(
        id = id,
        title = "Title $id",
        artist = artist,
        album = album,
    )

    @Test
    fun `groups tracks by album in first-seen order`() {
        val tracks = listOf(
            track("v1", album = "B"),
            track("v2", album = "A"),
            track("v3", album = "B"),
        )
        val groups = groupSearchTracksByAlbum(tracks)
        assertEquals(2, groups.size)
        assertEquals("B", groups[0].title)
        assertEquals(listOf("v1", "v3"), groups[0].tracks.map { it.id })
        assertEquals("A", groups[1].title)
    }

    @Test
    fun `same album name across artists stays separate`() {
        val tracks = listOf(
            track("v1", album = "Hits", artist = "One"),
            track("v2", album = "Hits", artist = "Two"),
        )
        val groups = groupSearchTracksByAlbum(tracks)
        assertEquals(2, groups.size)
        assertEquals("One", groups[0].artist)
        assertEquals("Two", groups[1].artist)
    }

    @Test
    fun `blank and single albums stay out of the rail`() {
        val tracks = listOf(
            track("v1", album = ""),
            track("v2", album = "Single"),
            track("v3", album = "Real"),
        )
        val groups = groupSearchTracksByAlbum(tracks)
        assertEquals(1, groups.size)
        assertEquals("Real", groups[0].title)
    }

    @Test
    fun `group carries first track artwork and key`() {
        val tracks = listOf(
            track("v1", album = "A").copy(artworkUrl = "http://art/1"),
            track("v2", album = "A"),
        )
        val groups = groupSearchTracksByAlbum(tracks)
        assertEquals(1, groups.size)
        assertEquals("http://art/1", groups[0].artworkUrl)
        assertEquals("Artist::A", groups[0].key)
        assertEquals(2, groups[0].tracks.size)
    }

    @Test
    fun `empty input groups to empty`() {
        assertTrue(groupSearchTracksByAlbum(emptyList()).isEmpty())
    }

    @Test
    fun `summary counts songs and albums`() {
        assertEquals("3 songs • 2 albums", searchResultSummary(3, 2))
        assertEquals("1 song", searchResultSummary(1, 0))
        assertEquals("1 album", searchResultSummary(0, 1))
        assertEquals("No results", searchResultSummary(0, 0))
    }
}
