package com.gresseymusic.wave.data.remote

import org.junit.Assert.*
import org.junit.Test

/**
 * Tests for JSON-null-safe field extraction (M11 follow-up fix).
 *
 * The backend emits explicit JSON nulls for absent optional fields
 * (verified on production `/api/home`: `"artist":null`, `"album":null`,
 * ...). org.json's `optString` coerces those into the literal string
 * "null", which leaked into the UI as item subtitles reading "null".
 * These pure helpers collapse missing/blank/"null" into null/defaults;
 * the parsing call sites route every nullable/defaulted field through them.
 */
class SanitizeFieldTest {

    @Test
    fun `nullable keeps real values`() {
        assertEquals("The Hits: '80s", YtMusicApiClient.sanitizeNullableField("The Hits: '80s"))
        assertEquals("Billie Eilish", YtMusicApiClient.sanitizeNullableField("Billie Eilish"))
    }

    @Test
    fun `nullable collapses null`() {
        assertNull(YtMusicApiClient.sanitizeNullableField(null))
    }

    @Test
    fun `nullable collapses blank`() {
        assertNull(YtMusicApiClient.sanitizeNullableField(""))
        assertNull(YtMusicApiClient.sanitizeNullableField("   "))
    }

    @Test
    fun `nullable collapses JSON-null coercion artifact`() {
        // This is the exact string org.json produces for a JSON null value.
        assertNull(YtMusicApiClient.sanitizeNullableField("null"))
    }

    @Test
    fun `defaulted keeps real values`() {
        assertEquals(
            "Throwbacks",
            YtMusicApiClient.sanitizeFieldOrDefault("Throwbacks", "Featured"),
        )
    }

    @Test
    fun `defaulted falls back on null blank and null-string`() {
        assertEquals("Featured", YtMusicApiClient.sanitizeFieldOrDefault(null, "Featured"))
        assertEquals("Featured", YtMusicApiClient.sanitizeFieldOrDefault("", "Featured"))
        assertEquals("Featured", YtMusicApiClient.sanitizeFieldOrDefault("   ", "Featured"))
        assertEquals("Featured", YtMusicApiClient.sanitizeFieldOrDefault("null", "Featured"))
    }
}
