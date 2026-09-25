package com.gresseymusic.wave.data.recommendation

import com.gresseymusic.wave.player.MediaTrack

/**
 * Vibe matching for autoplay (M28).
 *
 * The autoplay bug: a Bengali seed produced English Up Next tracks because
 * scoring only knew artist affinity + history, and backend continuation
 * order was taken verbatim. This layer adds language/script awareness from
 * the only metadata every track carries (title / artist / album):
 *
 * - same artist → strongest signal (same voice, same vibe)
 * - same album → strong signal (same record, same era)
 * - same writing script → strong signal (Bengali seed → Bengali tracks,
 *   Latin seed → Latin tracks). Script is the most reliable language
 *   proxy available offline: Bengali, Devanagari, Tamil, etc. scripts
 *   almost never mix languages, and transliterated titles still match
 *   through the artist/album signals.
 * - shared significant title words → weak signal (lofi, remix, cover…)
 *
 * Pure / stateless / unit-tested.
 */
object VibeMatch {

    /** Writing scripts detectable from track metadata. */
    enum class TrackScript {
        NONE,
        BENGALI,
        DEVANAGARI,
        TAMIL,
        TELUGU,
        KANNADA,
        MALAYALAM,
        GURMUKHI,
        GUJARATI,
        ARABIC,
        CJK,
        LATIN,
        OTHER,
    }

    /** Same-artist bonus: same voice dominates the queue. */
    const val SAME_ARTIST_BONUS = 50

    /** Same-album bonus: same record, same era. */
    const val SAME_ALBUM_BONUS = 30

    /** Same-script bonus: same language family. */
    const val SAME_SCRIPT_BONUS = 25

    /** Per shared title token (len >= 4), capped at [MAX_TOKEN_HITS]. */
    const val TOKEN_BONUS = 4
    const val MAX_TOKEN_HITS = 3

    /**
     * Popularity bonus from a catalog section title (M28). No view counts
     * exist in backend metadata, so chart/trending sections are the honest
     * popularity signal: an item in "Trending Now" is definitionally more
     * popular than one in a generic rail. Keyword weights (max wins, never
     * stacked):
     *
     * - trending / charts → 12
     * - top / viral / popular → 10
     * - hits / hot → 8
     * - new (fresh editorial) → 4
     *
     * Word-boundary matched so "Rooftop" is not "top". Pure.
     */
    const val SECTION_TRENDING_BONUS = 12
    const val SECTION_TOP_BONUS = 10
    const val SECTION_HITS_BONUS = 8
    const val SECTION_NEW_BONUS = 4

    private val TOP_WORD = Regex("\\btop\\b")
    private val HOT_WORD = Regex("\\bhot\\b")

    fun sectionPopularityBonus(sectionTitle: String): Int {
        val t = sectionTitle.lowercase()
        var best = 0
        if ("trend" in t || "chart" in t) best = maxOf(best, SECTION_TRENDING_BONUS)
        if (TOP_WORD.containsMatchIn(t) || "viral" in t || "popular" in t) {
            best = maxOf(best, SECTION_TOP_BONUS)
        }
        if ("hits" in t || HOT_WORD.containsMatchIn(t)) best = maxOf(best, SECTION_HITS_BONUS)
        if ("new" in t) best = maxOf(best, SECTION_NEW_BONUS)
        return best
    }

    /**
     * Dominant writing script of [text]. Counts letters per Unicode block;
     * the block with the most letters wins. Ties resolve to the first
     * script in priority order (Indic scripts before Latin), so a mixed
     * "বাংলা Song" title still reads as Bengali. No letters → [NONE].
     * Pure.
     */
    fun dominantScript(text: String): TrackScript {
        var latin = 0
        var bengali = 0
        var devanagari = 0
        var tamil = 0
        var telugu = 0
        var kannada = 0
        var malayalam = 0
        var gurmukhi = 0
        var gujarati = 0
        var arabic = 0
        var cjk = 0
        var other = 0
        for (c in text) {
            when (c) {
                in 'A'..'Z', in 'a'..'z', in 'À'..'ɏ' -> latin++
                in '\u0980'..'\u09FF' -> bengali++
                in '\u0900'..'\u097F' -> devanagari++
                in '\u0B80'..'\u0BFF' -> tamil++
                in '\u0C00'..'\u0C7F' -> telugu++
                in '\u0C80'..'\u0CFF' -> kannada++
                in '\u0D00'..'\u0D7F' -> malayalam++
                in '\u0A00'..'\u0A7F' -> gurmukhi++
                in '\u0A80'..'\u0AFF' -> gujarati++
                in '\u0600'..'\u06FF' -> arabic++
                in '\u3040'..'\u30FF', in '\u4E00'..'\u9FFF', in '\uAC00'..'\uD7AF' -> cjk++
                else -> if (c.isLetter()) other++
            }
        }
        // Priority order decides ties: specific scripts first, Latin after
        // (a mixed native+Latin title reads as native), OTHER last.
        val ranked = listOf(
            TrackScript.BENGALI to bengali,
            TrackScript.DEVANAGARI to devanagari,
            TrackScript.TAMIL to tamil,
            TrackScript.TELUGU to telugu,
            TrackScript.KANNADA to kannada,
            TrackScript.MALAYALAM to malayalam,
            TrackScript.GURMUKHI to gurmukhi,
            TrackScript.GUJARATI to gujarati,
            TrackScript.ARABIC to arabic,
            TrackScript.CJK to cjk,
            TrackScript.LATIN to latin,
            TrackScript.OTHER to other,
        )
        val best = ranked.maxByOrNull { it.second }
        if (best == null || best.second == 0) return TrackScript.NONE
        return best.first
    }

    /** Script of a track from its title + artist + album. Pure. */
    fun trackScriptOf(track: MediaTrack): TrackScript {
        // Title first: a Bengali song by a Latin-named artist (the norm on
        // YT Music) is Bengali. Only transliterated/unknown titles fall
        // back to the full-text vote, where a native artist can still tip
        // the balance.
        val titleScript = dominantScript(track.title)
        if (titleScript != TrackScript.NONE && titleScript != TrackScript.LATIN) {
            return titleScript
        }
        return dominantScript("${track.title} ${track.artist} ${track.album}")
    }

    /**
     * Dominant script across [tracks] (first-seen wins ties). Skips
     * scriptless tracks; empty input → [NONE]. Pure.
     */
    fun dominantScriptOfTracks(
        tracks: List<MediaTrack>,
        nativeFirstOnTie: Boolean = false,
    ): TrackScript {
        val counts = LinkedHashMap<TrackScript, Int>()
        for (track in tracks) {
            val script = trackScriptOf(track)
            if (script == TrackScript.NONE) continue
            counts[script] = (counts[script] ?: 0) + 1
        }
        return pickDominant(counts, nativeFirstOnTie)
    }

    /**
     * Dominant TITLE script across [tracks]. Titles carry the song's
     * language; artists/albums are often transliterated, so history
     * language reads titles only. Pure.
     */
    fun dominantTitleScript(
        tracks: List<MediaTrack>,
        nativeFirstOnTie: Boolean = false,
    ): TrackScript {
        val counts = LinkedHashMap<TrackScript, Int>()
        for (track in tracks) {
            val script = dominantScript(track.title)
            if (script == TrackScript.NONE) continue
            counts[script] = (counts[script] ?: 0) + 1
        }
        return pickDominant(counts, nativeFirstOnTie)
    }

    private fun pickDominant(
        counts: LinkedHashMap<TrackScript, Int>,
        nativeFirstOnTie: Boolean,
    ): TrackScript {
        if (counts.isEmpty()) return TrackScript.NONE
        if (!nativeFirstOnTie) return counts.maxByOrNull { it.value }?.key ?: TrackScript.NONE
        // Transliteration is the common case for regional artists: on a
        // tie, a native script beats Latin (Latin beats OTHER beats NONE
        // only as a last resort).
        return counts.entries
            .sortedWith(
                compareByDescending<Map.Entry<TrackScript, Int>> { it.value }
                    .thenBy { nativeTieRank(it.key) },
            )
            .firstOrNull()?.key ?: TrackScript.NONE
    }

    private fun nativeTieRank(script: TrackScript): Int {
        return when (script) {
            TrackScript.LATIN -> 1
            TrackScript.OTHER -> 2
            TrackScript.NONE -> 3
            else -> 0
        }
    }

    /**
     * Effective language script of [seed] (M28b).
     *
     * Transliterated metadata ("Shesh Chithi" / "Anupam Roy") reads as
     * Latin, which made English queues look like matches. Resolution:
     * native script on the seed wins outright; otherwise the seed
     * artist's language from [libraryTracks] (history); otherwise Latin
     * for Latin metadata, or the library dominant script for scriptless
     * metadata. Pure.
     */
    fun resolveSeedScript(
        seed: MediaTrack,
        libraryTracks: List<MediaTrack> = emptyList(),
    ): TrackScript {
        val own = trackScriptOf(seed)
        if (own != TrackScript.LATIN && own != TrackScript.NONE) return own
        if (libraryTracks.isNotEmpty()) {
            val byArtist = libraryTracks.filter { isSameArtist(seed, it) }
            if (byArtist.isNotEmpty()) {
                val artistScript = dominantTitleScript(byArtist, nativeFirstOnTie = true)
                if (artistScript != TrackScript.NONE) return artistScript
            }
            if (own != TrackScript.LATIN) {
                val libraryScript = dominantScriptOfTracks(libraryTracks)
                if (libraryScript != TrackScript.NONE) return libraryScript
            }
        }
        return own
    }

    /** Normalized non-blank artist equality. Pure. */
    fun isSameArtist(a: MediaTrack, b: MediaTrack): Boolean {
        val ka = a.artist.trim().lowercase()
        val kb = b.artist.trim().lowercase()
        return ka.isNotBlank() && ka == kb
    }

    /**
     * Normalized album equality. Backend fallbacks ("Single", blank) are
     * not real metadata and never match. Pure.
     */
    fun isSameAlbum(a: MediaTrack, b: MediaTrack): Boolean {
        val ka = a.album.trim().lowercase()
        val kb = b.album.trim().lowercase()
        if (ka.isBlank() || kb.isBlank()) return false
        if (ka == "single" || kb == "single") return false
        return ka == kb
    }

    /**
     * Count of shared significant title words (length >= 4, case-folded),
     * e.g. "lofi", "remix". Pure.
     */
    fun sharedTitleTokens(a: MediaTrack, b: MediaTrack): Int {
        val ta = titleTokens(a.title)
        if (ta.isEmpty()) return 0
        val tb = titleTokens(b.title)
        if (tb.isEmpty()) return 0
        return ta.intersect(tb).size
    }

    private fun titleTokens(title: String): Set<String> {
        return title.lowercase()
            .split(Regex("[^\\p{L}\\p{N}]+"))
            .filter { it.length >= 4 }
            .toSet()
    }

    /**
     * Script component of the vibe score: [SAME_SCRIPT_BONUS] when the
     * candidate matches the seed's resolved language ([resolveSeedScript]).
     * Pure.
     */
    fun scriptScore(
        seed: MediaTrack,
        candidate: MediaTrack,
        libraryTracks: List<MediaTrack> = emptyList(),
    ): Int {
        val resolved = resolveSeedScript(seed, libraryTracks)
        if (resolved == TrackScript.NONE) return 0
        return if (trackScriptOf(candidate) == resolved) SAME_SCRIPT_BONUS else 0
    }

    /**
     * Total vibe score of [candidate] against [seed]. Higher = closer vibe.
     * Pure.
     */
    fun vibeScore(
        seed: MediaTrack,
        candidate: MediaTrack,
        libraryTracks: List<MediaTrack> = emptyList(),
    ): Int {
        var score = 0
        if (isSameArtist(seed, candidate)) score += SAME_ARTIST_BONUS
        if (isSameAlbum(seed, candidate)) score += SAME_ALBUM_BONUS
        score += scriptScore(seed, candidate, libraryTracks)
        score += sharedTitleTokens(seed, candidate).coerceAtMost(MAX_TOKEN_HITS) * TOKEN_BONUS
        return score
    }

    /**
     * Whether [candidate] belongs to [seed]'s vibe: any strong signal hit
     * (same artist, same album, or resolved-language script). Pure.
     */
    fun isVibeMatch(
        seed: MediaTrack,
        candidate: MediaTrack,
        libraryTracks: List<MediaTrack> = emptyList(),
    ): Boolean {
        return isSameArtist(seed, candidate) ||
            isSameAlbum(seed, candidate) ||
            scriptScore(seed, candidate, libraryTracks) > 0
    }

    /**
     * Count of [tracks] matching [seed]'s vibe. Pure. Used to detect a
     * generic (seed-independent) backend response: a continuation with
     * zero matches for a determinable-language seed is ignored in favor
     * of the local engine.
     */
    fun countVibeMatches(
        seed: MediaTrack,
        tracks: List<MediaTrack>,
        libraryTracks: List<MediaTrack> = emptyList(),
    ): Int {
        return tracks.count { isVibeMatch(seed, it, libraryTracks) }
    }

    /**
     * Whether a backend continuation is worth using (M28c): usable when it
     * contains at least one vibe match, or when the seed language is
     * undeterminable (Latin without history — nothing better exists).
     * A non-Latin seed with zero matches means the backend returned a
     * generic list (same trending queue for every song) — discard it.
     * Pure.
     */
    fun shouldUseContinuation(
        seed: MediaTrack,
        watchTracks: List<MediaTrack>,
        libraryTracks: List<MediaTrack> = emptyList(),
    ): Boolean {
        if (watchTracks.isEmpty()) return false
        if (countVibeMatches(seed, watchTracks, libraryTracks) > 0) return true
        val resolved = resolveSeedScript(seed, libraryTracks)
        return resolved == TrackScript.LATIN || resolved == TrackScript.NONE
    }
}
