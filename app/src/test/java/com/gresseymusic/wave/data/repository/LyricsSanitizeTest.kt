package com.gresseymusic.wave.data.repository

import org.junit.Assert.*
import org.junit.Test

class LyricsSanitizeTest {

    @Test
    fun `blanks are dropped and lines trimmed`() {
        assertEquals(
            listOf("Hello", "World"),
            sanitizeLyricsLines(listOf("  Hello  ", "", "   ", "World")),
        )
    }

    @Test
    fun `empty input stays empty`() {
        assertTrue(sanitizeLyricsLines(emptyList()).isEmpty())
    }

    @Test
    fun `output is capped at max lines`() {
        val lines = List(MAX_LYRICS_LINES + 50) { "line $it" }
        val cleaned = sanitizeLyricsLines(lines)
        assertEquals(MAX_LYRICS_LINES, cleaned.size)
        assertEquals("line 0", cleaned.first())
    }
}
