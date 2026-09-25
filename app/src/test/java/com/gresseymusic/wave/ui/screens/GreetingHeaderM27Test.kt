package com.gresseymusic.wave.ui.screens

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * M27 Home header helpers: two-line hierarchy delegates to UserPreferences.
 */
class GreetingHeaderM27Test {

    @Test
    fun `line1 helper matches spec examples`() {
        assertEquals("Hi! 👋, Good morning ☀️", greetingLine1ForHour(8))
        assertEquals("Hi! 👋, Good afternoon 🌤️", greetingLine1ForHour(14))
        assertEquals("Hi! 👋, Good evening 🌆", greetingLine1ForHour(20))
        assertEquals("Hi! 👋, Good night 🌙", greetingLine1ForHour(2))
    }

    @Test
    fun `display name helper trims or nulls`() {
        assertEquals("Alex", greetingDisplayNameForUser("Alex"))
        assertEquals("Alex", greetingDisplayNameForUser("  Alex  "))
        assertNull(greetingDisplayNameForUser(null))
        assertNull(greetingDisplayNameForUser("   "))
    }

    @Test
    fun `legacy greeting still backward compatible`() {
        // Existing tests rely on the legacy single-line format.
        assertEquals("Good morning", greetingForHour(8))
        assertEquals("Good night", greetingForHour(23))
    }
}
