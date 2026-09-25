package com.gresseymusic.wave.data.remote

import org.junit.Assert.*
import org.junit.Test

/**
 * Tests for HTTP failure classification (Milestone 11 fix pass).
 * Pure logic — no network calls.
 */
class YtMusicFailureTest {

    @Test
    fun `404 maps to NOT_FOUND`() {
        assertEquals(YtMusicErrorKind.NOT_FOUND, httpStatusToKind(404))
    }

    @Test
    fun `429 maps to RATE_LIMITED`() {
        assertEquals(YtMusicErrorKind.RATE_LIMITED, httpStatusToKind(429))
    }

    @Test
    fun `5xx maps to SERVER_ERROR`() {
        assertEquals(YtMusicErrorKind.SERVER_ERROR, httpStatusToKind(500))
        assertEquals(YtMusicErrorKind.SERVER_ERROR, httpStatusToKind(502))
        assertEquals(YtMusicErrorKind.SERVER_ERROR, httpStatusToKind(503))
    }

    @Test
    fun `unexpected status maps to UNKNOWN`() {
        assertEquals(YtMusicErrorKind.UNKNOWN, httpStatusToKind(400))
        assertEquals(YtMusicErrorKind.UNKNOWN, httpStatusToKind(401))
        assertEquals(YtMusicErrorKind.UNKNOWN, httpStatusToKind(418))
    }

    @Test
    fun `exception retains kind and message`() {
        val cause = RuntimeException("boom")
        val e = YtMusicException(YtMusicErrorKind.RATE_LIMITED, "throttled", cause)
        assertEquals(YtMusicErrorKind.RATE_LIMITED, e.kind)
        assertEquals("throttled", e.message)
        assertSame(cause, e.cause)
    }

    @Test
    fun `exception is an IOException for backwards-compatible catches`() {
        val e: java.io.IOException = YtMusicException(YtMusicErrorKind.NETWORK_ERROR, "down")
        assertEquals(YtMusicErrorKind.NETWORK_ERROR, (e as YtMusicException).kind)
    }
}
