package com.gresseymusic.wave.data.library

import com.gresseymusic.wave.player.MediaTrack

/**
 * Pure library-list logic (M13 test seams).
 *
 * Each function mirrors one mutation rule in LocalLibraryRepositoryImpl
 * exactly; the implementation delegates to them so host tests pin the real
 * behavior (toggle/dedup/ordering/caps/validation) without a DataStore.
 */

/** Maximum recently-played entries retained, per current implementation. */
const val MAX_RECENTLY_PLAYED = 50

/**
 * Toggles [item] in [current] by [idOf]: removes it when present, otherwise
 * prepends it. Returns the new list and whether the item is now present.
 * Used for liked tracks, saved albums, saved artists, and saved playlists.
 */
fun <T> toggleItemInList(
    current: List<T>,
    item: T,
    idOf: (T) -> String,
): Pair<List<T>, Boolean> {
    val id = idOf(item)
    val existingIndex = current.indexOfFirst { idOf(it) == id }
    return if (existingIndex != -1) {
        Pair(current.filterIndexed { index, _ -> index != existingIndex }, false)
    } else {
        Pair(listOf(item) + current, true)
    }
}

/**
 * Records [track] in recently-played history: de-duplicates by id, prepends
 * as most-recent, and caps the history at [maxSize]. Returns null only when
 * the track carries no stable id — such entries could never resolve, dedupe,
 * or persist. Remote catalog tracks (null local uri, real backend id) are
 * recorded like any successfully played track (M27.2).
 */
fun addTrackToRecent(
    current: List<MediaTrack>,
    track: MediaTrack,
    maxSize: Int = MAX_RECENTLY_PLAYED,
): List<MediaTrack>? {
    if (track.id.isBlank()) return null
    val deduped = current.filterNot { it.id == track.id }
    val updated = listOf(track) + deduped
    return if (updated.size > maxSize) updated.take(maxSize) else updated
}

/**
 * Moves an element within [current]. Returns null for invalid indices or a
 * no-op move, mirroring the playlist-reorder guards.
 */
fun <T> moveItemInList(current: List<T>, fromIndex: Int, toIndex: Int): List<T>? {
    if (fromIndex !in current.indices || toIndex !in current.indices || fromIndex == toIndex) {
        return null
    }
    val updated = current.toMutableList()
    val moved = updated.removeAt(fromIndex)
    updated.add(toIndex, moved)
    return updated
}

/**
 * Appends [track] unless a track with the same id is already present, in
 * which case the existing position is kept. Returns null on duplicate,
 * mirroring the user-playlist duplicate rule.
 */
fun addPlaylistTrackIfAbsent(tracks: List<MediaTrack>, track: MediaTrack): List<MediaTrack>? {
    if (tracks.any { it.id == track.id }) return null
    return tracks + track
}

/**
 * Removes the track with [trackId]. Returns null when absent, mirroring the
 * user-playlist remove rule.
 */
fun removePlaylistTrack(tracks: List<MediaTrack>, trackId: String): List<MediaTrack>? {
    val updated = tracks.filterNot { it.id == trackId }
    return if (updated.size == tracks.size) null else updated
}

/**
 * Artwork for a playlist after track removal: the first remaining track
 * artwork, or null when none remains. Mirrors current implementation.
 */
fun derivePlaylistArtworkAfterRemove(tracks: List<MediaTrack>): String? {
    return tracks.firstOrNull { !it.artworkUrl.isNullOrBlank() }?.artworkUrl
}

/**
 * Playlist titles must be non-blank. Used by create and rename guards.
 */
fun isValidPlaylistTitle(title: String): Boolean {
    return title.isNotBlank()
}

/**
 * Normalizes an optional playlist description: trims, collapsing blank to
 * null. Mirrors current implementation.
 */
fun sanitizePlaylistDescription(description: String?): String? {
    return description?.trim()?.ifBlank { null }
}
