package com.gresseymusic.wave.ui.screens

import org.junit.Assert.*
import org.junit.Test

/**
 * Library display-rule tests (M19). Section visibility and the collection
 * summary derive from real local-library counts only — no fixtures.
 */
class LibraryDisplayTest {

    private fun visibility(
        liked: Int = 0,
        recent: Int = 0,
        albums: Int = 0,
        artists: Int = 0,
        savedPlaylists: Int = 0,
        userPlaylists: Int = 0,
    ) = resolveLibraryVisibility(liked, recent, albums, artists, savedPlaylists, userPlaylists)

    @Test
    fun `fully empty library shows consolidated empty state`() {
        val v = visibility()
        assertTrue(v.showConsolidatedEmpty)
        assertFalse(v.liked)
        assertFalse(v.albums)
        assertFalse(v.artists)
        assertFalse(v.savedPlaylists)
    }

    @Test
    fun `any content disables consolidated empty`() {
        assertFalse(visibility(liked = 1).showConsolidatedEmpty)
        assertFalse(visibility(recent = 1).showConsolidatedEmpty)
        assertFalse(visibility(albums = 1).showConsolidatedEmpty)
        assertFalse(visibility(artists = 1).showConsolidatedEmpty)
        assertFalse(visibility(savedPlaylists = 1).showConsolidatedEmpty)
        assertFalse(visibility(userPlaylists = 1).showConsolidatedEmpty)
    }

    @Test
    fun `populated sections render independently`() {
        val v = visibility(liked = 3, albums = 0, artists = 2, savedPlaylists = 0)
        assertTrue(v.liked)
        assertFalse(v.albums)
        assertTrue(v.artists)
        assertFalse(v.savedPlaylists)
        assertFalse(v.showConsolidatedEmpty)
    }

    @Test
    fun `summary lists only non-empty collections`() {
        assertEquals("", libraryCollectionSummary(0, 0, 0, 0))
        assertEquals("1 liked song", libraryCollectionSummary(1, 0, 0, 0))
        assertEquals("12 liked songs", libraryCollectionSummary(12, 0, 0, 0))
        assertEquals(
            "3 liked songs • 2 albums • 1 artist • 4 playlists",
            libraryCollectionSummary(3, 2, 1, 4),
        )
        assertEquals("1 album", libraryCollectionSummary(0, 1, 0, 0))
    }
}
