package com.gresseymusic.wave.ui.screens

import org.junit.Assert.*
import org.junit.Test

/**
 * Album meta-line tests (M21). Only real backend fields render — year
 * and/or genuine track count. Missing metadata is omitted, never
 * placeholdered.
 */
class AlbumMetaLineTest {

    @Test
    fun `year and count combine`() {
        assertEquals("2024 • 12 tracks", albumMetaLine("2024", 12))
    }

    @Test
    fun `singular track`() {
        assertEquals("2024 • 1 track", albumMetaLine("2024", 1))
    }

    @Test
    fun `year alone`() {
        assertEquals("2019", albumMetaLine("2019", 0))
    }

    @Test
    fun `count alone when year missing`() {
        assertEquals("8 tracks", albumMetaLine(null, 8))
        assertEquals("8 tracks", albumMetaLine("", 8))
        assertEquals("8 tracks", albumMetaLine("   ", 8))
    }

    @Test
    fun `null when nothing real to show`() {
        assertNull(albumMetaLine(null, 0))
        assertNull(albumMetaLine("", 0))
        assertNull(albumMetaLine(null, -1))
    }
}
