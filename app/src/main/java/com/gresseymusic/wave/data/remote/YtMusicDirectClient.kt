package com.gresseymusic.wave.data.remote

import android.util.Log
import com.gresseymusic.wave.data.model.FoundArtist
import com.gresseymusic.wave.player.MediaTrack
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeout
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONArray
import org.json.JSONObject
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.downloader.Downloader
import org.schabi.newpipe.extractor.services.youtube.YoutubeParsingHelper
import java.io.IOException
import java.util.TimeZone
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Direct YouTube Music catalog reads (Musify-style).
 *
 * Musify talks to YouTube/YouTube Music straight from the device instead
 * of through a middleman backend: catalog/search through the YouTube
 * Music InnerTube API, streams through the YouTube InnerTube player. WAVE
 * already does the second half on-device (NewPipe Extractor first, yt-dlp
 * backend fallback in [YtMusicPlaybackProvider]); this client covers the
 * first half — search — so the app no longer depends solely on freq-api.
 *
 * Implementation notes:
 * - Same endpoint NewPipe itself uses for YT Music search
 *   (`music.youtube.com/youtubei/v1/search`), same WEB_REMIX client
 *   context, same songs-filter params, same client-version/headers
 *   helpers ([YoutubeParsingHelper]) — so it tracks upstream fixes
 *   instead of forking protocol details.
 * - NewPipe-first ordering with the same 8s budget as playback; any
 *   failure (network, timeout, HTTP error, changed JSON shape) returns
 *   null so [com.gresseymusic.wave.data.repository.YtMusicRepository]
 *   falls back to the freq-api backend. No mock fallback, ever.
 */
const val DIRECT_SEARCH_TIMEOUT_MS = 8_000L

private const val TAG = "DirectSearch"
private const val INNERTUBE_SEARCH_URL =
    "https://music.youtube.com/youtubei/v1/search?prettyPrint=false"
// YT Music "Songs" search-filter params (same bytes NewPipe sends).
private const val MUSIC_SONGS_PARAMS = "Eg-KAQwIARAAGAAgACgAMABqChAEEAUQAxAKEAk="
// YT Music "Artists" search-filter params (ytmusicapi filter mapping,
// verified live against music.youtube.com: returns the Artists shelf).
private const val MUSIC_ARTISTS_PARAMS = "EgWKAQIgAWoMEA4QChADEAQQCRAF"

open class YtMusicDirectClient {

    private val client = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .callTimeout(15, TimeUnit.SECONDS)
        .build()

    /**
     * Direct song search. Returns null when the backend should take over
     * (network/timeout/parse failure); empty list only for non-searchable
     * queries, mirroring [YtMusicApiClient.searchTracks]. Genuine
     * cancellation always propagates.
     */
    open suspend fun searchSongs(query: String): List<MediaTrack>? {
        val trimmed = query.trim()
        if (!YtMusicApiClient.isSearchableQuery(trimmed)) return emptyList()
        return try {
            withTimeout(DIRECT_SEARCH_TIMEOUT_MS) { fetchSearchSongs(trimmed) }
        } catch (e: TimeoutCancellationException) {
            Log.w(TAG, "[DirectSearch] timeout for \"$trimmed\", backend fallback next")
            null
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Log.w(TAG, "[DirectSearch] failed for \"$trimmed\": ${e.message}, backend fallback next")
            null
        }
    }

    private suspend fun fetchSearchSongs(query: String): List<MediaTrack>? {        ensureNewPipeInit()
        val clientVersion = YoutubeParsingHelper.getYoutubeMusicClientVersion()
        val headers = YoutubeParsingHelper.getYoutubeMusicHeaders()
        val bodyJson = directSearchRequestBody(query, clientVersion).toString()
        val requestBuilder = Request.Builder()
            .url(INNERTUBE_SEARCH_URL)
            .post(bodyJson.toRequestBody("application/json; charset=utf-8".toMediaType()))
        headers.forEach { (name, values) ->
            values.forEach { requestBuilder.addHeader(name, it) }
        }
        executeCancellable(requestBuilder.build()).use { response ->
            if (!response.isSuccessful) {
                Log.w(TAG, "[DirectSearch] HTTP ${response.code} for \"$query\"")
                return null
            }
            val body = response.body?.string() ?: return null
            val tracks = parseDirectSearchResponse(JSONObject(body))
            Log.d(TAG, "[DirectSearch] q=[$query] parsed=${tracks.size}")
            return tracks
        }
    }

    /**
     * Direct artist search (people behind the songs). Returns null when the
     * backend should take over — but no backend artist search exists, so
     * null/empty both mean "no Artists section". Genuine cancellation
     * always propagates.
     */
    open suspend fun searchArtists(query: String): List<FoundArtist>? {
        val trimmed = query.trim()
        if (!YtMusicApiClient.isSearchableQuery(trimmed)) return emptyList()
        return try {
            withTimeout(DIRECT_SEARCH_TIMEOUT_MS) { fetchSearchArtists(trimmed) }
        } catch (e: TimeoutCancellationException) {
            Log.w(TAG, "[DirectArtists] timeout for \"$trimmed\"")
            null
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Log.w(TAG, "[DirectArtists] failed for \"$trimmed\": ${e.message}")
            null
        }
    }

    private suspend fun fetchSearchArtists(query: String): List<FoundArtist>? {
        ensureNewPipeInit()
        val clientVersion = YoutubeParsingHelper.getYoutubeMusicClientVersion()
        val headers = YoutubeParsingHelper.getYoutubeMusicHeaders()
        val bodyJson = directSearchRequestBody(query, clientVersion, MUSIC_ARTISTS_PARAMS).toString()
        val requestBuilder = Request.Builder()
            .url(INNERTUBE_SEARCH_URL)
            .post(bodyJson.toRequestBody("application/json; charset=utf-8".toMediaType()))
        headers.forEach { (name, values) ->
            values.forEach { requestBuilder.addHeader(name, it) }
        }
        executeCancellable(requestBuilder.build()).use { response ->
            if (!response.isSuccessful) {
                Log.w(TAG, "[DirectArtists] HTTP ${response.code} for \"$query\"")
                return null
            }
            val body = response.body?.string() ?: return null
            val artists = parseDirectArtistResponse(JSONObject(body))
            Log.d(TAG, "[DirectArtists] q=[$query] parsed=${artists.size}")
            return artists
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
                NewPipe.init(DirectNewPipeDownloader(client))
                newPipeReady = true
            }
        }
    }

    private class DirectNewPipeDownloader(
        private val client: OkHttpClient,
    ) : Downloader() {
        override fun execute(request: org.schabi.newpipe.extractor.downloader.Request)
            : org.schabi.newpipe.extractor.downloader.Response {
            val builder = Request.Builder().url(request.url())
            request.headers().forEach { (name, values) ->
                values.forEach { builder.addHeader(name, it) }
            }
            val body = request.dataToSend()
                ?.toRequestBody("application/octet-stream".toMediaType())
            builder.method(request.httpMethod(), body)
            client.newCall(builder.build()).execute().use { resp ->
                val respBody = resp.body?.string() ?: ""
                return org.schabi.newpipe.extractor.downloader.Response(
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

/**
 * InnerTube search request body (WEB_REMIX client). [params] selects the
 * shelf filter (songs by default, artists for people search). Pure and
 * unit-tested — only the client version comes from the network layer.
 */
fun directSearchRequestBody(
    query: String,
    clientVersion: String,
    params: String = MUSIC_SONGS_PARAMS,
): JSONObject {
    val tzOffsetMin = TimeZone.getDefault().getOffset(System.currentTimeMillis()) / 60000
    return JSONObject()
        .put(
            "context",
            JSONObject()
                .put(
                    "client",
                    JSONObject()
                        .put("clientName", "WEB_REMIX")
                        .put("clientVersion", clientVersion)
                        .put("hl", "en")
                        .put("gl", "US")
                        .put("platform", "DESKTOP")
                        .put("utcOffsetMinutes", tzOffsetMin),
                )
                .put("user", JSONObject().put("lockedSafetyMode", false)),
        )
        .put("query", query)
        .put("params", params)
}

/**
 * Collects artist rows from the "Artists" music shelf of a YT Music
 * artist-filtered search response. Defensive: unknown shapes yield fewer
 * artists, never a crash. Pure and unit-tested with canned JSON.
 */
fun parseDirectArtistResponse(root: JSONObject): List<FoundArtist> {
    val out = mutableListOf<FoundArtist>()
    val seen = HashSet<String>()
    val tabs = root.optJSONObject("contents")
        ?.optJSONObject("tabbedSearchResultsRenderer")
        ?.optJSONArray("tabs") ?: return emptyList()
    for (t in 0 until tabs.length()) {
        val sections = tabs.optJSONObject(t)
            ?.optJSONObject("tabRenderer")
            ?.optJSONObject("content")
            ?.optJSONObject("sectionListRenderer")
            ?.optJSONArray("contents") ?: continue
        for (s in 0 until sections.length()) {
            val shelf = sections.optJSONObject(s)?.optJSONObject("musicShelfRenderer") ?: continue
            val shelfTitle = joinDirectRunTexts(
                shelf.optJSONObject("title")?.optJSONArray("runs"),
            )
            if (!shelfTitle.equals("Artists", ignoreCase = true)) continue
            val items = shelf.optJSONArray("contents") ?: continue
            for (i in 0 until items.length()) {
                val renderer = items.optJSONObject(i)
                    ?.optJSONObject("musicResponsiveListItemRenderer") ?: continue
                val artist = parseDirectArtistItem(renderer) ?: continue
                if (!seen.add(artist.id)) continue
                out.add(artist)
            }
        }
    }
    return out
}

/**
 * Maps one artist `musicResponsiveListItemRenderer` to a [FoundArtist]:
 * display name, "Artist • audience" subtitle, channel browse id (opens
 * artist detail), largest circular thumbnail. Null when the row carries
 * no usable name or browse id. Pure and unit-tested.
 */
fun parseDirectArtistItem(item: JSONObject): FoundArtist? {
    val browseId = YtMusicApiClient.sanitizeNullableField(
        item.optJSONObject("navigationEndpoint")
            ?.optJSONObject("browseEndpoint")
            ?.optString("browseId"),
    ) ?: return null
    val flex = item.optJSONArray("flexColumns") ?: return null
    val name = YtMusicApiClient.sanitizeNullableField(
        joinDirectRunTexts(flexColumnRuns(flex, 0)),
    ) ?: return null
    val subtitle = joinDirectRunTexts(flexColumnRuns(flex, 1))
        .replace(Regex("\\s+"), " ")
        .trim()
        .takeIf { it.isNotBlank() }
    return FoundArtist(
        id = browseId,
        name = name,
        subtitle = subtitle,
        artworkUrl = YtMusicApiClient.upgradeArtworkUrl(pickDirectThumbnailUrl(item)),
    )
}

/**
 * Collects song items from every music shelf in a YT Music search
 * response. Defensive: unknown shapes yield fewer tracks, never a crash.
 * Pure and unit-tested with canned JSON.
 */
fun parseDirectSearchResponse(root: JSONObject): List<MediaTrack> {
    val out = mutableListOf<MediaTrack>()
    val tabs = root.optJSONObject("contents")
        ?.optJSONObject("tabbedSearchResultsRenderer")
        ?.optJSONArray("tabs") ?: return emptyList()
    for (t in 0 until tabs.length()) {
        val sections = tabs.optJSONObject(t)
            ?.optJSONObject("tabRenderer")
            ?.optJSONObject("content")
            ?.optJSONObject("sectionListRenderer")
            ?.optJSONArray("contents") ?: continue
        for (s in 0 until sections.length()) {
            val items = sections.optJSONObject(s)
                ?.optJSONObject("musicShelfRenderer")
                ?.optJSONArray("contents") ?: continue
            for (i in 0 until items.length()) {
                val renderer = items.optJSONObject(i)
                    ?.optJSONObject("musicResponsiveListItemRenderer") ?: continue
                parseDirectSearchItem(renderer)?.let(out::add)
            }
        }
    }
    return out
}

/**
 * Maps one `musicResponsiveListItemRenderer` to a [MediaTrack]. Null when
 * the row carries no playable video id (artist/album cards, "show all"
 * buttons). Mapping conventions mirror [YtMusicApiClient] parsing so
 * direct and backend results behave identically downstream.
 */
fun parseDirectSearchItem(item: JSONObject): MediaTrack? {
    val videoId = YtMusicApiClient.sanitizeNullableField(
        item.optJSONObject("playlistItemData")?.optString("videoId"),
    ) ?: YtMusicApiClient.sanitizeNullableField(
        item.optJSONObject("navigationEndpoint")
            ?.optJSONObject("watchEndpoint")
            ?.optString("videoId"),
    ) ?: return null

    val flex = item.optJSONArray("flexColumns") ?: return null
    val title = YtMusicApiClient.sanitizeFieldOrDefault(
        joinDirectRunTexts(flexColumnRuns(flex, 0)),
        "Unknown Title",
    )

    val subRuns = flexColumnRuns(flex, 1)
    var artist: String? = null
    var album: String? = null
    var durationSeconds = 0
    val linked = mutableListOf<String>()
    val plain = mutableListOf<String>()
    if (subRuns != null) {
        for (r in 0 until subRuns.length()) {
            val run = subRuns.optJSONObject(r) ?: continue
            val text = run.optString("text")
            if (text.isBlank() || text == "•" || text == "·") continue
            if (isDirectDurationText(text)) {
                durationSeconds = parseDirectDurationSeconds(text)
                continue
            }
            if (run.optJSONObject("navigationEndpoint")?.optJSONObject("browseEndpoint") != null) {
                linked.add(text)
            } else {
                plain.add(text)
            }
        }
    }
    artist = linked.getOrNull(0) ?: plain.getOrNull(0)
    album = (linked.getOrNull(1) ?: plain.getOrNull(1))
        ?.takeIf { it != artist }

    return MediaTrack(
        id = videoId,
        title = title,
        artist = YtMusicApiClient.sanitizeFieldOrDefault(artist, "Unknown Artist"),
        album = YtMusicApiClient.sanitizeFieldOrDefault(album, "Single"),
        durationSeconds = if (durationSeconds > 0) durationSeconds else 194,
        artworkUrl = YtMusicApiClient.artworkOrYoutubeFallback(
            YtMusicApiClient.upgradeArtworkUrl(pickDirectThumbnailUrl(item)),
            videoId,
        ),
        mediaUri = null,
    )
}

private fun flexColumnRuns(flex: JSONArray, index: Int): JSONArray? {
    return flex.optJSONObject(index)
        ?.optJSONObject("musicResponsiveListItemFlexColumnRenderer")
        ?.optJSONObject("text")
        ?.optJSONArray("runs")
}

private fun joinDirectRunTexts(runs: JSONArray?): String {
    if (runs == null) return ""
    val sb = StringBuilder()
    for (i in 0 until runs.length()) {
        sb.append(runs.optJSONObject(i)?.optString("text") ?: "")
    }
    return sb.toString()
}

private val DIRECT_DURATION_REGEX = Regex("^(?:(\\d+):)?([0-5]?\\d):([0-5]\\d)$")

fun isDirectDurationText(text: String): Boolean {
    return DIRECT_DURATION_REGEX.matches(text.trim())
}

/**
 * Parses "m:ss" / "h:mm:ss" durations from subtitle runs. 0 when the text
 * is not a duration. Pure and unit-tested.
 */
fun parseDirectDurationSeconds(text: String): Int {
    val match = DIRECT_DURATION_REGEX.matchEntire(text.trim()) ?: return 0
    val hours = match.groupValues[1].toIntOrNull() ?: 0
    val minutes = match.groupValues[2].toIntOrNull() ?: return 0
    val seconds = match.groupValues[3].toIntOrNull() ?: return 0
    return hours * 3600 + minutes * 60 + seconds
}

/**
 * Picks the largest thumbnail from a music thumbnail renderer and fixes
 * protocol-relative URLs. Null when no usable thumbnail exists (the
 * caller falls back to the genuine video thumbnail). Pure and unit-tested.
 */
fun pickDirectThumbnailUrl(item: JSONObject): String? {
    val thumbs = item.optJSONObject("thumbnail")
        ?.optJSONObject("musicThumbnailRenderer")
        ?.optJSONObject("thumbnail")
        ?.optJSONArray("thumbnails") ?: return null
    var bestUrl: String? = null
    var bestArea = -1
    for (i in 0 until thumbs.length()) {
        val thumb = thumbs.optJSONObject(i) ?: continue
        val url = thumb.optString("url")
        if (url.isBlank()) continue
        val area = thumb.optInt("width", 0) * thumb.optInt("height", 0)
        if (area > bestArea) {
            bestArea = area
            bestUrl = url
        }
    }
    if (bestUrl == null) return null
    return if (bestUrl.startsWith("//")) "https:$bestUrl" else bestUrl
}
