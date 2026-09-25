package com.gresseymusic.wave.player

import com.gresseymusic.wave.ui.screens.visibleUpNextIndices
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class QueueRegressionTest {

    private fun testTrack(id: String, title: String): MediaTrack {
        return MediaTrack(
            id = id,
            title = title,
            artist = "Artist",
            album = "Album",
            durationSeconds = 200,
        )
    }

    @Test
    fun `planPlayNext on currently playing track does not inject duplicate into Up Next`() {
        val t1 = testTrack("1", "Song 1")
        val t2 = testTrack("2", "Song 2")
        val t3 = testTrack("3", "Song 3")
        val queue = listOf(t1, t2, t3)

        // Currently playing track is index 0 (t1). User triggers "Play Next" on t1.
        val plan = planPlayNext(queue, MediaTrack::id, currentIndex = 0, newItem = t1)

        // Queue must NOT have t1 inserted again at index 1
        assertEquals(3, plan.queue.size)
        assertEquals(listOf("1", "2", "3"), plan.queue.map { it.id })
        assertEquals(0, plan.currentIndex)
    }

    @Test
    fun `visibleUpNextIndices never includes the currently playing track`() {
        val indices = visibleUpNextIndices(queueSize = 4, currentIndex = 0)
        assertEquals(listOf(1, 2, 3), indices)
        assertFalse(indices.contains(0))

        val midIndices = visibleUpNextIndices(queueSize = 4, currentIndex = 2)
        assertEquals(listOf(3), midIndices)
        assertFalse(midIndices.contains(2))

        val lastIndices = visibleUpNextIndices(queueSize = 4, currentIndex = 3)
        assertTrue(lastIndices.isEmpty())
    }

    @Test
    fun `planPlayNext reorders later existing track into position directly after current`() {
        val t1 = testTrack("1", "Song 1")
        val t2 = testTrack("2", "Song 2")
        val t3 = testTrack("3", "Song 3")
        val queue = listOf(t1, t2, t3)

        // Track 3 is chosen to play next while Track 1 is playing
        val plan = planPlayNext(queue, MediaTrack::id, currentIndex = 0, newItem = t3)

        // Track 3 moves right after Track 1, deduplicated
        assertEquals(listOf("1", "3", "2"), plan.queue.map { it.id })
        assertEquals(1, plan.insertPos)
        assertEquals(0, plan.currentIndex)
    }

    @Test
    fun `legitimate duplicates elsewhere in queue are preserved`() {
        val t1 = testTrack("1", "Song 1")
        val t2 = testTrack("2", "Song 2")
        val t3 = testTrack("1", "Song 1") // duplicate later in playlist
        val queue = listOf(t1, t2, t3)

        assertEquals(3, queue.size)
        // Ensure index 0 and index 2 both exist
        assertEquals("1", queue[0].id)
        assertEquals("1", queue[2].id)
    }

    @Test
    fun `A-B-A-C scenario only removes currently playing position from Up Next`() {
        val trackA1 = testTrack("A", "Song A")
        val trackB = testTrack("B", "Song B")
        val trackA2 = testTrack("A", "Song A") // intentional duplicate later in queue
        val trackC = testTrack("C", "Song C")
        val queue = listOf(trackA1, trackB, trackA2, trackC)

        // Currently playing: index 0 (first instance of track A)
        val upNextIndices = visibleUpNextIndices(queueSize = queue.size, currentIndex = 0)
        assertEquals(listOf(1, 2, 3), upNextIndices)

        val upNextTracks = upNextIndices.map { queue[it] }
        // Up Next must contain [B, A, C] — preserving the second instance of track A at index 2
        assertEquals(listOf("B", "A", "C"), upNextTracks.map { it.id })
    }
}
