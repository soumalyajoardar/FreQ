package com.gresseymusic.wave.player

import org.junit.Assert.*
import org.junit.Test

/**
 * Tests for the pure queue/player-index helpers (M12 Areas 2/4).
 * These drive targeted ExoPlayer playlist edits; any inconsistency falls
 * back to a full rebuild at the call site.
 */
class PlaybackQueueHelpersTest {

    @Test
    fun `player index resolves by media id`() {
        val controllerIds = listOf("a", "b", "c")
        assertEquals(0, playerIndexOfTrack(controllerIds, "a"))
        assertEquals(2, playerIndexOfTrack(controllerIds, "c"))
        assertEquals(-1, playerIndexOfTrack(controllerIds, "missing"))
        assertEquals(-1, playerIndexOfTrack(controllerIds, ""))
        assertEquals(-1, playerIndexOfTrack(emptyList(), "a"))
    }

    @Test
    fun `insert index finds first following track present in player`() {
        // Queue: [a, NEW, b, c]; player (filtered view): [a, b, c].
        val controllerIds = listOf("a", "b", "c")
        val newQueueIds = listOf("a", "NEW", "b", "c")
        assertEquals(1, playerInsertIndexForQueuePos(newQueueIds, controllerIds, 1))
    }

    @Test
    fun `insert index appends when nothing follows in player`() {
        val controllerIds = listOf("a", "b")
        val newQueueIds = listOf("a", "b", "NEW")
        assertEquals(2, playerInsertIndexForQueuePos(newQueueIds, controllerIds, 2))
    }

    @Test
    fun `insert index skips unplayable successors`() {
        // "gone" is not in the player playlist; "c" is the anchor.
        val controllerIds = listOf("a", "c")
        val newQueueIds = listOf("a", "NEW", "gone", "c")
        assertEquals(1, playerInsertIndexForQueuePos(newQueueIds, controllerIds, 1))
    }

    @Test
    fun `insert index rejects ambiguous input`() {
        assertEquals(-1, playerInsertIndexForQueuePos(listOf("a"), listOf("a"), -1))
        assertEquals(-1, playerInsertIndexForQueuePos(listOf("a"), listOf("a"), 5))
        assertEquals(-1, playerInsertIndexForQueuePos(listOf("a", "", "b"), listOf("a", "b"), 0))
    }

    @Test
    fun `queue position maps to preceding present count`() {
        val controllerIds = listOf("a", "c")
        val newQueueIds = listOf("a", "moved", "c")
        // "moved" at queue pos 1 -> 1 preceding present track ("a").
        assertEquals(1, playerIndexForQueuePos(newQueueIds, controllerIds, 1))
        // Moving "c" (queue pos 2) to front (queue pos 0) -> player 0.
        assertEquals(0, playerIndexForQueuePos(newQueueIds, controllerIds, 0))
        assertEquals(-1, playerIndexForQueuePos(newQueueIds, controllerIds, 9))
        assertEquals(-1, playerIndexForQueuePos(listOf("a", "", "c"), controllerIds, 2))
    }

    @Test
    fun `identical snapshots skip persistence`() {
        val snapshot = PlaybackSessionSnapshot(
            trackId = "v1",
            queueIds = listOf("v1", "v2"),
            queueIndex = 0,
            positionMs = 1000L,
            isPlaying = true,
            shuffleEnabled = false,
            repeatMode = 0,
        )
        assertFalse(shouldPersistPlaybackSession(snapshot, snapshot.copy()))
        assertFalse(shouldPersistPlaybackSession(snapshot, snapshot))
        assertTrue(shouldPersistPlaybackSession(null, snapshot))
        assertTrue(shouldPersistPlaybackSession(snapshot, snapshot.copy(positionMs = 2000L)))
        assertTrue(shouldPersistPlaybackSession(snapshot, snapshot.copy(isPlaying = false)))
        assertTrue(shouldPersistPlaybackSession(snapshot, snapshot.copy(queueIndex = 1)))
    }
}
