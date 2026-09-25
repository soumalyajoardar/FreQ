package com.gresseymusic.wave.data.remote

import kotlinx.coroutines.CancellationException
import org.junit.Assert.*
import org.junit.Test
import java.io.IOException

/**
 * Fetch-error classification tests (M13 Areas 6-7).
 * Verifies the exact mapping every backend fetch funnels through:
 * cancellation propagates, typed failures pass through, IO/EOF-style
 * failures become NETWORK_ERROR, and anything else becomes UNKNOWN.
 * (org.json.JSONException cannot be instantiated on the host JVM because
 * org.json is an Android stub there; that branch runs on device and is
 * covered by review of the single `is JSONException` check.)
 */
class FetchErrorMappingTest {

    @Test
    fun `cancellation propagates unchanged`() {
        val cancellation = CancellationException("superseded search")
        try {
            mapFetchError(cancellation, "ctx")
            fail("CancellationException must propagate")
        } catch (e: CancellationException) {
            assertSame(cancellation, e)
        }
    }

    @Test
    fun `typed failures pass through untouched`() {
        val original = YtMusicException(YtMusicErrorKind.RATE_LIMITED, "throttled")
        assertSame(original, mapFetchError(original, "ctx"))
    }

    @Test
    fun `io failures become network errors`() {
        val cause = IOException("UnknownHostException")
        val mapped = mapFetchError(cause, "Search failed")
        assertEquals(YtMusicErrorKind.NETWORK_ERROR, mapped.kind)
        assertSame(cause, mapped.cause)
    }

    @Test
    fun `socket timeouts become network errors`() {
        val mapped = mapFetchError(java.net.SocketTimeoutException("timeout"), "ctx")
        assertEquals(YtMusicErrorKind.NETWORK_ERROR, mapped.kind)
    }

    @Test
    fun `unexpected failures become unknown`() {
        val cause = IllegalStateException("boom")
        val mapped = mapFetchError(cause, "ctx")
        assertEquals(YtMusicErrorKind.UNKNOWN, mapped.kind)
        assertSame(cause, mapped.cause)
    }

    @Test
    fun `mapped errors carry context`() {
        val mapped = mapFetchError(IOException("down"), "Artist fetch failed for ar1")
        assertEquals("Artist fetch failed for ar1", mapped.message)
    }
}
