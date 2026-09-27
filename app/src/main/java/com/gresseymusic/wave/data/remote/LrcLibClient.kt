package com.gresseymusic.wave.data.remote

import android.util.Log
import com.gresseymusic.wave.data.model.SyncedLyricLine
import com.gresseymusic.wave.data.model.TrackLyrics
import com.gresseymusic.wave.player.MediaTrack
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import okhttp3.Call
import okhttp3.Callback
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * LRCLIB lyrics reads (M28e, on-device).
 *
 * The production freq-api backend exposes no lyrics endpoint, so backend
 * lyrics resolve to null for every song. LRCLIB (lrclib.net, free, no key)
 * fills the gap from the device: exact match on artist + title (+ album /
 * duration when known), then a first-artist retry for "A, B" credits.
 * 404s and transport failures yield null — the flip card renders the
 * honest empty state. Never throws except on genuine cancellation.
 */
open class LrcLibClient(
    var baseUrl: String = "https://lrclib.net/",
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .callTimeout(15, TimeUnit.SECONDS)
        .build(),
) {

    open suspend fun getLyrics(track: MediaTrack): TrackLyrics? {
        val title = track.title.trim()
        val artist = track.artist.trim()
        if (title.isBlank() || artist.isBlank()) return null
        return try {
            withContext(Dispatchers.IO) {
                fetchExact(artist, title, track.album, track.durationSeconds)
                    ?: fetchExact(firstArtist(artist), title, track.album, track.durationSeconds)
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Log.w(TAG, "[LrcLib] lookup failed for '${track.id}': ${e.message}")
            null
        }
    }

    private suspend fun fetchExact(
        artist: String,
        title: String,
        album: String?,
        durationSeconds: Int,
    ): TrackLyrics? {
        if (artist.isBlank()) return null
        val base = baseUrl.trimEnd('/').toHttpUrlOrNull() ?: return null
        val url = base.newBuilder()
            .addPathSegment("api")
            .addPathSegment("get")
            .addQueryParameter("artist_name", artist)
            .addQueryParameter("track_name", title)
            .apply {
                val cleanAlbum = album?.trim().takeIf { !it.isNullOrBlank() && !it.equals("Single", ignoreCase = true) }
                if (cleanAlbum != null) addQueryParameter("album_name", cleanAlbum)
                if (durationSeconds > 0) addQueryParameter("duration", durationSeconds.toString())
            }
            .build()
        val request = Request.Builder()
            .url(url)
            .header("User-Agent", LRCLIB_USER_AGENT)
            .build()
        executeCancellable(request).use { response ->
            if (response.code == 404) return null
            if (!response.isSuccessful) return null
            val body = response.body?.string() ?: return null
            return parseLrcLibResult(body)
        }
    }

    private suspend fun executeCancellable(request: Request): Response {
        val call = client.newCall(request)
        return suspendCancellableCoroutine { cont ->
            cont.invokeOnCancellation { call.cancel() }
            call.enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    if (!cont.isCompleted) cont.resumeWithException(e)
                }

                override fun onResponse(call: Call, response: Response) {
                    if (!cont.isCompleted) cont.resume(response)
                    else response.close()
                }
            })
        }
    }

    companion object {
        private const val TAG = "LrcLib"
        private const val LRCLIB_USER_AGENT = "WAVE/1.0 (https://freq-api.vercel.app/)"

        /**
         * First artist of a credit string ("A, B" / "A & B" / "A feat B"
         * → "A"). Pure.
         */
        fun firstArtist(artist: String): String {
            return artist
                .split(Regex("(?i)\\s+feat\\.?\\s+|\\s+ft\\.?\\s+"))
                .firstOrNull()
                ?.split(",", "&", "×")
                ?.firstOrNull()
                ?.trim()
                .orEmpty()
        }

        /**
         * Lyric lines from an LRCLIB `/api/get` body, or null when it
         * carries no usable plain lyrics. Pure.
         */
        fun parseLrcLibBody(body: String): List<String>? {
            return parseLrcLibResult(body)?.lines
        }

        /**
         * Full lyric payload (plain + synced lines) from an LRCLIB
         * `/api/get` body, or null when it carries no usable plain
         * lyrics. Pure.
         */
        fun parseLrcLibResult(body: String): TrackLyrics? {
            return try {
                val json = JSONObject(body)
                val plain = json.optString("plainLyrics", "")
                if (plain.isBlank()) return null
                val lines = plain.lines().map { it.trim() }.filter { it.isNotEmpty() }
                if (lines.isEmpty()) return null
                TrackLyrics(
                    lines = lines,
                    synced = parseSyncedLyrics(json.optString("syncedLyrics", "")),
                )
            } catch (_: Exception) {
                null
            }
        }

        private val LRC_LINE_REGEX = Regex("^\\[(\\d+):(\\d+(?:\\.\\d+)?)\\](.*)$")

        /**
         * Timestamped lines from LRC text ("[mm:ss.xx] lyric"). Metadata
         * tags ([ar:], [ti:], [length:]) and blank cues are dropped;
         * cues sort by time. Pure and unit-tested.
         */
        fun parseSyncedLyrics(lrc: String): List<SyncedLyricLine> {
            if (lrc.isBlank()) return emptyList()
            val out = ArrayList<SyncedLyricLine>()
            for (raw in lrc.lines()) {
                val match = LRC_LINE_REGEX.matchEntire(raw.trim()) ?: continue
                val minutes = match.groupValues[1].toLongOrNull() ?: continue
                val seconds = match.groupValues[2].toDoubleOrNull() ?: continue
                val text = match.groupValues[3].trim()
                if (text.isEmpty()) continue
                out.add(SyncedLyricLine(timeMs = minutes * 60_000L + (seconds * 1000).toLong(), text = text))
            }
            out.sortBy { it.timeMs }
            return out
        }
    }
}
