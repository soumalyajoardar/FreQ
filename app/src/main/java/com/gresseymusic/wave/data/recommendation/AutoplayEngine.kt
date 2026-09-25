package com.gresseymusic.wave.data.recommendation

import com.gresseymusic.wave.data.library.LocalLibraryRepository
import com.gresseymusic.wave.data.library.SavedArtistItem
import com.gresseymusic.wave.data.model.HomeCatalogSection
import com.gresseymusic.wave.data.model.UserPlaylist
import com.gresseymusic.wave.data.repository.CatalogResult
import com.gresseymusic.wave.data.repository.MusicRepository
import com.gresseymusic.wave.player.MediaTrack

/**
 * FreQ Autoplay Engine (M26).
 *
 * Generates an "Up Next" autoplay queue when a user starts playback from a
 * single track without an explicit multi-track context (e.g. tapping a track
 * on Home / Search / Library). Composes multiple real catalog signals to rank
 * candidates without introducing any fake / mock data.
 *
 * Signal priority (highest first):
 * 1. Vibe match with the current track: same artist, same album, same
 *    writing script (language family), shared title words — a Bengali
 *    seed now ranks Bengali candidates above English history.
 * 2. Popularity: chart/trending catalog sections outrank generic rails,
 *    and earlier catalog positions (backend relevance order) get a small
 *    nudge. Backend continuation rank plays the same role on that path.
 * 3. Liked tracks (user preference)
 * 4. Recently played tracks (listening history)
 * 5. User playlist contents (curated by the user)
 * 6. Home catalog sections (broad discovery pool)
 *
 * The current track is ALWAYS excluded from the generated queue.
 * Duplicate IDs are de-duplicated; only the highest-ranked occurrence of each
 * track is kept.
 *
 * Thread-safe: all methods are pure / stateless.
 */
object AutoplayEngine {

    /** Default target size for the autoplay queue. */
    const val DEFAULT_LIMIT = 15

    /** Head value of the catalog-position nudge (decays to 0). */
    const val POSITION_NUDGE_MAX = 6

    /** Minimum distinct listening signals before personalization is attempted. */
    private const val MIN_SIGNALS = 1

    /**
     * Generates the autoplay queue for [currentTrack] using all available
     * signals from [libraryRepository] and the [catalogSections] pool.
     *
     * Returns an empty list when no real candidates are available — never
     * injects fake/test tracks.
     *
     * @param currentTrack The track currently playing (excluded from result).
     * @param recentlyPlayed Ordered history from [libraryRepository] (most recent first).
     * @param likedTracks Tracks the user has liked.
     * @param savedArtists Artists the user has saved.
     * @param userPlaylists User-created playlists.
     * @param catalogSections Home catalog sections for broad discovery.
     * @param searchPool Seed-artist search results (same voice enrichment
     * when the pool lacks vibe matches); scored identically.
     * @param limit Maximum number of tracks to return.
     */
    fun generateAutoplayQueue(
        currentTrack: MediaTrack,
        recentlyPlayed: List<MediaTrack> = emptyList(),
        likedTracks: List<MediaTrack> = emptyList(),
        savedArtists: List<SavedArtistItem> = emptyList(),
        userPlaylists: List<UserPlaylist> = emptyList(),
        catalogSections: List<HomeCatalogSection> = emptyList(),
        searchPool: List<MediaTrack> = emptyList(),
        limit: Int = DEFAULT_LIMIT,
    ): List<MediaTrack> {
        val currentArtistKey = currentTrack.artist.trim().lowercase()

        // Build artist affinity map  (artistName.lowercase -> weight)
        val artistAffinity = mutableMapOf<String, Int>()

        // Liked tracks: weight 3
        likedTracks.forEach { track ->
            val key = track.artist.trim().lowercase()
            if (key.isNotBlank()) artistAffinity[key] = (artistAffinity[key] ?: 0) + 3
        }

        // Saved artists: weight 4
        savedArtists.forEach { artist ->
            val key = artist.name.trim().lowercase()
            if (key.isNotBlank()) artistAffinity[key] = (artistAffinity[key] ?: 0) + 4
        }

        // Recently played: weight 2
        recentlyPlayed.forEach { track ->
            val key = track.artist.trim().lowercase()
            if (key.isNotBlank()) artistAffinity[key] = (artistAffinity[key] ?: 0) + 2
        }

        // User playlist contents: weight 2
        userPlaylists.flatMap { it.tracks }.forEach { track ->
            val key = track.artist.trim().lowercase()
            if (key.isNotBlank()) artistAffinity[key] = (artistAffinity[key] ?: 0) + 2
        }

        // Gather all candidate tracks, de-duplicating by ID
        // The order of insertion determines the tiebreaker when scores are equal.
        // Popularity travels alongside: the strongest section bonus seen per
        // track (trending/chart rails outrank generic ones) plus the first
        // flattened catalog position (backend relevance order, small nudge).
        val candidates = linkedMapOf<String, MediaTrack>()
        val sectionBonusById = mutableMapOf<String, Int>()
        val positionById = mutableMapOf<String, Int>()
        var flatIndex = 0
        for (section in catalogSections) {
            val sectionBonus = VibeMatch.sectionPopularityBonus(section.title)
            for (item in section.items) {
                val track = item.track ?: continue
                if (track.id !in candidates) {
                    candidates[track.id] = track
                    positionById[track.id] = flatIndex
                }
                if (sectionBonus > (sectionBonusById[track.id] ?: 0)) {
                    sectionBonusById[track.id] = sectionBonus
                }
                flatIndex++
            }
        }

        // Seed-artist search pool (M28c): same voice, usually same
        // language. Appended after catalog so catalog order still wins
        // ties; same-artist scoring (+20) carries these to the top.
        for (track in searchPool) {
            if (track.id.isBlank()) continue
            if (track.id !in candidates) {
                candidates[track.id] = track
                positionById[track.id] = flatIndex
            }
            flatIndex++
        }

        // Liked tracks — high personal relevance
        likedTracks.forEach { candidates.putIfAbsent(it.id, it) }

        // Recently played — high recency relevance
        recentlyPlayed.forEach { candidates.putIfAbsent(it.id, it) }

        // User playlist contents
        userPlaylists.flatMap { it.tracks }.forEach { candidates.putIfAbsent(it.id, it) }

        // Invariant: NEVER recommend the currently playing track
        val eligible = candidates.values.filter { it.id != currentTrack.id }

        if (eligible.isEmpty()) return emptyList()

        val likedIds = likedTracks.map { it.id }.toSet()
        val recentIds = recentlyPlayed.take(20).map { it.id }.toSet()

        // Language context for transliterated seeds (M28b): the seed
        // artist's language resolved from library history.
        val libraryContext = recentlyPlayed + likedTracks + userPlaylists.flatMap { it.tracks }

        // Score each candidate
        val scored = eligible.map { track ->
            val artistKey = track.artist.trim().lowercase()
            val affinity = artistAffinity[artistKey] ?: 0
            var score = affinity * 5

            // Strong bonus for same artist as current track
            if (artistKey == currentArtistKey && currentArtistKey.isNotBlank()) score += 20

            // Vibe match (M28): same script/album/title-words keep the
            // queue in the seed's language and mood. Same-artist vibe is
            // already covered above, so only the remaining components
            // apply here (script + album + tokens).
            score += vibeComponents(currentTrack, track, libraryContext)

            // Popularity (M28): trending/chart rails plus backend
            // relevance position. Small next to vibe/personal signals —
            // a matching deep cut still beats a mismatched hit.
            score += sectionBonusById[track.id] ?: 0
            score += positionNudge(positionById[track.id])

            // Personal preference signals
            if (likedIds.contains(track.id)) score += 8
            if (recentIds.contains(track.id)) score += 4

            track to score
        }

        return scored
            .sortedWith(
                compareByDescending<Pair<MediaTrack, Int>> { it.second }
                    .thenBy { it.first.title },
            )
            .map { it.first }
            .take(limit)
    }

    /**
     * Vibe components of [VibeMatch.vibeScore] excluding same-artist
     * (already bonused above as +20). Keeps one definition of script /
     * album / token matching shared with the continuation path.
     */
    private fun vibeComponents(
        seed: MediaTrack,
        candidate: MediaTrack,
        libraryTracks: List<MediaTrack>,
    ): Int {
        var score = 0
        if (VibeMatch.isSameAlbum(seed, candidate)) score += VibeMatch.SAME_ALBUM_BONUS
        score += VibeMatch.scriptScore(seed, candidate, libraryTracks)
        score += VibeMatch.sharedTitleTokens(seed, candidate)
            .coerceAtMost(VibeMatch.MAX_TOKEN_HITS) * VibeMatch.TOKEN_BONUS
        return score
    }

    /**
     * Small nudge for early catalog positions (backend relevance order):
     * 6 at the head decaying to 0. Pure.
     */
    private fun positionNudge(flatIndex: Int?): Int {
        if (flatIndex == null) return 0
        return (POSITION_NUDGE_MAX - flatIndex).coerceAtLeast(0)
    }

    /**
     * Checks whether the current state represents an autoplay-generated queue
     * or an intentional user-specified queue (album, playlist, explicit user
     * queue). Used by PlaybackManager to decide whether to generate autoplay.
     *
     * An autoplay queue is identified by the [isAutoplayQueue] flag set by
     * PlaybackManager when it generates autoplay tracks via this engine.
     */
    fun isAutoplaySafeToGenerate(
        existingQueueSize: Int,
        isExplicitQueue: Boolean,
    ): Boolean {
        // Only generate autoplay when:
        // - This is NOT an intentional user-assembled queue (album, playlist, user queue)
        // - The existing queue is empty or a single-track context
        return !isExplicitQueue && existingQueueSize <= 1
    }
}
