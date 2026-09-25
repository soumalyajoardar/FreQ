package com.gresseymusic.wave.data.playback

/**
 * Queue-ID persistence codec (M13 test seam).
 *
 * PlaybackPersistence stores the queue as a single comma-joined string.
 * These pure functions are the exact encode/decode rules; the persistence
 * layer delegates to them so host tests exercise the real logic instead of
 * a re-implementation.
 */
fun encodeQueueIds(ids: List<String>): String {
    return ids.joinToString(",")
}

fun decodeQueueIds(raw: String?): List<String> {
    if (raw.isNullOrBlank()) return emptyList()
    return raw.split(",").map { it.trim() }.filter { it.isNotBlank() }
}
