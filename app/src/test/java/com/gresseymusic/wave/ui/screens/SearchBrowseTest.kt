package com.gresseymusic.wave.ui.screens

import com.gresseymusic.wave.data.model.HomeCatalogItem
import com.gresseymusic.wave.data.model.HomeCatalogSection
import com.gresseymusic.wave.player.MediaTrack
import org.junit.Assert.*
import org.junit.Test

class SearchBrowseTest {

    private fun track(id: String) = MediaTrack(
        id = id,
        title = "Title $id",
        artist = "Artist",
        album = "Album",
        durationSeconds = 180,
    )

    private fun section(title: String, vararg tracks: MediaTrack) = HomeCatalogSection(
        title = title,
        items = tracks.map { t ->
            HomeCatalogItem(type = "song", id = t.id, title = t.title, track = t)
        },
    )

    @Test
    fun `browse categories cover six genres with searchable terms`() {
        assertEquals(6, BROWSE_CATEGORIES.size)
        BROWSE_CATEGORIES.forEach {
            assertTrue(it.title.isNotBlank())
            assertTrue(it.query.isNotBlank())
            assertTrue(it.colors.size >= 2)
        }
        assertTrue(BROWSE_CATEGORIES.map { it.title }.containsAll(listOf("Pop", "Rock", "Hip-Hop", "Dance", "Chill")))
    }

    @Test
    fun `trending takes first tracks across sections`() {
        val sections = listOf(
            section("S1", track("a"), track("b")),
            section("S2", track("c")),
        )
        assertEquals(listOf("a", "b", "c"), trendingTracksFromCatalog(sections, limit = 5).map { it.id })
    }

    @Test
    fun `trending caps at limit and dedupes`() {
        val sections = listOf(
            section("S1", track("a"), track("a"), track("b")),
            section("S2", track("c"), track("d")),
        )
        assertEquals(listOf("a", "b", "c"), trendingTracksFromCatalog(sections, limit = 3).map { it.id })
    }

    @Test
    fun `trending skips null tracks and blank ids`() {
        val sections = listOf(
            HomeCatalogSection(
                title = "S1",
                items = listOf(
                    HomeCatalogItem(type = "song", id = "x", title = "No track", track = null),
                    HomeCatalogItem(type = "song", id = "", title = "Blank", track = track("")),
                ),
            ),
            section("S2", track("ok")),
        )
        assertEquals(listOf("ok"), trendingTracksFromCatalog(sections).map { it.id })
    }

    @Test
    fun `trending empty on empty catalog`() {
        assertTrue(trendingTracksFromCatalog(emptyList()).isEmpty())
        assertTrue(trendingTracksFromCatalog(listOf(section("S", track("a"))), limit = 0).isEmpty())
    }
}
