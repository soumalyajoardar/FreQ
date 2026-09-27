package com.gresseymusic.wave.data.remote

import org.junit.Assert.*
import org.junit.Test

class LrcLibClientTest {

    @Test
    fun `parses plain lyrics body`() {
        val body = """{"id":123,"name":"Agua","trackName":"Agua","artistName":"Maluma","plainLyrics":"Line one\nLine two\n\nLine three\n"}"""
        assertEquals(
            listOf("Line one", "Line two", "Line three"),
            LrcLibClient.parseLrcLibBody(body),
        )
    }

    @Test
    fun `missing or blank lyrics yield null`() {
        assertNull(LrcLibClient.parseLrcLibBody("""{"id":1}"""))
        assertNull(LrcLibClient.parseLrcLibBody("""{"plainLyrics":"  \n  "}"""))
        assertNull(LrcLibClient.parseLrcLibBody("not json"))
        assertNull(LrcLibClient.parseLrcLibBody(""))
    }

    @Test
    fun `first artist splits credits`() {
        assertEquals("Maluma", LrcLibClient.firstArtist("Maluma, Shakira"))
        assertEquals("Shakira", LrcLibClient.firstArtist("Shakira & Maluma"))
        assertEquals("Arijit Singh", LrcLibClient.firstArtist("Arijit Singh feat Neha"))
        assertEquals("Alex", LrcLibClient.firstArtist("Alex"))
        assertEquals("", LrcLibClient.firstArtist("   "))
    }

    @Test
    fun `synced lines parse timestamps`() {
        val synced = LrcLibClient.parseSyncedLyrics("[00:12.34] Hello\n[01:02.50] World\n")
        assertEquals(2, synced.size)
        assertEquals(12_340L, synced[0].timeMs)
        assertEquals("Hello", synced[0].text)
        assertEquals(62_500L, synced[1].timeMs)
    }

    @Test
    fun `synced parse drops tags blanks and sorts`() {
        val synced = LrcLibClient.parseSyncedLyrics(
            "[ar:Someone]\n[ti:Title]\n[length:03:14]\n[00:20.00] Second\n[00:05.00] First\n[00:30.00]   \nnot a cue\n",
        )
        assertEquals(listOf("First", "Second"), synced.map { it.text })
        assertEquals(5_000L, synced[0].timeMs)
    }

    @Test
    fun `synced empty on blank or garbage`() {
        assertTrue(LrcLibClient.parseSyncedLyrics("").isEmpty())
        assertTrue(LrcLibClient.parseSyncedLyrics("no cues here").isEmpty())
    }

    @Test
    fun `result carries synced lines`() {
        val body = """{"plainLyrics":"Hello\nWorld","syncedLyrics":"[00:01.00] Hello\n[00:05.00] World"}"""
        val result = LrcLibClient.parseLrcLibResult(body)
        assertEquals(listOf("Hello", "World"), result?.lines)
        assertEquals(2, result?.synced?.size)
        assertEquals(1_000L, result?.synced?.first()?.timeMs)
    }
}
