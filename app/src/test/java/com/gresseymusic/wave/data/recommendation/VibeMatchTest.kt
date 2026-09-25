package com.gresseymusic.wave.data.recommendation

import com.gresseymusic.wave.player.MediaTrack
import org.junit.Assert.*
import org.junit.Test

/**
 * Vibe matching (M28): same-language autoplay. Bengali seeds must rank
 * Bengali candidates above English history, on both autoplay paths.
 */
class VibeMatchTest {

    private fun track(id: String, title: String, artist: String, album: String = "Single") =
        MediaTrack(id = id, title = title, artist = artist, album = album, durationSeconds = 180)

    // ------------------------------------------------------------------
    // Script detection
    // ------------------------------------------------------------------

    @Test
    fun `latin detected`() {
        assertEquals(
            VibeMatch.TrackScript.LATIN,
            VibeMatch.dominantScript("Shape of You"),
        )
    }

    @Test
    fun `bengali detected`() {
        assertEquals(
            VibeMatch.TrackScript.BENGALI,
            VibeMatch.dominantScript("আমার সোনার বাংলা"),
        )
    }

    @Test
    fun `devanagari detected`() {
        assertEquals(
            VibeMatch.TrackScript.DEVANAGARI,
            VibeMatch.dominantScript("दिल चाहता है"),
        )
    }

    @Test
    fun `empty and non-letters yield none`() {
        assertEquals(VibeMatch.TrackScript.NONE, VibeMatch.dominantScript(""))
        assertEquals(VibeMatch.TrackScript.NONE, VibeMatch.dominantScript("123 ?!..."))
    }

    @Test
    fun `mixed title tie resolves to native script`() {
        assertEquals(VibeMatch.TrackScript.BENGALI, VibeMatch.dominantScript("বা ab"))
    }

    @Test
    fun `track script reads title plus artist plus album`() {
        val t = track("x", "বাংলা গান", "বাংলা শিল্পী")
        assertEquals(VibeMatch.TrackScript.BENGALI, VibeMatch.trackScriptOf(t))
    }

    // ------------------------------------------------------------------
    // Artist / album / tokens
    // ------------------------------------------------------------------

    @Test
    fun `same artist matches case-insensitively`() {
        val a = track("a", "Song One", "Arijit Singh")
        val b = track("b", "Song Two", "arijit singh")
        assertTrue(VibeMatch.isSameArtist(a, b))
    }

    @Test
    fun `single and blank albums never match`() {
        val a = track("a", "Song One", "Artist A", album = "Single")
        val b = track("b", "Song Two", "Artist B", album = "Single")
        assertFalse(VibeMatch.isSameAlbum(a, b))
        val c = track("c", "Song Three", "Artist C", album = "")
        assertFalse(VibeMatch.isSameAlbum(a, c))
    }

    @Test
    fun `equal albums match`() {
        val a = track("a", "Song One", "Artist A", album = "Midnight Dreams")
        val b = track("b", "Song Two", "Artist B", album = "midnight dreams")
        assertTrue(VibeMatch.isSameAlbum(a, b))
    }

    @Test
    fun `shared significant title words counted`() {
        val a = track("a", "Shape of You Remix", "Artist A")
        val b = track("b", "Perfect Remix", "Artist B")
        assertEquals(1, VibeMatch.sharedTitleTokens(a, b))
    }

    // ------------------------------------------------------------------
    // Scoring
    // ------------------------------------------------------------------

    @Test
    fun `same-script pair outscores cross-script pair`() {
        val seed = track("s", "বাংলা গান", "বাংলা শিল্পী")
        val same = track("b", "সোনার বাংলা", "অন্য শিল্পী")
        val other = track("e", "Shape of You", "Ed Sheeran")
        assertTrue(VibeMatch.vibeScore(seed, same) > VibeMatch.vibeScore(seed, other))
    }

    @Test
    fun `isVibeMatch needs a strong signal`() {
        val seed = track("s", "বাংলা গান", "বাংলা শিল্পী")
        val sameScript = track("b", "সোনার বাংলা", "অন্য শিল্পী")
        val mismatch = track("e", "Shape of You", "Ed Sheeran")
        assertTrue(VibeMatch.isVibeMatch(seed, sameScript))
        assertFalse(VibeMatch.isVibeMatch(seed, mismatch))
    }

    @Test
    fun `same artist matches across scripts`() {
        val seed = track("s", "বাংলা গান", "Arijit Singh")
        val other = track("e", "Perfect", "Arijit Singh")
        assertTrue(VibeMatch.isVibeMatch(seed, other))
    }

    // ------------------------------------------------------------------
    // Seed language resolution (transliterated metadata)
    // ------------------------------------------------------------------

    @Test
    fun `native seed script wins over history`() {
        val seed = track("s", "বাংলা গান", "বাংলা শিল্পী")
        val englishHistory = listOf(track("h", "Shape of You", "Ed Sheeran"))
        assertEquals(
            VibeMatch.TrackScript.BENGALI,
            VibeMatch.resolveSeedScript(seed, englishHistory),
        )
    }

    @Test
    fun `transliterated seed resolves through seed artist history`() {
        val seed = track("s", "Shesh Chithi", "Anupam Roy")
        val history = listOf(
            track("h1", "Chithi Acoustic", "Anupam Roy"),
            track("h2", "পুরনো গান", "Anupam Roy"),
        )
        assertEquals(
            VibeMatch.TrackScript.BENGALI,
            VibeMatch.resolveSeedScript(seed, history),
        )
    }

    @Test
    fun `genuine english seed stays latin`() {
        val seed = track("s", "Shape of You", "Ed Sheeran")
        val history = listOf(track("h", "Perfect", "Ed Sheeran"))
        assertEquals(
            VibeMatch.TrackScript.LATIN,
            VibeMatch.resolveSeedScript(seed, history),
        )
    }

    @Test
    fun `unknown latin seed without history stays latin`() {
        val seed = track("s", "Mystery Song", "Unknown Voice")
        assertEquals(
            VibeMatch.TrackScript.LATIN,
            VibeMatch.resolveSeedScript(seed),
        )
    }

    @Test
    fun `scriptless seed falls back to library dominant script`() {
        val seed = track("s", "", "", album = "")
        val history = listOf(track("h", "বাংলা গান", "বাংলা শিল্পী"))
        assertEquals(
            VibeMatch.TrackScript.BENGALI,
            VibeMatch.resolveSeedScript(seed, history),
        )
    }

    @Test
    fun `transliterated seed matches native-script candidate`() {
        val seed = track("s", "Shesh Chithi", "Anupam Roy")
        val history = listOf(track("h", "পুরনো গান", "Anupam Roy"))
        val bengali = track("b", "সোনার বাংলা", "অন্য শিল্পী")
        val english = track("e", "Shape of You", "Ed Sheeran")
        assertTrue(VibeMatch.isVibeMatch(seed, bengali, history))
        assertFalse(VibeMatch.isVibeMatch(seed, english, history))
    }

    // ------------------------------------------------------------------
    // Generic-response guard
    // ------------------------------------------------------------------

    @Test
    fun `generic list for native seed is rejected`() {
        val seed = track("s", "বাংলা গান", "বাংলা শিল্পী")
        val generic = listOf(
            track("e1", "Animal", "KATSEYE"),
            track("e2", "Shape of You", "Ed Sheeran"),
        )
        assertFalse(VibeMatch.shouldUseContinuation(seed, generic))
    }

    @Test
    fun `list with one vibe match is accepted`() {
        val seed = track("s", "বাংলা গান", "বাংলা শিল্পী")
        val mixed = listOf(
            track("e1", "Animal", "KATSEYE"),
            track("b1", "সোনার বাংলা", "অন্য শিল্পী"),
        )
        assertTrue(VibeMatch.shouldUseContinuation(seed, mixed))
    }

    @Test
    fun `undeterminable seed keeps backend list`() {
        val seed = track("s", "Mystery Song", "Unknown Voice")
        val generic = listOf(track("e1", "Animal", "KATSEYE"))
        assertTrue(VibeMatch.shouldUseContinuation(seed, generic))
    }

    @Test
    fun `empty list is never usable`() {
        val seed = track("s", "বাংলা গান", "বাংলা শিল্পী")
        assertFalse(VibeMatch.shouldUseContinuation(seed, emptyList()))
    }

    // ------------------------------------------------------------------
    // Section popularity
    // ------------------------------------------------------------------

    @Test
    fun `trending and chart sections score highest`() {
        assertEquals(12, VibeMatch.sectionPopularityBonus("Trending Now"))
        assertEquals(12, VibeMatch.sectionPopularityBonus("Top Charts"))
    }

    @Test
    fun `top viral popular sections score next`() {
        assertEquals(10, VibeMatch.sectionPopularityBonus("Top Hits"))
        assertEquals(10, VibeMatch.sectionPopularityBonus("Viral 50"))
        assertEquals(10, VibeMatch.sectionPopularityBonus("Popular Right Now"))
    }

    @Test
    fun `hits and hot sections score below top`() {
        assertEquals(8, VibeMatch.sectionPopularityBonus("Hot Hits"))
    }

    @Test
    fun `rooftop is not top`() {
        assertEquals(0, VibeMatch.sectionPopularityBonus("Rooftop Sessions"))
    }

    @Test
    fun `generic rails score zero`() {
        assertEquals(0, VibeMatch.sectionPopularityBonus("Made For You"))
        assertEquals(0, VibeMatch.sectionPopularityBonus("Catalog"))
        assertEquals(0, VibeMatch.sectionPopularityBonus(""))
    }
}
