package com.gresseymusic.wave.navigation

import com.gresseymusic.wave.ui.components.WaveBottomTab
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class NavigationRegressionTest {

    @Test
    fun `bottom bar tabs have correct unique routes`() {
        val routes = WaveBottomTab.entries.map { it.route }
        assertEquals(4, routes.size)
        assertEquals(routes.toSet().size, routes.size)
        assertTrue(routes.contains("home"))
        assertTrue(routes.contains("search"))
        assertTrue(routes.contains("library"))
        assertTrue(routes.contains("settings"))
    }

    @Test
    fun `home tab has route home`() {
        assertEquals("home", WaveBottomTab.HOME.route)
        assertEquals("Home", WaveBottomTab.HOME.title)
    }

    @Test
    fun `all tabs define non-empty titles`() {
        WaveBottomTab.entries.forEach { tab ->
            assertTrue(tab.title.isNotBlank())
            assertTrue(tab.route.isNotBlank())
        }
    }
}
