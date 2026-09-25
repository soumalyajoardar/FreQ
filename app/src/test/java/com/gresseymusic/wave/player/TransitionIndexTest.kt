package com.gresseymusic.wave.player

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Automatic continuation transition mapping (M27.2).
 *
 * When a track ends, ExoPlayer advances its own playlist and this mapping
 * decides which app-queue track becomes current. Covers timeline-map hits,
 * player-index fallback, media-id search, and clamping.
 */
class TransitionIndexTest {

    private val queue = listOf("a", "b", "c", "d")

    @Test
    fun `timeline map wins when it agrees with media id`() {
        assertEquals(
            2,
            resolveTransitionQueueIndex(
                playerIndex = 1,
                mediaId = "c",
                queueIds = queue,
                syncedPlayableIndices = listOf(0, 2),
            ),
        )
    }

    @Test
    fun `timeline map ignored on media id mismatch falls to player index`() {
        assertEquals(
            1,
            resolveTransitionQueueIndex(
                playerIndex = 1,
                mediaId = "b",
                queueIds = queue,
                syncedPlayableIndices = listOf(0, 3),
            ),
        )
    }

    @Test
    fun `player index used on direct match`() {
        assertEquals(
            2,
            resolveTransitionQueueIndex(
                playerIndex = 2,
                mediaId = "c",
                queueIds = queue,
                syncedPlayableIndices = emptyList(),
            ),
        )
    }

    @Test
    fun `media id search finds appended continuation tracks`() {
        // Continuation items appended after a full sync have no timeline map;
        // the media id locates them in the grown queue.
        assertEquals(
            4,
            resolveTransitionQueueIndex(
                playerIndex = 1,
                mediaId = "z",
                queueIds = queue + "z",
                syncedPlayableIndices = listOf(0, 1, 2, 3),
            ),
        )
    }

    @Test
    fun `unknown media id clamps into range`() {
        assertEquals(
            3,
            resolveTransitionQueueIndex(
                playerIndex = 9,
                mediaId = "missing",
                queueIds = queue,
                syncedPlayableIndices = emptyList(),
            ),
        )
        assertEquals(
            0,
            resolveTransitionQueueIndex(
                playerIndex = -4,
                mediaId = null,
                queueIds = queue,
                syncedPlayableIndices = emptyList(),
            ),
        )
    }

    @Test
    fun `empty queue resolves to zero`() {
        assertEquals(
            0,
            resolveTransitionQueueIndex(
                playerIndex = 0,
                mediaId = "a",
                queueIds = emptyList(),
                syncedPlayableIndices = emptyList(),
            ),
        )
    }

    @Test
    fun `advance direction follows next`() {
        assertEquals(1, advanceDirection(0, 1, 4))
        assertEquals(1, advanceDirection(1, 3, 4))
    }

    @Test
    fun `advance direction follows previous`() {
        assertEquals(-1, advanceDirection(2, 1, 4))
        assertEquals(-1, advanceDirection(3, 1, 4))
    }

    @Test
    fun `advance direction handles wrap-around`() {
        // Last -> first is a forward (Next) wrap; first -> last is Previous.
        assertEquals(1, advanceDirection(3, 0, 4))
        assertEquals(-1, advanceDirection(0, 3, 4))
    }

    @Test
    fun `advance direction is zero when unchanged or singular`() {
        assertEquals(0, advanceDirection(2, 2, 4))
        assertEquals(0, advanceDirection(0, 0, 1))
        assertEquals(0, advanceDirection(0, 1, 0))
    }
}
