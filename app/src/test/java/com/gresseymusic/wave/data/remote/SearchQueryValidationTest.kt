package com.gresseymusic.wave.data.remote

import com.gresseymusic.wave.player.MediaTrack
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test

/**
 * Search query validation tests (M13 Areas 6, 14).
 *
 * Validation lives in [YtMusicApiClient.isSearchableQuery], tested here
 * directly. A previous version of this file called the real network for
 * two-character queries; that was timing/DNS-dependent (Area 14), so the
 * network-touching case now uses a recording fake that never leaves the
 * host. No test in this file requires internet access.
 */
class SearchQueryValidationTest {

    private class RecordingClient : YtMusicApiClient("https://fake.test/") {
        val queried = mutableListOf<String>()

        override suspend fun searchTracks(query: String): List<MediaTrack> {
            queried.add(query)
            return emptyList()
        }
    }

    @Test
    fun `blank query is not searchable`() {
        assertFalse(YtMusicApiClient.isSearchableQuery(""))
    }

    @Test
    fun `whitespace-only query is not searchable`() {
        assertFalse(YtMusicApiClient.isSearchableQuery("   "))
    }

    @Test
    fun `single character query is not searchable`() {
        assertFalse(YtMusicApiClient.isSearchableQuery("a"))
    }

    @Test
    fun `single char with spaces is not searchable`() {
        assertFalse(YtMusicApiClient.isSearchableQuery("  a  "))
    }

    @Test
    fun `two character query is searchable`() {
        assertTrue(YtMusicApiClient.isSearchableQuery("ab"))
    }

    @Test
    fun `query is trimmed before length check`() {
        // " a " trims to "a" which is length 1.
        assertFalse(YtMusicApiClient.isSearchableQuery(" a "))
        assertTrue(YtMusicApiClient.isSearchableQuery(" ab "))
    }

    @Test
    fun `real query is searchable`() {
        assertTrue(YtMusicApiClient.isSearchableQuery("billie eilish"))
    }

    @Test
    fun `fake client records queries without network`() {
        // Guards the fake itself: deterministic, offline, no DNS.
        val fake = RecordingClient()
        runBlocking {
            fake.searchTracks("ab")
        }
        assertEquals(listOf("ab"), fake.queried)
    }
}
