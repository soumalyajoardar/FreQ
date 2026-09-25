package com.gresseymusic.wave.data.remote

import android.net.Uri
import android.util.Log
import com.gresseymusic.wave.player.MediaTrack
import com.gresseymusic.wave.player.PlaybackSource
import com.gresseymusic.wave.player.RemotePlaybackProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.toRequestBody
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.downloader.Downloader
import org.schabi.newpipe.extractor.downloader.Request
import org.schabi.newpipe.extractor.downloader.Response
import org.schabi.newpipe.extractor.stream.AudioStream
import java.util.concurrent.TimeUnit

import java.util.concurrent.ConcurrentHashMap
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Resolves playable audio for YouTube Music tracks.
 *
 * Strategy, in order:
 * 1. **On-device extraction** via NewPipeExtractor over the phone's own
 *    network. Residential/mobile IPs are not hit by the bot mitigation
 *    ("Video unavailable") that blocks datacenter/serverless IPs, so this
 *    is the primary path.
 * 2. **Backend fallback** to `GET /api/playback/{id}` (yt-dlp on Vercel)
 *    in case on-device extraction fails.
 */
class YtMusicPlaybackProvider(
    private val apiClient: YtMusicApiClient,
) : RemotePlaybackProvider {

    private val trackLocks = ConcurrentHashMap<String, Mutex>()

    override suspend fun resolvePlaybackSource(track: MediaTrack): PlaybackSource {
        if (track.id.isBlank()) return PlaybackSource.Unavailable

        // Prevent duplicate simultaneous extraction/backend requests for the exact same track
        val lock = trackLocks.computeIfAbsent(track.id) { Mutex() }
        return lock.withLock {
            try {
                resolvePlaybackSourceInternal(track)
            } finally {
                trackLocks.remove(track.id)
            }
        }
    }

    private suspend fun resolvePlaybackSourceInternal(track: MediaTrack): PlaybackSource {
        // 1. On-device NewPipe extraction first.
        try {
            withTimeoutOrNull(ON_DEVICE_TIMEOUT_MS) {
                withContext(Dispatchers.IO) { extractOnDevice(track.id) }
            }?.let {
                Log.d(TAG, "On-device stream resolved for ${track.id}")
                return it
            }
        } catch (e: Exception) {
            Log.w(TAG, "On-device extraction failed for ${track.id}, trying backend: ${e.message}")
        }

        // 2. Backend yt-dlp fallback.
        return withContext(Dispatchers.IO) {
            try {
                val response = apiClient.getPlaybackStream(track.id)
                if (response != null && response.available && !response.streamUrl.isNullOrBlank()) {
                    val url = response.streamUrl
                    // Strict Security & Validity check: Only HTTPS URLs with valid host are accepted
                    if (url.startsWith("https://", ignoreCase = true) && isValidHttpsUrl(url)) {
                        try {
                            val expiresAtMs = if (response.expiresIn != null && response.expiresIn > 0) {
                                System.currentTimeMillis() + (response.expiresIn * 1000L)
                            } else {
                                parseExpiryFromUrl(url)
                            }
                            PlaybackSource.RemoteUri(
                                uri = Uri.parse(url),
                                mimeType = response.mimeType ?: "audio/webm",
                                expiresAtMs = expiresAtMs,
                            )
                        } catch (e: Exception) {
                            Log.w(TAG, "Failed parsing backend remote source for ${track.id}", e)
                            PlaybackSource.Unavailable
                        }
                    } else {
                        Log.w(TAG, "Backend returned non-HTTPS or invalid stream URL for ${track.id}")
                        PlaybackSource.Unavailable
                    }
                } else {
                    PlaybackSource.Unavailable
                }
            } catch (e: Exception) {
                Log.w(TAG, "Backend playback stream lookup failed for ${track.id}: ${e.message}")
                PlaybackSource.Unavailable
            }
        }
    }

    private fun isValidHttpsUrl(url: String): Boolean {
        return try {
            val uri = Uri.parse(url)
            uri.scheme.equals("https", ignoreCase = true) && !uri.host.isNullOrBlank()
        } catch (e: Exception) {
            false
        }
    }

    private fun extractOnDevice(videoId: String): PlaybackSource? {
        ensureNewPipeInit()
        val service = NewPipe.getService(0) // YouTube
        val extractor = service.getStreamExtractor("https://www.youtube.com/watch?v=$videoId")
        extractor.fetchPage()

        val streams: List<AudioStream> = extractor.audioStreams ?: return null
        val best = streams
            .filter { !it.url.isNullOrBlank() }
            .maxWithOrNull(
                compareBy(
                    { formatPreference(it) },
                    { it.averageBitrate },
                ),
            ) ?: return null

        val mime = best.format?.mimeType?.takeIf { it.isNotBlank() }
            ?: mimeFromSuffix(best.format?.suffix)
        val expiresAtMs = parseExpiryFromUrl(best.url)
        return PlaybackSource.RemoteUri(
            uri = Uri.parse(best.url),
            mimeType = mime,
            expiresAtMs = expiresAtMs,
        )
    }

    private fun parseExpiryFromUrl(url: String?): Long? {
        if (url.isNullOrBlank()) return null
        return try {
            val uri = Uri.parse(url)
            val expStr = uri.getQueryParameter("expire")
            if (!expStr.isNullOrBlank()) {
                val expSec = expStr.toLong()
                expSec * 1000L
            } else null
        } catch (e: Exception) {
            null
        }
    }

    private fun formatPreference(stream: AudioStream): Int {
        return when (stream.format?.suffix?.lowercase()) {
            "m4a" -> 3
            "opus", "ogg" -> 2
            "webm" -> 1
            else -> 0
        }
    }

    private fun mimeFromSuffix(suffix: String?): String {
        return when (suffix?.lowercase()) {
            "m4a", "mp4" -> "audio/mp4"
            "opus" -> "audio/opus"
            "ogg" -> "audio/ogg"
            "mp3" -> "audio/mpeg"
            else -> "audio/webm"
        }
    }

    companion object {
        private const val TAG = "YtMusicPlayback"
        private const val ON_DEVICE_TIMEOUT_MS = 8_000L

        @Volatile
        private var newPipeReady = false
        private val initLock = Any()

        private fun ensureNewPipeInit() {
            if (newPipeReady) return
            synchronized(initLock) {
                if (newPipeReady) return
                val client = OkHttpClient.Builder()
                    .connectTimeout(10, TimeUnit.SECONDS)
                    .readTimeout(15, TimeUnit.SECONDS)
                    .build()
                NewPipe.init(OkHttpNewPipeDownloader(client))
                newPipeReady = true
            }
        }
    }

    private class OkHttpNewPipeDownloader(
        private val client: OkHttpClient,
    ) : Downloader() {
        override fun execute(request: Request): Response {
            val builder = okhttp3.Request.Builder().url(request.url())
            request.headers().forEach { (name, values) ->
                values.forEach { builder.addHeader(name, it) }
            }
            val body = request.dataToSend()
                ?.toRequestBody("application/octet-stream".toMediaTypeOrNull())
            builder.method(request.httpMethod(), body)
            client.newCall(builder.build()).execute().use { resp ->
                val respBody = resp.body?.string() ?: ""
                return Response(
                    resp.code,
                    resp.message,
                    resp.headers.toMultimap(),
                    respBody,
                    resp.request.url.toString(),
                )
            }
        }
    }
}
