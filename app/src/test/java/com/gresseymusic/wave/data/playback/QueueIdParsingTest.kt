package com.gresseymusic.wave.data.playback

import org.junit.Assert.*
import org.junit.Test

/**
 * Tests for the queue-ID persistence codec (M13 Area 3).
 * These exercise the real [encodeQueueIds]/[decodeQueueIds] functions used
 * by PlaybackPersistence — not a re-implementation.
 */
class QueueIdParsingTest {

    @Test
    fun `empty string returns empty list`() {
        assertEquals(emptyList<String>(), decodeQueueIds(""))
    }

    @Test
    fun `null returns empty list`() {
        assertEquals(emptyList<String>(), decodeQueueIds(null))
    }

    @Test
    fun `blank string returns empty list`() {
        assertEquals(emptyList<String>(), decodeQueueIds("   "))
    }

    @Test
    fun `single track ID`() {
        assertEquals(listOf("track1"), decodeQueueIds("track1"))
    }

    @Test
    fun `multiple track IDs`() {
        assertEquals(listOf("a", "b", "c"), decodeQueueIds("a,b,c"))
    }

    @Test
    fun `trailing comma produces no blank entries`() {
        assertEquals(listOf("a", "b"), decodeQueueIds("a,b,"))
    }

    @Test
    fun `leading comma produces no blank entries`() {
        assertEquals(listOf("a", "b"), decodeQueueIds(",a,b"))
    }

    @Test
    fun `double comma produces no blank entries`() {
        assertEquals(listOf("a", "b"), decodeQueueIds("a,,b"))
    }

    @Test
    fun `whitespace around IDs is trimmed`() {
        assertEquals(listOf("a", "b", "c"), decodeQueueIds(" a , b , c "))
    }

    @Test
    fun `only commas returns empty list`() {
        assertEquals(emptyList<String>(), decodeQueueIds(",,,"))
    }

    @Test
    fun `real-world YouTube track IDs`() {
        val input = "dQw4w9WgXcQ,9bZkp7q19f0,kJQP7kiw5Fk"
        val result = decodeQueueIds(input)
        assertEquals(3, result.size)
        assertEquals("dQw4w9WgXcQ", result[0])
        assertEquals("9bZkp7q19f0", result[1])
        assertEquals("kJQP7kiw5Fk", result[2])
    }

    @Test
    fun `corrupted queue with mixed blanks and valid IDs`() {
        val input = ",, track1 ,, ,track2,  ,"
        val result = decodeQueueIds(input)
        assertEquals(listOf("track1", "track2"), result)
    }

    @Test
    fun `encode joins with commas`() {
        assertEquals("a,b,c", encodeQueueIds(listOf("a", "b", "c")))
        assertEquals("", encodeQueueIds(emptyList()))
        assertEquals("solo", encodeQueueIds(listOf("solo")))
    }

    @Test
    fun `encode preserves duplicate IDs`() {
        // Queues may legally contain the same track twice (add-to-queue);
        // the codec must not de-duplicate.
        assertEquals(listOf("a", "b", "a"), decodeQueueIds(encodeQueueIds(listOf("a", "b", "a"))))
    }

    @Test
    fun `encode decode round trip preserves order`() {
        val ids = listOf("v1", "PLabc123", "RDCLAK5uy_test", "song_2")
        assertEquals(ids, decodeQueueIds(encodeQueueIds(ids)))
    }
}
