package com.gresseymusic.wave.player

/**
 * Pure queue-state logic for PlaybackManager (M13 test seams).
 *
 * Each function mirrors one decision in PlaybackManager exactly; the manager
 * delegates to them so host tests pin the real behavior (queue math,
 * repeat cycling, restore clamping, recovery/sync staleness) without an
 * Android MediaController.
 */

/** App repeat domain: 0 = Off, 2 = One. Single tap toggles (M28i). */
fun nextRepeatMode(current: Int): Int {
    return if (current == 2) 0 else 2
}

/**
 * Clamps a restored queue index into [0, size - 1], yielding 0 for an empty
 * queue. Used by session restoration.
 */
fun clampQueueIndex(index: Int, queueSize: Int): Int {
    if (queueSize <= 0) return 0
    return index.coerceIn(0, queueSize - 1)
}

data class QueueRemovePlan(
    /** Index of the current track in the post-removal queue. */
    val newIndex: Int,
    /** True when the removed item was the current track. */
    val trackChanged: Boolean,
)

/**
 * Index math for removing [removedIndex] from a queue of [queueSize] with
 * the current track at [currentIndex]. Returns null for an invalid removal
 * (empty queue or out-of-range index). Callers must handle the empty-queue
 * clear separately, as PlaybackManager does.
 */
fun planQueueRemove(queueSize: Int, removedIndex: Int, currentIndex: Int): QueueRemovePlan? {
    if (queueSize <= 0 || removedIndex !in 0 until queueSize) return null
    val newSize = queueSize - 1
    val newIndex = when {
        removedIndex < currentIndex -> currentIndex - 1
        removedIndex == currentIndex -> currentIndex.coerceAtMost((newSize - 1).coerceAtLeast(0))
        else -> currentIndex
    }
    return QueueRemovePlan(newIndex = newIndex, trackChanged = removedIndex == currentIndex)
}

/**
 * Resolves the current-track index after a move edit: the position of
 * [currentTrackId] in [newQueueIds], or [fallbackIndex] when the track is
 * absent (defensive; the moved item is always present in practice).
 */
fun resolveCurrentIndexAfterMove(
    newQueueIds: List<String>,
    currentTrackId: String?,
    fallbackIndex: Int,
): Int {
    if (currentTrackId == null) return fallbackIndex
    val found = newQueueIds.indexOf(currentTrackId)
    return if (found != -1) found else fallbackIndex
}

data class PlayNextPlan<T>(
    /** Post-edit queue with [newItem] inserted exactly once. */
    val queue: List<T>,
    /** Position [newItem] was inserted at. */
    val insertPos: Int,
    /** Current-track index in the post-edit queue. */
    val currentIndex: Int,
)

/**
 * Plans a "play next" edit: de-duplicates [newItem] when it already appears
 * later in the queue (a current-track duplicate is kept in place), then
 * inserts directly after the current track. Mirrors PlaybackManager
 * semantics exactly, including the empty/unknown-current-index edge.
 */
fun <T> planPlayNext(
    queue: List<T>,
    idOf: (T) -> String,
    currentIndex: Int,
    newItem: T,
): PlayNextPlan<T> {
    val newId = idOf(newItem)
    // Invariant (M25): If the item to play next is ALREADY the currently active
    // track, do not inject a duplicate of it immediately into Up Next.
    if (queue.getOrNull(currentIndex)?.let { idOf(it) == newId } == true) {
        return PlayNextPlan(queue = queue, insertPos = currentIndex, currentIndex = currentIndex)
    }

    val newQueue = queue.toMutableList()
    val existingIndex = newQueue.indexOfFirst { idOf(it) == newId }
    if (existingIndex != -1 && existingIndex != currentIndex) {
        newQueue.removeAt(existingIndex)
    }
    val adjustedCurrentIndex = if (queue.getOrNull(currentIndex) != null) {
        newQueue.indexOfFirst { idOf(it) == idOf(queue[currentIndex]) }.coerceAtLeast(0)
    } else {
        currentIndex
    }
    val insertPos = (adjustedCurrentIndex + 1).coerceAtMost(newQueue.size)
    newQueue.add(insertPos, newItem)
    return PlayNextPlan(queue = newQueue, insertPos = insertPos, currentIndex = adjustedCurrentIndex)
}

/**
 * Whether "clear Up Next" has anything to do: the queue is non-empty and
 * the current track is not the last item.
 */
fun shouldClearUpNext(queueSize: Int, currentIndex: Int): Boolean {
    return queueSize > 0 && currentIndex < queueSize - 1
}

/**
 * A recovery response is stale when a newer playback token was issued or
 * the current track changed since the recovery started. Stale recoveries
 * must never publish state or resurrect the old track.
 */
fun isRecoveryStale(
    requestToken: Long,
    activeToken: Long,
    requestTrackId: String?,
    currentTrackId: String?,
): Boolean {
    return requestToken != activeToken || requestTrackId != currentTrackId
}

/**
 * A playlist sync is stale when a newer playback token was issued after the
 * sync started. Stale syncs must not touch the player.
 */
fun isSyncStale(requestToken: Long, activeToken: Long): Boolean {
    return requestToken != activeToken
}

/**
 * Seamless-transition prefetch gate (M27.6): the next queue item's source
 * should be resolved once the current track is within [thresholdSeconds] of
 * its end, so the Media3 boundary transition never waits on network
 * extraction. Pure and unit-tested.
 */
fun shouldPrefetchNext(
    durationSeconds: Int,
    progressSeconds: Float,
    hasNext: Boolean,
    thresholdSeconds: Int = NEXT_PREFETCH_THRESHOLD_SEC,
): Boolean {
    if (!hasNext || durationSeconds <= 0) return false
    val remaining = durationSeconds - progressSeconds
    return remaining <= thresholdSeconds && remaining > 0
}

/** Prefetch window before track end, in seconds. */
const val NEXT_PREFETCH_THRESHOLD_SEC = 30
