package com.gresseymusic.wave.data.settings

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * M27 two-line greeting hierarchy. Line 1 is "[Greeting] [emoji]",
 * line 2 is the sanitized display name on its own line.
 */
class GreetingM27Test {

    @Test
    fun `base greeting follows time of day`() {
        assertEquals("Good night", UserPreferences.greetingBaseForHour(0))
        assertEquals("Good night", UserPreferences.greetingBaseForHour(4))
        assertEquals("Good morning", UserPreferences.greetingBaseForHour(5))
        assertEquals("Good morning", UserPreferences.greetingBaseForHour(11))
        assertEquals("Good afternoon", UserPreferences.greetingBaseForHour(12))
        assertEquals("Good afternoon", UserPreferences.greetingBaseForHour(17))
        assertEquals("Good evening", UserPreferences.greetingBaseForHour(18))
        assertEquals("Good evening", UserPreferences.greetingBaseForHour(22))
        assertEquals("Good night", UserPreferences.greetingBaseForHour(23))
    }

    @Test
    fun `emoji follows time of day`() {
        assertEquals("☀️", UserPreferences.greetingEmojiForHour(8))
        assertEquals("🌤️", UserPreferences.greetingEmojiForHour(14))
        assertEquals("🌆", UserPreferences.greetingEmojiForHour(19))
        assertEquals("🌙", UserPreferences.greetingEmojiForHour(23))
        assertEquals("🌙", UserPreferences.greetingEmojiForHour(3))
    }

    @Test
    fun `line1 combines greeting and emoji`() {
        assertEquals("Hi! 👋, Good morning ☀️", UserPreferences.greetingLine1ForHour(8))
        assertEquals("Hi! 👋, Good afternoon 🌤️", UserPreferences.greetingLine1ForHour(14))
        assertEquals("Hi! 👋, Good evening 🌆", UserPreferences.greetingLine1ForHour(19))
        assertEquals("Hi! 👋, Good night 🌙", UserPreferences.greetingLine1ForHour(23))
    }

    @Test
    fun `display name is trimmed or null`() {
        assertEquals("Alex", UserPreferences.greetingDisplayName("Alex"))
        assertEquals("Alex", UserPreferences.greetingDisplayName("   Alex   "))
        assertNull(UserPreferences.greetingDisplayName(null))
        assertNull(UserPreferences.greetingDisplayName(""))
        assertNull(UserPreferences.greetingDisplayName("   "))
    }

    @Test
    fun `line1 never contains comma-name format`() {
        // M27 forbids "Good afternoon, Alex" single-line format in production.
        val line1 = UserPreferences.greetingLine1ForHour(14)
        // New format has "Hi! 👋, Good afternoon 🌤️" - comma after greeting, not before name
        assertEquals(false, line1.contains(", Alex"))
        assertEquals(false, line1.contains("Alex"))
    }
}
