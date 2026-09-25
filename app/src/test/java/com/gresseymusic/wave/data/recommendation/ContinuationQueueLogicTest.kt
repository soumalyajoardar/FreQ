package com.gresseymusic.wave.data.recommendation

import com.gresseymusic.wave.player.MediaTrack
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * YouTube Music continuation queue assembly (M27.1).
 *
 * Covers: backend response mapping order, current-track exclusion,
 * deduplication, queue sizing/limit, and explicit-queue preservation gate.
 */
class ContinuationQueueLogicTest {

    private fun track(id: String, title: String = "Title $id") = MediaTrack(
        id = id,
        title = title,
        artist = "Artist",
        album = "Single",
        durationSeconds = 180,
    )

    @Test
    fun `preserves backend relevance order`() {
        val watch = listOf(track("a"), track("b"), track("c"))
        val result = ContinuationQueueLogic.buildContinuationQueue("seed", watch)
        assertEquals(listOf("a", "b", "c"), result.map { it.id })
    }

    @Test
    fun `excludes the currently playing track`() {
        val watch = listOf(track("seed"), track("a"), track("seed"), track("b"))
        val result = ContinuationQueueLogic.buildContinuationQueue("seed", watch)
        assertTrue(result.none { it.id == "seed" })
        assertEquals(listOf("a", "b"), result.map { it.id })
    }

    @Test
    fun `deduplicates by stable track id keeping first occurrence`() {
        val watch = listOf(track("a", "First"), track("b"), track("a", "Second"))
        val result = ContinuationQueueLogic.buildContinuationQueue("seed", watch)
        assertEquals(listOf("a", "b"), result.map { it.id })
        assertEquals("First", result.first { it.id == "a" }.title)
    }

    @Test
    fun `excludes tracks already in the active queue`() {
        val watch = listOf(track("a"), track("b"), track("c"))
        val result = ContinuationQueueLogic.buildContinuationQueue(
            currentTrackId = "seed",
            watchTracks = watch,
            existingQueueIds = setOf("seed", "b"),
        )
        assertEquals(listOf("a", "c"), result.map { it.id })
    }

    @Test
    fun `drops blank ids and caps at limit`() {
        val watch = listOf(track(""), track("a")) + (1..50).map { track("t$it") }
        val result = ContinuationQueueLogic.buildContinuationQueue("seed", watch, limit = 25)
        assertEquals(25, result.size)
        assertTrue(result.none { it.id.isBlank() })
        assertEquals("a", result.first().id)
    }

    @Test
    fun `empty input yields empty queue and zero limit yields empty`() {
        assertTrue(ContinuationQueueLogic.buildContinuationQueue("seed", emptyList()).isEmpty())
        assertTrue(
            ContinuationQueueLogic.buildContinuationQueue("seed", listOf(track("a")), limit = 0).isEmpty(),
        )
    }

    @Test
    fun `continuation fetch gate preserves explicit queues`() {
        // Single-track context may import; explicit album/playlist queues never.
        assertTrue(ContinuationQueueLogic.shouldFetchContinuation(isExplicitQueue = false))
        assertTrue(!ContinuationQueueLogic.shouldFetchContinuation(isExplicitQueue = true))
    }

    @Test
    fun `default limit is substantial not a stub`() {
        assertTrue(ContinuationQueueLogic.CONTINUATION_LIMIT >= 20)
    }

    @Test
    fun `seed re-ranks vibe matches ahead preserving backend order`() {
        val seed = MediaTrack(
            id = "seed",
            title = "বাংলা গান",
            artist = "বাংলা শিল্পী",
            album = "Single",
            durationSeconds = 180,
        )
        val english = MediaTrack(
            id = "en",
            title = "Shape of You",
            artist = "Ed Sheeran",
            album = "Divide",
            durationSeconds = 180,
        )
        val bengali = MediaTrack(
            id = "bn",
            title = "সোনার বাংলা",
            artist = "অন্য শিল্পী",
            album = "Single",
            durationSeconds = 180,
        )
        val result = ContinuationQueueLogic.buildContinuationQueue(
            currentTrackId = "seed",
            watchTracks = listOf(english, bengali),
            seed = seed,
        )
        assertEquals(listOf("bn", "en"), result.map { it.id })
    }

    @Test
    fun `null seed keeps verbatim backend order`() {
        val watch = listOf(track("a"), track("b"))
        val result = ContinuationQueueLogic.buildContinuationQueue("seed", watch, seed = null)
        assertEquals(listOf("a", "b"), result.map { it.id })
    }

    @Test
    fun `transliterated seed re-ranks through artist history`() {
        val seed = MediaTrack(
            id = "seed",
            title = "Shesh Chithi",
            artist = "Anupam Roy",
            album = "Single",
            durationSeconds = 180,
        )
        val history = listOf(
            MediaTrack(
                id = "h1",
                title = "পুরনো গান",
                artist = "Anupam Roy",
                album = "Single",
                durationSeconds = 180,
            ),
        )
        val english = MediaTrack(
            id = "en",
            title = "Shape of You",
            artist = "Ed Sheeran",
            album = "Divide",
            durationSeconds = 180,
        )
        val bengali = MediaTrack(
            id = "bn",
            title = "সোনার বাংলা",
            artist = "অন্য শিল্পী",
            album = "Single",
            durationSeconds = 180,
        )
        val result = ContinuationQueueLogic.buildContinuationQueue(
            currentTrackId = "seed",
            watchTracks = listOf(english, bengali),
            seed = seed,
            libraryTracks = history,
        )
        assertEquals(listOf("bn", "en"), result.map { it.id })
    }

    @Test
    fun `thin backend blends artist pool between matches and rest`() {
        val seed = MediaTrack(
            id = "seed",
            title = "বাংলা গান",
            artist = "বাংলা শিল্পী",
            album = "Single",
            durationSeconds = 180,
        )
        val match = MediaTrack(
            id = "bn1",
            title = "সোনার বাংলা",
            artist = "অন্য শিল্পী",
            album = "Single",
            durationSeconds = 180,
        )
        val rest = (1..6).map { i ->
            MediaTrack(
                id = "en$i",
                title = "English Song $i",
                artist = "Foreign Artist $i",
                album = "Album $i",
                durationSeconds = 180,
            )
        }
        val pool = listOf(
            MediaTrack(id = "a1", title = "Acoustic Take", artist = "বাংলা শিল্পী", album = "Single", durationSeconds = 180),
            MediaTrack(id = "en1", title = "Dupe of Rest", artist = "Someone", album = "Single", durationSeconds = 180),
            MediaTrack(id = "seed", title = "Seed Dupe", artist = "X", album = "Single", durationSeconds = 180),
            MediaTrack(id = "a2", title = "Live Version", artist = "বাংলা শিল্পী", album = "Single", durationSeconds = 180),
        )
        val result = ContinuationQueueLogic.buildContinuationQueue(
            currentTrackId = "seed",
            watchTracks = listOf(match) + rest,
            seed = seed,
            artistPool = pool,
        )
        assertEquals(
            listOf("bn1", "a1", "a2", "en1", "en2", "en3", "en4", "en5", "en6"),
            result.map { it.id },
        )
    }

    @Test
    fun `rich backend ignores artist pool`() {
        val seed = MediaTrack(
            id = "seed",
            title = "বাংলা গান",
            artist = "বাংলা শিল্পী",
            album = "Single",
            durationSeconds = 180,
        )
        val matches = (1..6).map { i ->
            MediaTrack(
                id = "bn$i",
                title = "বাংলা $i",
                artist = "শিল্পী $i",
                album = "Single",
                durationSeconds = 180,
            )
        }
        val pool = listOf(
            MediaTrack(id = "a1", title = "Acoustic Take", artist = "বাংলা শিল্পী", album = "Single", durationSeconds = 180),
        )
        val result = ContinuationQueueLogic.buildContinuationQueue(
            currentTrackId = "seed",
            watchTracks = matches + track("en"),
            seed = seed,
            artistPool = pool,
        )
        assertEquals(
            listOf("bn1", "bn2", "bn3", "bn4", "bn5", "bn6", "en"),
            result.map { it.id },
        )
        assertTrue(result.none { it.id == "a1" })
    }
}
