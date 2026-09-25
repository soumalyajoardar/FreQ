package com.gresseymusic.wave.data.repository

import com.gresseymusic.wave.data.remote.YtMusicApiClient
import com.gresseymusic.wave.player.MediaTrack
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Watch-continuation repository behavior (M27.1).
 *
 * Covers: failure fallback (playback must survive), blank-id short-circuit
 * without network, and real-shape mapping through a fake client.
 */
class WatchContinuationRepositoryTest {

    private class ThrowingApiClient : YtMusicApiClient("https://unreachable.invalid/") {
        var calls = 0
        override suspend fun getWatchQueue(trackId: String, limit: Int): List<MediaTrack> {
            calls++
            throw RuntimeException("offline")
        }
    }

    private class FakeWatchApiClient(private val tracks: List<MediaTrack>) :
        YtMusicApiClient("https://fake.invalid/") {
        override suspend fun getWatchQueue(trackId: String, limit: Int): List<MediaTrack> {
            return tracks.take(limit)
        }
    }

    private fun track(id: String) = MediaTrack(
        id = id,
        title = "Title $id",
        artist = "Artist",
        album = "Single",
        durationSeconds = 180,
    )

    @Test
    fun `backend failure falls back to empty without throwing`() = runBlocking {
        val client = ThrowingApiClient()
        val repository = YtMusicRepository(apiClient = client)
        val result = repository.getWatchContinuation("seed123", 25)
        assertTrue(result.isEmpty())
        assertEquals(1, client.calls)
    }

    @Test
    fun `blank track id short-circuits without network`() = runBlocking {
        val client = ThrowingApiClient()
        val repository = YtMusicRepository(apiClient = client)
        assertTrue(repository.getWatchContinuation("", 25).isEmpty())
        assertTrue(repository.getWatchContinuation("   ", 25).isEmpty())
        assertEquals(0, client.calls)
    }

    @Test
    fun `real-shaped watch results pass through in order`() = runBlocking {
        val tracks = listOf(track("a"), track("seed123"), track("b"))
        val repository = YtMusicRepository(apiClient = FakeWatchApiClient(tracks))
        val result = repository.getWatchContinuation("seed123", 25)
        assertEquals(listOf("a", "seed123", "b"), result.map { it.id })
    }
}
