package com.gresseymusic.wave.ui.screens

import com.gresseymusic.wave.data.model.HomeCatalogItem
import com.gresseymusic.wave.data.model.HomeCatalogSection
import org.junit.Assert.*
import org.junit.Test

/**
 * Home content-rule tests (M17). The hero is always the first item of the
 * first non-empty backend section — genuine content, never a fixture — and
 * the greeting follows the time of day.
 */
class HomeContentTest {

    private fun item(id: String) = HomeCatalogItem(
        type = "playlist",
        id = id,
        title = "Title $id",
    )

    private fun section(title: String, vararg ids: String) = HomeCatalogSection(
        title = title,
        items = ids.map { item(it) },
    )

    @Test
    fun `hero is first item of first non-empty section`() {
        val sections = listOf(
            section("Throwbacks", "pl1", "pl2"),
            section("Pump it up", "pl3"),
        )
        assertEquals("pl1", selectHomeHero(sections)?.id)
    }

    @Test
    fun `hero skips leading empty sections`() {
        val sections = listOf(
            section("Empty"),
            section("Real", "pl9"),
        )
        assertEquals("pl9", selectHomeHero(sections)?.id)
    }

    @Test
    fun `hero is null without displayable content`() {
        assertNull(selectHomeHero(emptyList()))
        assertNull(selectHomeHero(listOf(section("Empty"), section("Also empty"))))
    }

    @Test
    fun `hero works for song items too`() {
        val sections = listOf(
            HomeCatalogSection(
                title = "New",
                items = listOf(
                    HomeCatalogItem(type = "song", id = "v1", title = "Fresh"),
                ),
            ),
        )
        assertEquals("v1", selectHomeHero(sections)?.id)
    }

    @Test
    fun `greeting follows time of day`() {
        assertEquals("Good night", greetingForHour(0))
        assertEquals("Good night", greetingForHour(4))
        assertEquals("Good morning", greetingForHour(5))
        assertEquals("Good morning", greetingForHour(11))
        assertEquals("Good afternoon", greetingForHour(12))
        assertEquals("Good afternoon", greetingForHour(17))
        assertEquals("Good evening", greetingForHour(18))
        assertEquals("Good evening", greetingForHour(22))
        assertEquals("Good night", greetingForHour(23))
    }

    @Test
    fun `greeting clamps out-of-range hours`() {
        assertEquals("Good night", greetingForHour(-1))
        assertEquals("Good night", greetingForHour(99))
    }
}
