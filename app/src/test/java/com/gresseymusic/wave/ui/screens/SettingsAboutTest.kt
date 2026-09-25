package com.gresseymusic.wave.ui.screens

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Unit tests for Settings and About helper logic (M24).
 */
class SettingsAboutTest {

    @Test
    fun `formatLibrarySummary formats singular and plural counts`() {
        assertEquals(
            "0 liked songs • 0 playlists • 0 in history",
            formatLibrarySummary(likedCount = 0, playlistCount = 0, historyCount = 0),
        )
        assertEquals(
            "1 liked song • 1 playlist • 1 in history",
            formatLibrarySummary(likedCount = 1, playlistCount = 1, historyCount = 1),
        )
        assertEquals(
            "25 liked songs • 4 playlists • 120 in history",
            formatLibrarySummary(likedCount = 25, playlistCount = 4, historyCount = 120),
        )
    }
}
