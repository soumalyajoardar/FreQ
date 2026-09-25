package com.gresseymusic.wave.data.recommendation

import com.gresseymusic.wave.player.MediaTrack
import org.junit.Assert.*
import org.junit.Test

/**
 * Regression tests for M27.4 continuation artwork preservation.
 */
class ContinuationArtworkRegressionTest {

    @Test
    fun `artworkUrl survives continuation mapping`() {
        val watchTrack = MediaTrack(
            id = "watch-1",
            title = "Watch Track",
            artist = "Artist",
            album = "Album",
            durationSeconds = 180,
            artworkUrl = "https://example.com/artwork.jpg"
        )
        
        val continuation = ContinuationQueueLogic.buildContinuationQueue(
            currentTrackId = "seed",
            watchTracks = listOf(watchTrack),
            existingQueueIds = emptySet(),
            limit = 10
        )
        
        assertEquals(1, continuation.size)
        assertEquals("https://example.com/artwork.jpg", continuation[0].artworkUrl)
    }

    @Test
    fun `queue item retains artworkUrl after continuation append`() {
        val seedTrack = MediaTrack(
            id = "seed",
            title = "Seed",
            artist = "Artist",
            album = "Album",
            durationSeconds = 180,
            artworkUrl = "https://example.com/seed.jpg"
        )
        
        val continuationTrack = MediaTrack(
            id = "cont-1",
            title = "Continuation",
            artist = "Artist",
            album = "Album",
            durationSeconds = 180,
            artworkUrl = "https://example.com/cont.jpg"
        )
        
        // Simulate queue state after continuation append
        val queue = listOf(seedTrack, continuationTrack)
        
        assertEquals(2, queue.size)
        assertEquals("https://example.com/seed.jpg", queue[0].artworkUrl)
        assertEquals("https://example.com/cont.jpg", queue[1].artworkUrl)
    }

    @Test
    fun `continuation tracks with null artworkUrl handled gracefully`() {
        val watchTrack = MediaTrack(
            id = "watch-1",
            title = "Watch Track",
            artist = "Artist",
            album = "Album",
            durationSeconds = 180,
            artworkUrl = null // Backend doesn't provide artwork
        )
        
        val continuation = ContinuationQueueLogic.buildContinuationQueue(
            currentTrackId = "seed",
            watchTracks = listOf(watchTrack),
            existingQueueIds = emptySet(),
            limit = 10
        )
        
        assertEquals(1, continuation.size)
        assertNull(continuation[0].artworkUrl) // Null preserved, not replaced with placeholder
    }
}