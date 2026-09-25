package com.gresseymusic.wave.data.repository

import com.gresseymusic.wave.data.remote.YtMusicApiClient
import com.gresseymusic.wave.data.remote.YtMusicErrorKind
import com.gresseymusic.wave.data.remote.YtMusicException
import com.gresseymusic.wave.player.MediaTrack
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test

/**
 * Mock/test-infrastructure safety (M13 Area 13).
 *
 * MockMusicRepository must remain available for development and tests, but
 * production catalog paths must never silently substitute its content.
 * These guards fail if anyone rewires a mock fallback into the production
 * repository.
 */
class NoMockFallbackTest {

    @Test
    fun `production repository declares no mock dependency`() {
        val fields = YtMusicRepository::class.java.declaredFields
        assertTrue(
            "YtMusicRepository must not hold a MockMusicRepository field",
            fields.none { it.type == MockMusicRepository::class.java },
        )
        val constructorParams = YtMusicRepository::class.java.declaredConstructors
            .flatMap { it.parameterTypes.toList() }
        assertTrue(
            "YtMusicRepository must not accept a MockMusicRepository",
            constructorParams.none { it == MockMusicRepository::class.java },
        )
    }

    @Test
    fun `production repository defaults carry no mock content`() {
        // YtMusicRepository's no-arg dependencies must not serve mock tracks:
        // home/library tracks are empty and nullable lookups stay null-safe
        // without throwing or consulting mock data.
        val repository = YtMusicRepository(apiClient = UnreachableApiClient())
        runBlocking {
            assertTrue(repository.getHomeTracks().isEmpty())
            assertTrue(repository.getLibraryTracks().isEmpty())
        }
    }

    @Test
    fun `mock repository remains usable for development and tests`() {
        val mock = MockMusicRepository()
        runBlocking {
            assertTrue(mock.getHomeTracks().isNotEmpty())
            assertTrue(mock.getLibraryTracks().isNotEmpty())
            assertNotNull(mock.getTrack(mock.getHomeTracks().first().id))
        }
    }

    /**
     * An ApiClient whose network always fails fast without touching DNS.
     * Proves the production repository degrades without mock substitution.
     */
    private class UnreachableApiClient : YtMusicApiClient("https://unreachable.invalid/") {
        override suspend fun searchTracks(query: String): List<MediaTrack> {
            throw YtMusicException(YtMusicErrorKind.NETWORK_ERROR, "offline")
        }
    }
}
