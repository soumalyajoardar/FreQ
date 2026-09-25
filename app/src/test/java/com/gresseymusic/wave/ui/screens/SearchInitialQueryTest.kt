package com.gresseymusic.wave.ui.screens

import org.junit.Assert.*
import org.junit.Test

/**
 * Production Search must open with an empty query (M11 follow-up fix).
 * A leftover development default pre-filled "billie eilish" and fired an
 * unwanted search on entry.
 */
class SearchInitialQueryTest {

    @Test
    fun `initial query is empty`() {
        assertEquals("", SEARCH_INITIAL_QUERY)
    }

    @Test
    fun `initial query contains no demo text`() {
        assertFalse(SEARCH_INITIAL_QUERY.contains("billie", ignoreCase = true))
        assertTrue(SEARCH_INITIAL_QUERY.isBlank())
    }
}
