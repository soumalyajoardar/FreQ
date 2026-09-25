package com.gresseymusic.wave.data.settings

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class UserPreferencesTest {

    @Test
    fun `formatGreeting returns appropriate time-of-day greeting without username`() {
        assertEquals("Good night", UserPreferences.formatGreeting(0, null))
        assertEquals("Good night", UserPreferences.formatGreeting(4, null))
        assertEquals("Good morning", UserPreferences.formatGreeting(5, null))
        assertEquals("Good morning", UserPreferences.formatGreeting(11, null))
        assertEquals("Good afternoon", UserPreferences.formatGreeting(12, null))
        assertEquals("Good afternoon", UserPreferences.formatGreeting(17, null))
        assertEquals("Good evening", UserPreferences.formatGreeting(18, null))
        assertEquals("Good evening", UserPreferences.formatGreeting(22, null))
        assertEquals("Good night", UserPreferences.formatGreeting(23, null))
    }

    @Test
    fun `formatGreeting includes personalized username`() {
        assertEquals("Good night, Alex", UserPreferences.formatGreeting(0, "Alex"))
        assertEquals("Good morning, Alex", UserPreferences.formatGreeting(8, "Alex"))
        assertEquals("Good afternoon, Alex", UserPreferences.formatGreeting(14, "Alex"))
        assertEquals("Good evening, Alex", UserPreferences.formatGreeting(19, "Alex"))
        assertEquals("Good night, Alex", UserPreferences.formatGreeting(23, "Alex"))
    }

    @Test
    fun `formatGreeting trims username whitespace`() {
        assertEquals("Good morning, Alex", UserPreferences.formatGreeting(8, "   Alex   "))
    }

    @Test
    fun `formatGreeting ignores blank or empty username`() {
        assertEquals("Good morning", UserPreferences.formatGreeting(8, ""))
        assertEquals("Good morning", UserPreferences.formatGreeting(8, "   "))
    }

    @Test
    fun `formatGreeting clamps out-of-range hours safely`() {
        assertEquals("Good night", UserPreferences.formatGreeting(-5, null))
        assertEquals("Good night", UserPreferences.formatGreeting(99, null))
    }

    @Test
    fun `username length constant is 30`() {
        assertEquals(30, UserPreferences.MAX_USERNAME_LENGTH)
    }
}
