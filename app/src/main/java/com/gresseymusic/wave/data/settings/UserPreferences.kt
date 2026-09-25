package com.gresseymusic.wave.data.settings

import android.content.Context
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import androidx.datastore.preferences.core.intPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.userDataStore: DataStore<Preferences> by preferencesDataStore(name = "freq_user_preferences")

/**
 * Local user personalization preferences (M25).
 *
 * Persists the user's local display name for personalized greetings
 * without requiring network, external accounts, or tracking.
 */
class UserPreferences(private val context: Context) {

    private val usernameKey = stringPreferencesKey("freq_username")
    private val appOpenCountKey = intPreferencesKey("freq_app_open_count")

    val usernameFlow: Flow<String?> = context.userDataStore.data.map { preferences ->
        preferences[usernameKey]?.takeIf { it.isNotBlank() }
    }

    /** Number of times the app Home has been opened (persisted). */
    val appOpenCountFlow: Flow<Int> = context.userDataStore.data.map { preferences ->
        preferences[appOpenCountKey] ?: 0
    }

    /** Increments the app-open counter and returns the new value. */
    suspend fun incrementAppOpenCount(): Int {
        var next = 1
        context.userDataStore.edit { preferences ->
            val current = preferences[appOpenCountKey] ?: 0
            next = current + 1
            preferences[appOpenCountKey] = next
        }
        return next
    }

    val hasCompletedOnboardingFlow: Flow<Boolean> = usernameFlow.map { it != null }

    /**
     * Validates and persists [name].
     *
     * Invariants:
     * - Must not be blank
     * - Max length: 30 characters
     * - Surrounding whitespace is trimmed
     * - Empty strings are rejected and never saved
     *
     * Returns true if valid and saved, false otherwise.
     */
    suspend fun setUsername(name: String): Boolean {
        val trimmed = name.trim()
        if (trimmed.isBlank() || trimmed.length > MAX_USERNAME_LENGTH) {
            return false
        }
        context.userDataStore.edit { preferences ->
            preferences[usernameKey] = trimmed
        }
        return true
    }

    suspend fun clearUsername() {
        context.userDataStore.edit { preferences ->
            preferences.remove(usernameKey)
        }
    }

    companion object {
        const val MAX_USERNAME_LENGTH = 30

        /**
         * Pure greeting generator based on local hour (0..23) and optional username.
         *
         * Time-of-day ranges:
         * - 05:00 - 11:59: Morning
         * - 12:00 - 16:59: Afternoon
         * - 17:00 - 20:59: Evening
         * - 21:00 - 04:59: Night
         *
         * M27: production Home header uses the two-line hierarchy
         * ([greetingLine1ForHour] + display name). This legacy single-line
         * format is retained for backward-compatible unit tests only.
         */
        fun formatGreeting(hour: Int, username: String?): String {
            val baseGreeting = greetingBaseForHour(hour)
            val validName = username?.trim()?.takeIf { it.isNotBlank() }
            return if (validName != null) {
                "$baseGreeting, $validName"
            } else {
                baseGreeting
            }
        }

        /**
         * M27 base greeting without name or emoji. Pure and unit-tested.
         */
        fun greetingBaseForHour(hour: Int): String {
            return when (hour.coerceIn(0, 23)) {
                in 5..11 -> "Good morning"
                in 12..17 -> "Good afternoon"
                in 18..22 -> "Good evening"
                else -> "Good night"
            }
        }

        /**
         * M27 time-aware emoji for the greeting line. Pure and unit-tested.
         * - Morning -> sun, Afternoon -> sun-behind-cloud,
         *   Evening -> sunset city, Night -> moon.
         */
        fun greetingEmojiForHour(hour: Int): String {
            return when (hour.coerceIn(0, 23)) {
                in 5..11 -> "☀️"
                in 12..17 -> "🌤️"
                in 18..22 -> "🌆"
                else -> "🌙"
            }
        }

        /**
         * M27 line 1 of the Home greeting: "Hi! 👋, [Greeting] [emoji]".
         * Example: "Hi! 👋, Good afternoon 🌤️". Pure and unit-tested.
         */
        fun greetingLine1ForHour(hour: Int): String {
            return "Hi! 👋, ${greetingBaseForHour(hour)} ${greetingEmojiForHour(hour)}"
        }

        /**
         * M27 line 2 of the Home greeting: sanitized display name, or null
         * when no valid name exists (header then shows line 1 only).
         * Pure and unit-tested.
         */
        fun greetingDisplayName(username: String?): String? {
            return username?.trim()?.takeIf { it.isNotBlank() }
        }

        /**
         * Home editorial label: uppercase time-of-day greeting for the
         * design-mock hierarchy ("GOOD MORNING"). Pure.
         */
        fun greetingLabelForHour(hour: Int): String {
            return greetingBaseForHour(hour).uppercase()
        }

        /**
         * Rotating Home headline, driven by the persisted app-open count.
         * Changes every app open; variants stay in the "Music for your day."
         * family. Pure.
         */
        fun headlineForAppOpenCount(count: Int): String {
            val variants = listOf(
                "Music for\nyour day.",
                "Tunes for\nyour mood.",
                "Sound for\nyour story.",
                "Beats for\nyour moments.",
                "Melodies for\nyour mind.",
                "Songs for\nyour journey.",
            )
            val index = ((count - 1).coerceAtLeast(0)) % variants.size
            return variants[index]
        }

        /**
         * Rotating Home sub-headline paired with [headlineForAppOpenCount].
         * Pure.
         */
        fun subHeadlineForAppOpenCount(count: Int): String {
            val variants = listOf(
                "Discover, listen, feel.",
                "Press play, feel more.",
                "Find your rhythm today.",
                "Listen, discover, repeat.",
                "Your day, in songs.",
                "Feel every beat.",
            )
            val index = ((count - 1).coerceAtLeast(0)) % variants.size
            return variants[index]
        }
    }
}

val LocalUserPreferences = staticCompositionLocalOf<UserPreferences> {
    error("UserPreferences not provided")
}
