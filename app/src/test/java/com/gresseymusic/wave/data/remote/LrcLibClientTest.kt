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
}
