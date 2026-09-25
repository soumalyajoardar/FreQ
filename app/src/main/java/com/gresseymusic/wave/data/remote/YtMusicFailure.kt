package com.gresseymusic.wave.data.remote

import kotlinx.coroutines.CancellationException
import org.json.JSONException
import java.io.IOException

/**
 * Classified failure kinds for YouTube Music backend calls (Milestone 11).
 *
 * Lets callers distinguish "not found" and "no connectivity" from "server
 * broken" instead of collapsing every failure into null/empty. Cancellation
 * is never represented here — [kotlinx.coroutines.CancellationException] is
 * always rethrown, never wrapped.
 */
enum class YtMusicErrorKind {
    /** HTTP 404, or a blank id that can never resolve. */
    NOT_FOUND,

    /** HTTP 429 — backend throttled the request. */
    RATE_LIMITED,

    /** HTTP 5xx or any other unexpected HTTP status. */
    SERVER_ERROR,

    /** DNS/timeout/connection failures ([IOException] from OkHttp). */
    NETWORK_ERROR,

    /** HTTP 200 with a body that cannot be parsed. */
    MALFORMED_RESPONSE,

    /** Non-IO, non-parsing failure that does not fit above. */
    UNKNOWN,
}

/**
 * Typed failure thrown by [YtMusicApiClient] instead of silently returning
 * null/empty. Extends [IOException] so pre-existing generic catch blocks
 * (e.g. remote playback resolution) keep behaving as before.
 */
class YtMusicException(
    val kind: YtMusicErrorKind,
    message: String,
    cause: Throwable? = null,
) : IOException(message, cause)

/**
 * Maps an HTTP status code to a [YtMusicErrorKind]. Pure function so it can
 * be unit-tested without networking. Only call for non-2xx codes.
 */
fun httpStatusToKind(statusCode: Int): YtMusicErrorKind {
    return when (statusCode) {
        404 -> YtMusicErrorKind.NOT_FOUND
        429 -> YtMusicErrorKind.RATE_LIMITED
        in 500..599 -> YtMusicErrorKind.SERVER_ERROR
        else -> YtMusicErrorKind.UNKNOWN
    }
}

/**
 * Classifies a failure from a backend fetch into a [YtMusicException]
 * (M13 test seam). Cancellation is never wrapped — it always propagates so
 * cooperative cancellation (debounced search, superseded playback) keeps
 * working. Pure except for the CancellationException rethrow; host-testable.
 */
fun mapFetchError(error: Exception, context: String): YtMusicException {
    if (error is CancellationException) throw error
    if (error is YtMusicException) return error
    if (error is IOException) {
        return YtMusicException(YtMusicErrorKind.NETWORK_ERROR, context, error)
    }
    // NOTE: org.json is an Android stub on the host JVM, so JSONException
    // cannot be instantiated in unit tests — but `is` checks against the
    // class load fine, and this branch runs for real on device.
    if (error is JSONException) {
        return YtMusicException(YtMusicErrorKind.MALFORMED_RESPONSE, context, error)
    }
    return YtMusicException(YtMusicErrorKind.UNKNOWN, context, error)
}
