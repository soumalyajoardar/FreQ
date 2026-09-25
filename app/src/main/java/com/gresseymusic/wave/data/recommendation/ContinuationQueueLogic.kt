package com.gresseymusic.wave.data.recommendation

import com.gresseymusic.wave.player.MediaTrack

/**
 * YouTube Music continuation queue assembly (M27.1, vibe-ranked M28).
 *
 * Pure, host-testable mapping from the backend `/api/watch` metadata onto
 * the FreQ Up Next queue. The backend order is relevance; when a [seed]
 * track is supplied, vibe matches (same artist / album / script as the
 * seed) stably move ahead of mismatches — a Bengali seed no longer queues
 * English tracks first. Backend relative order is preserved inside each
 * group, and without a seed the verbatim backend order is kept. This layer
 * only enforces queue invariants:
 *
 * - the currently playing track is never re-queued
 * - tracks already in the active queue are never duplicated
 * - duplicate IDs collapse to their first occurrence
 * - blank IDs are dropped (they can never resolve a PlaybackSource)
 * - the result is capped at [limit] so a single tap cannot flood the queue
 *
 * Thread-safe: pure / stateless.
 */
object ContinuationQueueLogic {

    /** Default Up Next import size: substantial, never a 3-5 item stub. */
    const val CONTINUATION_LIMIT = 25

    /**
     * Backend matches below this count trigger the seed-artist fill: the
     * backend list alone is too thin/off-vibe to stand on.
     */
    const val MIN_BACKEND_MATCHES = 5

    /**
     * Builds the Up Next list from raw [watchTracks].
     *
     * @param currentTrackId seed track; always excluded.
     * @param watchTracks raw backend order (most relevant first).
     * @param existingQueueIds IDs already in the active queue; excluded.
     * @param seed seed track for vibe re-ranking; null keeps verbatim
     * backend order (legacy behavior).
     * @param libraryTracks listening history for transliterated seeds
     * (seed artist's language); empty keeps seed-metadata-only matching.
     * @param artistPool seed-artist search results blended in when backend
     * matches are thin (same voice rescue); empty disables blending.
     * @param limit maximum tracks to return.
     */
    fun buildContinuationQueue(
        currentTrackId: String,
        watchTracks: List<MediaTrack>,
        existingQueueIds: Set<String> = emptySet(),
        seed: MediaTrack? = null,
        libraryTracks: List<MediaTrack> = emptyList(),
        artistPool: List<MediaTrack> = emptyList(),
        limit: Int = CONTINUATION_LIMIT,
    ): List<MediaTrack> {
        if (watchTracks.isEmpty()) return emptyList()
        val capped = limit.coerceAtLeast(0)
        if (capped == 0) return emptyList()
        val seen = LinkedHashSet<String>()
        val eligible = ArrayList<MediaTrack>(watchTracks.size)
        for (track in watchTracks) {
            if (track.id.isBlank()) continue
            if (track.id == currentTrackId) continue
            if (track.id in existingQueueIds) continue
            if (!seen.add(track.id)) continue
            eligible.add(track)
        }
        if (seed == null) {
            return if (eligible.size > capped) eligible.subList(0, capped) else eligible
        }
        // Stable vibe partition: matches keep backend order ahead of
        // mismatches, then the cap applies to the re-ranked list.
        val matches = ArrayList<MediaTrack>(eligible.size)
        val rest = ArrayList<MediaTrack>(eligible.size)
        for (track in eligible) {
            if (VibeMatch.isVibeMatch(seed, track, libraryTracks)) matches.add(track)
            else rest.add(track)
        }
        if (artistPool.isEmpty() || matches.size >= MIN_BACKEND_MATCHES) {
            val ranked = matches + rest
            return if (ranked.size > capped) ranked.subList(0, capped) else ranked
        }
        // Thin backend: seed-artist fill between matches and rest, so the
        // same voice always surfaces near the top. Deduped against
        // everything already placed, then capped.
        val taken = HashSet<String>(existingQueueIds.size + eligible.size + artistPool.size + 1)
        taken.add(currentTrackId)
        taken.addAll(existingQueueIds)
        for (track in eligible) taken.add(track.id)
        val fill = ArrayList<MediaTrack>(artistPool.size)
        for (track in artistPool) {
            if (fill.size + matches.size >= capped) break
            if (track.id.isBlank()) continue
            if (!taken.add(track.id)) continue
            fill.add(track)
        }
        val ranked = matches + fill + rest
        return if (ranked.size > capped) ranked.subList(0, capped) else ranked
    }

    /**
     * Whether a continuation fetch may run for this playback context.
     *
     * Explicit user queues (album / playlist / user playlist) are preserved
     * verbatim: no import ever runs over them.
     */
    fun shouldFetchContinuation(isExplicitQueue: Boolean): Boolean {
        return !isExplicitQueue
    }
}
