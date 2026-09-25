package com.gresseymusic.wave.data.settings

import org.junit.Assert.*
import org.junit.Test

/**
 * Unified recent-activity history tests (M27.6): submitted queries AND
 * songs tapped from Search results share one ordered, capped, deduped
 * list. Pure decode/encode/ordering — no DataStore needed.
 */
class SearchHistoryTest {

    @Test
    fun `legacy plain-string array decodes as queries`() {
        val decoded = SearchHistory.decodeHistory("""["midnight","espresso"]""")
        assertEquals(2, decoded.size)
        assertEquals(RecentSearchItem.Query("midnight"), decoded[0])
        assertEquals(RecentSearchItem.Query("espresso"), decoded[1])
    }

    @Test
    fun `object format decodes queries and tracks`() {
        val json = """[{"t":"q","q":"midnight"},{"t":"s","id":"abc","title":"Midnight City","artist":"M83","art":"http://x/a.jpg"}]"""
        val decoded = SearchHistory.decodeHistory(json)
        assertEquals(2, decoded.size)
        assertEquals(RecentSearchItem.Query("midnight"), decoded[0])
        assertEquals(
            RecentSearchItem.Track("abc", "Midnight City", "M83", "http://x/a.jpg"),
            decoded[1],
        )
    }

    @Test
    fun `malformed json decodes to empty`() {
        assertTrue(SearchHistory.decodeHistory("not-json").isEmpty())
        assertTrue(SearchHistory.decodeHistory("").isEmpty())
    }

    @Test
    fun `blank entries are dropped on decode`() {
        val decoded = SearchHistory.decodeHistory("""["","   ",{"t":"q","q":"  "},{"t":"s","id":"","title":"X","artist":"Y"}]""")
        assertTrue(decoded.isEmpty())
    }

    @Test
    fun `encode decode round trip preserves order and fields`() {
        val items = listOf(
            RecentSearchItem.Track("id1", "Espresso", "Sabrina Carpenter", null),
            RecentSearchItem.Query("midnight"),
        )
        val decoded = SearchHistory.decodeHistory(SearchHistory.encodeHistory(items))
        assertEquals(items, decoded)
    }

    @Test
    fun `upsert moves duplicate query to front case-insensitively`() {
        val current = listOf(
            RecentSearchItem.Query("espresso"),
            RecentSearchItem.Query("midnight"),
        )
        val updated = SearchHistory.upsertItem(current, RecentSearchItem.Query("MIDNIGHT"))
        assertEquals(2, updated.size)
        assertEquals(RecentSearchItem.Query("MIDNIGHT"), updated[0])
        assertEquals(RecentSearchItem.Query("espresso"), updated[1])
    }

    @Test
    fun `upsert moves duplicate track to front by id`() {
        val current = listOf(
            RecentSearchItem.Query("midnight"),
            RecentSearchItem.Track("abc", "Midnight City", "M83", null),
        )
        val updated = SearchHistory.upsertItem(
            current,
            RecentSearchItem.Track("abc", "Midnight City", "M83", "http://x/new.jpg"),
        )
        assertEquals(2, updated.size)
        assertEquals("http://x/new.jpg", (updated[0] as RecentSearchItem.Track).artworkUrl)
    }

    @Test
    fun `history capped at twenty`() {
        val current = (0 until 25).map { RecentSearchItem.Query("q$it") }
        val updated = SearchHistory.upsertItem(current, RecentSearchItem.Query("new"))
        assertEquals(20, updated.size)
        assertEquals(RecentSearchItem.Query("new"), updated[0])
    }

    @Test
    fun `query and track keys never collide`() {
        assertEquals("q:midnight", RecentSearchItem.Query("Midnight").key)
        assertEquals("t:midnight", RecentSearchItem.Track("midnight", "T", "A", null).key)
    }
}
