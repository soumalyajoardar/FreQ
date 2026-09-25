package com.gresseymusic.wave.data.recommendation

import com.gresseymusic.wave.data.library.SavedArtistItem
import com.gresseymusic.wave.data.model.HomeCatalogItem
import com.gresseymusic.wave.data.model.HomeCatalogSection
import com.gresseymusic.wave.data.model.UserPlaylist
import com.gresseymusic.wave.player.MediaTrack
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ListeningRecommendationEngineTest {

    private fun testTrack(id: String, title: String, artist: String): MediaTrack {
        return MediaTrack(
            id = id,
            title = title,
            artist = artist,
            album = "Test Album",
            durationSeconds = 180,
        )
    }

    @Test
    fun `returns cold start when total signals are less than minimum`() {
        val result = ListeningRecommendationEngine.computeRecommendations(
            recentlyPlayed = emptyList(),
            likedTracks = emptyList(),
            savedArtists = emptyList(),
            userPlaylists = emptyList(),
        )
        assertTrue(result is RecommendationState.ColdStart)

        val oneSignalResult = ListeningRecommendationEngine.computeRecommendations(
            recentlyPlayed = listOf(testTrack("1", "Song 1", "Artist A")),
            likedTracks = emptyList(),
            savedArtists = emptyList(),
            userPlaylists = emptyList(),
        )
        assertTrue(oneSignalResult is RecommendationState.ColdStart)
    }

    @Test
    fun `excludes currently playing track from recommendations`() {
        val trackA = testTrack("1", "Song A", "Artist A")
        val trackB = testTrack("2", "Song B", "Artist A")
        val trackC = testTrack("3", "Song C", "Artist B")

        val result = ListeningRecommendationEngine.computeRecommendations(
            recentlyPlayed = listOf(trackA, trackB),
            likedTracks = listOf(trackA),
            savedArtists = emptyList(),
            userPlaylists = emptyList(),
            catalogSections = listOf(
                HomeCatalogSection(
                    title = "Hits",
                    items = listOf(
                        HomeCatalogItem(type = "song", id = "1", title = "Song A", track = trackA),
                        HomeCatalogItem(type = "song", id = "2", title = "Song B", track = trackB),
                        HomeCatalogItem(type = "song", id = "3", title = "Song C", track = trackC),
                    ),
                ),
            ),
            currentTrackId = "1", // trackA is actively playing
        )

        assertTrue(result is RecommendationState.Ready)
        val tracks = (result as RecommendationState.Ready).tracks
        assertFalse("Current track must never appear in recommendations", tracks.any { it.id == "1" })
        assertTrue("Other tracks by affinity should appear", tracks.any { it.id == "2" })
    }

    @Test
    fun `ranks tracks by artist affinity and favorites`() {
        val trackA1 = testTrack("1", "Song A1", "Artist Alpha")
        val trackA2 = testTrack("2", "Song A2", "Artist Alpha")
        val trackB1 = testTrack("3", "Song B1", "Artist Beta")

        // User likes Artist Alpha (saved artist + liked track)
        val result = ListeningRecommendationEngine.computeRecommendations(
            recentlyPlayed = listOf(trackA1),
            likedTracks = listOf(trackA1),
            savedArtists = listOf(SavedArtistItem("a1", "Artist Alpha")),
            userPlaylists = emptyList(),
            catalogSections = listOf(
                HomeCatalogSection(
                    title = "Discover",
                    items = listOf(
                        HomeCatalogItem(type = "song", id = "3", title = "Song B1", track = trackB1),
                        HomeCatalogItem(type = "song", id = "2", title = "Song A2", track = trackA2),
                    ),
                ),
            ),
            currentTrackId = "1",
        )

        assertTrue(result is RecommendationState.Ready)
        val tracks = (result as RecommendationState.Ready).tracks
        assertEquals("Song A2", tracks.first().title)
    }

    @Test
    fun `respects candidate limit`() {
        val tracks = (1..20).map { testTrack("$it", "Song $it", "Artist $it") }
        val result = ListeningRecommendationEngine.computeRecommendations(
            recentlyPlayed = tracks.take(5),
            likedTracks = tracks.take(5),
            savedArtists = emptyList(),
            userPlaylists = emptyList(),
            catalogSections = listOf(
                HomeCatalogSection(
                    title = "Catalog",
                    items = tracks.map { HomeCatalogItem(type = "song", id = it.id, title = it.title, track = it) },
                ),
            ),
            limit = 6,
        )

        assertTrue(result is RecommendationState.Ready)
        assertEquals(6, (result as RecommendationState.Ready).tracks.size)
    }
}
