package com.gresseymusic.wave.player

import org.junit.Assert.*
import org.junit.Test

/**
 * Queue-state regression tests (M13 Area 2).
 * Exercises the real decision logic PlaybackManager delegates to —
 * repeat cycling, restore clamping, remove/move/play-next/clear planning,
 * and recovery/sync staleness — across empty, single, and multi-track
 * queues with the current item at first, middle, and last positions.
 */
class PlaybackQueueLogicTest {

    // Repeat (Area 2: repeat behavior)

    @Test
    fun `repeat toggles off one off with one tap`() {
        assertEquals(2, nextRepeatMode(0))
        assertEquals(0, nextRepeatMode(2))
        // Legacy restored "all" also toggles to one — never stranded.
        assertEquals(2, nextRepeatMode(1))
    }

    // Restore clamping (Area 2: queue restoration/index clamping)

    @Test
    fun `clamp empty queue to zero`() {
        assertEquals(0, clampQueueIndex(5, 0))
        assertEquals(0, clampQueueIndex(-3, 0))
    }

    @Test
    fun `clamp keeps valid indices`() {
        assertEquals(0, clampQueueIndex(0, 3))
        assertEquals(1, clampQueueIndex(1, 3))
        assertEquals(2, clampQueueIndex(2, 3))
    }

    @Test
    fun `clamp pins overflow and negative`() {
        assertEquals(2, clampQueueIndex(99, 3))
        assertEquals(0, clampQueueIndex(-1, 3))
    }

    @Test
    fun `clamp single track queue`() {
        assertEquals(0, clampQueueIndex(0, 1))
        assertEquals(0, clampQueueIndex(7, 1))
    }

    // Remove planning (Areas 2.7-2.9)

    @Test
    fun `remove rejects empty queue and invalid indices`() {
        assertNull(planQueueRemove(0, 0, 0))
        assertNull(planQueueRemove(3, -1, 1))
        assertNull(planQueueRemove(3, 3, 1))
    }

    @Test
    fun `removing before current shifts index down`() {
        val plan = planQueueRemove(queueSize = 5, removedIndex = 1, currentIndex = 3)
        assertNotNull(plan)
        assertEquals(2, plan!!.newIndex)
        assertFalse(plan.trackChanged)
    }

    @Test
    fun `removing after current keeps index`() {
        val plan = planQueueRemove(queueSize = 5, removedIndex = 4, currentIndex = 1)
        assertNotNull(plan)
        assertEquals(1, plan!!.newIndex)
        assertFalse(plan.trackChanged)
    }

    @Test
    fun `removing current in middle stays at same position`() {
        val plan = planQueueRemove(queueSize = 5, removedIndex = 2, currentIndex = 2)
        assertNotNull(plan)
        assertEquals(2, plan!!.newIndex)
        assertTrue(plan.trackChanged)
    }

    @Test
    fun `removing current first track stays at zero`() {
        val plan = planQueueRemove(queueSize = 3, removedIndex = 0, currentIndex = 0)
        assertNotNull(plan)
        assertEquals(0, plan!!.newIndex)
        assertTrue(plan.trackChanged)
    }

    @Test
    fun `removing current last track steps back`() {
        val plan = planQueueRemove(queueSize = 3, removedIndex = 2, currentIndex = 2)
        assertNotNull(plan)
        assertEquals(1, plan!!.newIndex)
        assertTrue(plan.trackChanged)
    }

    @Test
    fun `removing sole track flags change at zero`() {
        val plan = planQueueRemove(queueSize = 1, removedIndex = 0, currentIndex = 0)
        assertNotNull(plan)
        assertEquals(0, plan!!.newIndex)
        assertTrue(plan.trackChanged)
    }

    // Move resolution (Areas 2.10-2.11)

    @Test
    fun `move resolves current index by id`() {
        assertEquals(2, resolveCurrentIndexAfterMove(listOf("a", "b", "c"), "c", 0))
        assertEquals(0, resolveCurrentIndexAfterMove(listOf("c", "a", "b"), "c", 2))
    }

    @Test
    fun `move falls back when track missing`() {
        assertEquals(1, resolveCurrentIndexAfterMove(listOf("a", "b"), "gone", 1))
        assertEquals(1, resolveCurrentIndexAfterMove(listOf("a", "b"), null, 1))
    }

    // Play Next planning (Area 2.12)

    @Test
    fun `play next inserts directly after current`() {
        val plan = planPlayNext(listOf("a", "b", "c"), { it }, 1, "NEW")
        assertEquals(listOf("a", "b", "NEW", "c"), plan.queue)
        assertEquals(2, plan.insertPos)
        assertEquals(1, plan.currentIndex)
    }

    @Test
    fun `play next after last appends`() {
        val plan = planPlayNext(listOf("a", "b"), { it }, 1, "NEW")
        assertEquals(listOf("a", "b", "NEW"), plan.queue)
        assertEquals(2, plan.insertPos)
        assertEquals(1, plan.currentIndex)
    }

    @Test
    fun `play next into empty queue inserts at zero`() {
        val plan = planPlayNext(emptyList(), { it }, 0, "NEW")
        assertEquals(listOf("NEW"), plan.queue)
        assertEquals(0, plan.insertPos)
    }

    @Test
    fun `play next deduplicates existing later track`() {
        // "b" already sits after current "a": it moves directly after "a".
        val plan = planPlayNext(listOf("a", "x", "b"), { it }, 0, "b")
        assertEquals(listOf("a", "b", "x"), plan.queue)
        assertEquals(1, plan.insertPos)
        assertEquals(0, plan.currentIndex)
    }

    @Test
    fun `play next on current track does not duplicate into up next`() {
        val plan = planPlayNext(listOf("a", "b"), { it }, 0, "a")
        assertEquals(listOf("a", "b"), plan.queue)
        assertEquals(0, plan.insertPos)
        assertEquals(0, plan.currentIndex)
    }

    @Test
    fun `play next with unknown current index appends relatively`() {
        val plan = planPlayNext(listOf("a", "b"), { it }, 9, "NEW")
        assertEquals(listOf("a", "b", "NEW"), plan.queue)
        assertEquals(9, plan.currentIndex)
    }

    @Test
    fun `rapid additions accumulate in order`() {
        // Two rapid add-to-queue/play-next style insertions at state level.
        var queue = listOf("a")
        var plan = planPlayNext(queue, { it }, 0, "b")
        queue = plan.queue
        plan = planPlayNext(queue, { it }, 0, "c")
        queue = plan.queue
        assertEquals(listOf("a", "c", "b"), queue)
    }

    // Clear Up Next (Area 2)

    @Test
    fun `clear up next guard matrix`() {
        assertFalse(shouldClearUpNext(0, 0))
        assertFalse(shouldClearUpNext(1, 0))
        assertFalse(shouldClearUpNext(4, 3))
        assertTrue(shouldClearUpNext(4, 0))
        assertTrue(shouldClearUpNext(4, 2))
    }

    // Recovery / sync staleness (Area 10 core)

    @Test
    fun `fresh recovery is not stale`() {
        assertFalse(isRecoveryStale(7L, 7L, "v1", "v1"))
    }

    @Test
    fun `recovery stale on newer token`() {
        assertTrue(isRecoveryStale(7L, 8L, "v1", "v1"))
    }

    @Test
    fun `recovery stale on track change`() {
        assertTrue(isRecoveryStale(7L, 7L, "v1", "v2"))
    }

    @Test
    fun `recovery stale on token and track change`() {
        assertTrue(isRecoveryStale(7L, 9L, "v1", "v2"))
    }

    @Test
    fun `recovery with null tracks compares safely`() {
        assertFalse(isRecoveryStale(3L, 3L, null, null))
        assertTrue(isRecoveryStale(3L, 3L, null, "v1"))
        assertTrue(isRecoveryStale(3L, 3L, "v1", null))
    }

    @Test
    fun `sync stale only on token change`() {
        assertFalse(isSyncStale(4L, 4L))
        assertTrue(isSyncStale(4L, 5L))
    }

    // Seamless prefetch gate (M27.6)

    @Test
    fun `prefetch fires inside final thirty seconds`() {
        assertTrue(shouldPrefetchNext(200, 170f, hasNext = true))
        assertTrue(shouldPrefetchNext(200, 199f, hasNext = true))
    }

    @Test
    fun `prefetch silent early in track`() {
        assertFalse(shouldPrefetchNext(200, 100f, hasNext = true))
    }

    @Test
    fun `prefetch requires a next item and valid timing`() {
        assertFalse(shouldPrefetchNext(200, 190f, hasNext = false))
        assertFalse(shouldPrefetchNext(0, 0f, hasNext = true))
        assertFalse(shouldPrefetchNext(200, 200f, hasNext = true))
        assertFalse(shouldPrefetchNext(200, 250f, hasNext = true))
    }
}
