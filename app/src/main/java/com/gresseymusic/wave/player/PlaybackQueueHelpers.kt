package com.gresseymusic.wave.player

/**
 * Pure queue/persistence helpers for PlaybackManager (M12).
 *
 * The ExoPlayer playlist is a filtered view of the app queue: unplayable
 * tracks are skipped, and an active shuffle reorders the player side. The
 * helpers below let targeted player edits (add/remove/move by media id)
 * resolve player indices without a parallel index map; any inconsistency
 * falls back to a full playlist rebuild at the call site. All functions are
 * pure and host-testable.
 */

/**
 * Player index of [trackId] within the controller's current media ids,
 * or -1 when the track is not in the player playlist.
 */
fun playerIndexOfTrack(controllerMediaIds: List<String>, trackId: String): Int {
    if (trackId.isBlank()) return -1
    return controllerMediaIds.indexOf(trackId)
}

/**
 * Where to insert into the player playlist for a queue insertion.
 *
 * [newQueueIds] is the post-edit app queue, [insertQueuePos] the position the
 * track was inserted at. Returns the player index of the first subsequent
 * queue id that exists in the player playlist, or [controllerMediaIds.size]
 * (append) when none follows. Returns -1 when the mapping is ambiguous
 * (blank ids, out-of-range position) so the caller falls back to rebuild.
 */
fun playerInsertIndexForQueuePos(
    newQueueIds: List<String>,
    controllerMediaIds: List<String>,
    insertQueuePos: Int,
): Int {
    if (insertQueuePos !in 0..newQueueIds.size) return -1
    for (i in insertQueuePos + 1 until newQueueIds.size) {
        val id = newQueueIds[i]
        if (id.isBlank()) return -1
        val playerIndex = controllerMediaIds.indexOf(id)
        if (playerIndex != -1) return playerIndex
    }
    return controllerMediaIds.size
}

/**
 * Player index corresponding to queue position [queuePos] in [newQueueIds]:
 * the count of preceding queue tracks present in the player playlist. Used
 * for move destinations after the caller verified the playlists match.
 * Returns -1 for out-of-range positions so the caller falls back to rebuild.
 */
fun playerIndexForQueuePos(
    newQueueIds: List<String>,
    controllerMediaIds: List<String>,
    queuePos: Int,
): Int {
    if (queuePos !in 0..newQueueIds.size) return -1
    var playerIndex = 0
    for (i in 0 until queuePos) {
        val id = newQueueIds[i]
        if (id.isBlank()) return -1
        if (controllerMediaIds.contains(id)) playerIndex++
    }
    return playerIndex
}

/**
 * Queue index for a Media3 timeline transition (M27.2).
 *
 * Maps the player-side [playerIndex]/[mediaId] onto the app queue: prefers
 * the synced playable-index map when it agrees with the media id, then the
 * raw player index on match, then a media-id search, clamping as a last
 * resort. Pure and host-testable — this is the function that advances
 * automatic continuation playback when a track ends.
 */
fun resolveTransitionQueueIndex(
    playerIndex: Int,
    mediaId: String?,
    queueIds: List<String>,
    syncedPlayableIndices: List<Int>,
): Int {
    if (queueIds.isEmpty()) return 0
    val mappedFromTimeline = syncedPlayableIndices.getOrNull(playerIndex)
    return when {
        mappedFromTimeline != null && mappedFromTimeline in queueIds.indices &&
            (mediaId == null || queueIds[mappedFromTimeline] == mediaId) -> mappedFromTimeline
        playerIndex in queueIds.indices &&
            (mediaId == null || queueIds[playerIndex] == mediaId) -> playerIndex
        mediaId != null -> {
            val found = queueIds.indexOfFirst { it == mediaId }
            if (found != -1) found else playerIndex.coerceIn(0, queueIds.lastIndex)
        }
        else -> playerIndex.coerceIn(0, queueIds.lastIndex)
    }
}

/**
 * Directional slide for a queue-index change (M27.3): +1 when the new index
 * follows the old (Next / natural advance, including wrap from last to
 * first), -1 when it precedes it (Previous, including wrap from first to
 * last), 0 when unchanged. Pure and host-testable — drives directional
 * track-change transitions.
 */
fun advanceDirection(oldIndex: Int, newIndex: Int, queueSize: Int): Int {
    if (queueSize <= 1) return 0
    if (newIndex == oldIndex) return 0
    if (oldIndex == queueSize - 1 && newIndex == 0) return 1
    if (oldIndex == 0 && newIndex == queueSize - 1) return -1
    return if (newIndex > oldIndex) 1 else -1
}

/**
 * Whether persisting [next] adds information over [last]. PlaybackManager
 * persists on many overlapping signals (pause, skip, edits, lifecycle);
 * skipping byte-identical snapshots avoids redundant DataStore writes
 * without changing semantics.
 */
fun shouldPersistPlaybackSession(
    last: PlaybackSessionSnapshot?,
    next: PlaybackSessionSnapshot,
): Boolean {
    return last != next
}
