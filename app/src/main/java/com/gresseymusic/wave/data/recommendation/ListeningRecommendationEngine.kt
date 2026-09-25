package com.gresseymusic.wave.data.recommendation

import com.gresseymusic.wave.data.library.SavedArtistItem
import com.gresseymusic.wave.data.model.HomeCatalogSection
import com.gresseymusic.wave.data.model.UserPlaylist
import com.gresseymusic.wave.player.MediaTrack

sealed interface RecommendationState {
    data object ColdStart : RecommendationState
    data class Ready(val tracks: List<MediaTrack>) : RecommendationState
}

/**
 * Pure Kotlin listening-based recommendation engine (M25).
 *
 * Derives personalized recommendations from real local interactions:
 * - Liked tracks
 * - Saved artists
 * - Recently played tracks
 * - User playlist additions
 *
 * Cold-starts honestly when listening history is sparse (< 2 signals).
 * Enforces the invariant that the currently playing track is NEVER recommended.
 */
object ListeningRecommendationEngine {

    const val MIN_LISTENING_SIGNALS = 2

    fun computeRecommendations(
        recentlyPlayed: List<MediaTrack>,
        likedTracks: List<MediaTrack>,
        savedArtists: List<SavedArtistItem>,
        userPlaylists: List<UserPlaylist>,
        catalogSections: List<HomeCatalogSection> = emptyList(),
        currentTrackId: String? = null,
        limit: Int = 10,
    ): RecommendationState {
        val totalSignals = recentlyPlayed.size + likedTracks.size + savedArtists.size +
            userPlaylists.sumOf { it.tracks.size }

        if (totalSignals < MIN_LISTENING_SIGNALS) {
            return RecommendationState.ColdStart
        }

        // Build artist affinity map (artistName.lowercase() -> weight)
        val artistAffinity = mutableMapOf<String, Int>()

        likedTracks.forEach { track ->
            val key = track.artist.trim().lowercase()
            if (key.isNotBlank()) {
                artistAffinity[key] = (artistAffinity[key] ?: 0) + 3
            }
        }

        savedArtists.forEach { artist ->
            val key = artist.name.trim().lowercase()
            if (key.isNotBlank()) {
                artistAffinity[key] = (artistAffinity[key] ?: 0) + 4
            }
        }

        recentlyPlayed.forEach { track ->
            val key = track.artist.trim().lowercase()
            if (key.isNotBlank()) {
                artistAffinity[key] = (artistAffinity[key] ?: 0) + 2
            }
        }

        userPlaylists.flatMap { it.tracks }.forEach { track ->
            val key = track.artist.trim().lowercase()
            if (key.isNotBlank()) {
                artistAffinity[key] = (artistAffinity[key] ?: 0) + 2
            }
        }

        // Gather all candidate tracks
        val candidates = mutableMapOf<String, MediaTrack>()

        catalogSections.flatMap { it.items }.forEach { item ->
            val track = item.track
            if (track != null) {
                candidates.putIfAbsent(track.id, track)
            }
        }

        likedTracks.forEach { candidates.putIfAbsent(it.id, it) }
        recentlyPlayed.forEach { candidates.putIfAbsent(it.id, it) }
        userPlaylists.flatMap { it.tracks }.forEach { candidates.putIfAbsent(it.id, it) }

        // Invariant: Exclude current track
        val eligibleCandidates = candidates.values.filter { track ->
            track.id != currentTrackId
        }

        if (eligibleCandidates.isEmpty()) {
            return RecommendationState.ColdStart
        }

        val likedIds = likedTracks.map { it.id }.toSet()
        val recentIds = recentlyPlayed.map { it.id }.toSet()

        val scored = eligibleCandidates.map { track ->
            val artistKey = track.artist.trim().lowercase()
            val affinity = artistAffinity[artistKey] ?: 0
            var score = affinity * 5
            if (likedIds.contains(track.id)) score += 4
            if (recentIds.contains(track.id)) score += 2
            track to score
        }

        val recommended = scored
            .sortedWith(
                compareByDescending<Pair<MediaTrack, Int>> { it.second }
                    .thenBy { it.first.title }
            )
            .map { it.first }
            .take(limit)

        return if (recommended.isNotEmpty()) {
            RecommendationState.Ready(recommended)
        } else {
            RecommendationState.ColdStart
        }
    }
}
