package com.gresseymusic.wave.data.remote

import com.gresseymusic.wave.player.MediaTrack
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.suspendCancellableCoroutine
import okhttp3.Call
import okhttp3.Callback
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.URLEncoder
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

data class YtMusicPlaybackStreamResponse(
    val available: Boolean,
    val streamUrl: String? = null,
    val mimeType: String? = null,
    val expiresIn: Int? = null,
)

// Open for host-side test fakes (Milestone 11): repository failure handling is
// verified by subclassing and overriding the backend reads.
open class YtMusicApiClient(
    var baseUrl: String = "https://freq-api.vercel.app/",
) {
    companion object {
        private val SIZE_PARAM_REGEX = Regex("=(?:w\\d+-h\\d+|s\\d+)(-[^=]+)?$")
        private val VI_THUMB_REGEX = Regex("/vi/([^/]+)/(?:default|mqdefault|hqdefault|sddefault)\\.jpg$")

        /**
         * Upgrades Google/YouTube thumbnail URLs to high-resolution variants (544x544 or maxres).
         * - yt3.googleusercontent.com / yt3.ggpht.com: changes =w120-h120-... or =s120 to =w544-h544-l90-rj
         * - i.ytimg.com: upgrades default/mqdefault/hqdefault to hq720.jpg or maxresdefault.jpg
         */
        fun upgradeArtworkUrl(url: String?): String? {            if (url.isNullOrBlank()) return null
            return try {
                when {
                    url.contains("googleusercontent.com") || url.contains("ggpht.com") -> {
                        if (SIZE_PARAM_REGEX.containsMatchIn(url)) {
                            url.replace(SIZE_PARAM_REGEX, "=w544-h544-l90-rj")
                        } else if (!url.contains("=")) {
                            "$url=w544-h544-l90-rj"
                        } else {
                            url
                        }
                    }
                    url.contains("i.ytimg.com") -> {
                        if (VI_THUMB_REGEX.containsMatchIn(url)) {
                            url.replace(VI_THUMB_REGEX, "/vi/$1/hq720.jpg")
                        } else {
                            url
                        }
                    }
                    else -> url
                }
            } catch (e: Exception) {
                url
            }
        }

        /**
         * JSON-null-safe scalar extraction (M11 follow-up fix).
         *
         * The backend emits explicit JSON nulls for absent optional fields
         * (verified on production `/api/home`: items carry `"artist":null`,
         * `"album":null`, `"year":null`, ...). org.json's `optString`
         * coerces those into the literal string "null" instead of a Kotlin
         * null, which then leaked into the UI (item subtitles rendering as
         * "null"). These helpers collapse missing/blank/"null" into null or
         * a caller-supplied default. Pure functions — unit-tested.
         */
        fun sanitizeNullableField(value: String?): String? {
            return value?.takeIf { it.isNotBlank() && it != "null" }
        }

        fun sanitizeFieldOrDefault(value: String?, default: String): String {
            return sanitizeNullableField(value) ?: default
        }

        /**
         * Minimum query validation (M13 test seam): only queries with at least
         * two non-blank characters reach the network. Pure and host-testable.
         */
        fun isSearchableQuery(query: String): Boolean {
            return query.trim().length >= 2
        }

        private val YT_VIDEO_ID_REGEX = Regex("^[A-Za-z0-9_-]{11}$")

        /**
         * YouTube thumbnail fallback (M27.6): watch-continuation metadata
         * carries no artworkUrl, but the track id IS the YouTube videoId, so
         * `i.ytimg.com/vi/{id}/hqdefault.jpg` is the genuine thumbnail —
         * never invented, never a placeholder. Returns null for non-video
         * ids (playlists, albums, artists) so those keep the neutral
         * FreQ placeholder instead of a broken image.
         */
        fun youtubeThumbnailForId(id: String): String? {
            if (!YT_VIDEO_ID_REGEX.matches(id)) return null
            return upgradeArtworkUrl("https://i.ytimg.com/vi/$id/hqdefault.jpg")
        }

        /**
         * Artwork with YouTube fallback: real backend artwork wins; blank
         * falls back to the genuine video thumbnail; non-video ids stay null.
         */
        fun artworkOrYoutubeFallback(artworkUrl: String?, id: String): String? {
            return artworkUrl?.takeIf { it.isNotBlank() } ?: youtubeThumbnailForId(id)
        }
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .callTimeout(15, TimeUnit.SECONDS)
        .build()

    /**
     * Coroutine-cancellable OkHttp call (M12). Unlike blocking execute(), a
     * cancelled collector (e.g. a superseded search via collectLatest)
     * aborts the socket instead of running to timeout. Same client,
     * timeouts, and error mapping — no architecture change.
     */
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

    suspend fun isHealthOk(): Boolean {
        return try {
            val url = "${baseUrl.trimEnd('/')}/health"
            val request = Request.Builder().url(url).build()
            executeCancellable(request).use { response ->
                if (response.isSuccessful) {
                    val body = response.body?.string() ?: ""
                    val json = JSONObject(body)
                    json.optBoolean("ok", false)
                } else false
            }
        } catch (e: Exception) {
            if (e is CancellationException) throw e
            false
        }
    }

    suspend fun getPlaybackStream(trackId: String): YtMusicPlaybackStreamResponse? {
        if (trackId.isBlank()) return null
        return try {
            val url = "${baseUrl.trimEnd('/')}/api/playback/$trackId"
            val request = Request.Builder().url(url).build()

            executeCancellable(request).use { response ->
                if (!response.isSuccessful) {
                    throw YtMusicException(
                        httpStatusToKind(response.code),
                        "GET $url failed with HTTP ${response.code}",
                    )
                }
                val body = response.body?.string() ?: return null
                val json = JSONObject(body)

                val rawUrl = json.optString("streamUrl", "")
                val streamUrl = if (rawUrl.isNotBlank() && rawUrl != "null") rawUrl else null

                val rawMime = json.optString("mimeType", "")
                val mimeType = if (rawMime.isNotBlank() && rawMime != "null") rawMime else null

                val expiresIn = if (json.has("expiresIn")) json.optInt("expiresIn") else null

                YtMusicPlaybackStreamResponse(
                    available = json.optBoolean("available", false),
                    streamUrl = streamUrl,
                    mimeType = mimeType,
                    expiresIn = expiresIn,
                )
            }
        } catch (e: Exception) {
            throw mapFetchError(e, "Playback lookup failed for $trackId")
        }
    }

    open suspend fun searchTracks(query: String): List<MediaTrack> {
        val trimmed = query.trim()
        android.util.Log.d("WAVE_TMP", "searchTracks q=[$trimmed]")
        if (!isSearchableQuery(query)) return emptyList()
        return try {
            val encodedQuery = URLEncoder.encode(trimmed, "UTF-8")
            val url = "${baseUrl.trimEnd('/')}/api/search?q=$encodedQuery"
            val request = Request.Builder().url(url).build()

            executeCancellable(request).use { response ->
                if (!response.isSuccessful) {
                    throw YtMusicException(
                        httpStatusToKind(response.code),
                        "GET $url failed with HTTP ${response.code}",
                    )
                }
                val body = response.body?.string() ?: return emptyList()
                val json = JSONObject(body)
                val tracksArray = json.optJSONArray("tracks") ?: return emptyList()

                parseTracksArray(tracksArray).also {
                    android.util.Log.d("WAVE_TMP", "searchTracks q=[$trimmed] parsed=${it.size}")
                }
            }
        } catch (e: Exception) {
            throw mapFetchError(e, "Search failed for \"$trimmed\"")
        }
    }

    open suspend fun getHome(): YtMusicHomeResponse {
        return try {
            val url = "${baseUrl.trimEnd('/')}/api/home"
            val request = Request.Builder().url(url).build()

            executeCancellable(request).use { response ->
                if (!response.isSuccessful) {
                    throw YtMusicException(
                        httpStatusToKind(response.code),
                        "GET $url failed with HTTP ${response.code}",
                    )
                }
                val body = response.body?.string() ?: return YtMusicHomeResponse()
                val json = JSONObject(body)
                val sectionsArray = json.optJSONArray("sections") ?: return YtMusicHomeResponse()

                val sectionsList = mutableListOf<YtMusicHomeSectionDto>()
                for (i in 0 until sectionsArray.length()) {
                    val secObj = sectionsArray.optJSONObject(i) ?: continue
                    val title = sanitizeFieldOrDefault(secObj.optString("title"), "Featured")
                    val itemsArray = secObj.optJSONArray("items") ?: JSONArray()

                    val itemsList = mutableListOf<YtMusicHomeItemDto>()
                    for (j in 0 until itemsArray.length()) {
                        val itemObj = itemsArray.optJSONObject(j) ?: continue
                        val id = sanitizeNullableField(itemObj.optString("id")) ?: continue

                        itemsList.add(
                            YtMusicHomeItemDto(
                                type = sanitizeFieldOrDefault(itemObj.optString("type"), "song"),
                                id = id,
                                title = sanitizeFieldOrDefault(itemObj.optString("title"), "Untitled"),
                                artist = sanitizeNullableField(itemObj.optString("artist")),
                                artistId = sanitizeNullableField(itemObj.optString("artistId")),
                                album = sanitizeNullableField(itemObj.optString("album")),
                                year = sanitizeNullableField(itemObj.optString("year")),
                                durationMs = itemObj.optLong("durationMs", 0L),
                                artworkUrl = upgradeArtworkUrl(sanitizeNullableField(itemObj.optString("artworkUrl"))),
                                provider = sanitizeFieldOrDefault(itemObj.optString("provider"), "youtube_music"),
                            )
                        )
                    }
                    if (itemsList.isNotEmpty()) {
                        sectionsList.add(YtMusicHomeSectionDto(title = title, items = itemsList))
                    }
                }
                YtMusicHomeResponse(sections = sectionsList)
            }
        } catch (e: Exception) {
            throw mapFetchError(e, "Home fetch failed")
        }
    }

    open suspend fun getArtist(artistId: String): YtMusicArtistDto? {
        if (artistId.isBlank()) return null
        return try {
            val url = "${baseUrl.trimEnd('/')}/api/artists/$artistId"
            val request = Request.Builder().url(url).build()

            executeCancellable(request).use { response ->
                if (!response.isSuccessful) {
                    throw YtMusicException(
                        httpStatusToKind(response.code),
                        "GET $url failed with HTTP ${response.code}",
                    )
                }
                val body = response.body?.string() ?: return null
                val json = JSONObject(body)

                val id = sanitizeFieldOrDefault(json.optString("id"), artistId)
                val name = sanitizeFieldOrDefault(json.optString("name"), "Unknown Artist")
                val artworkUrl = upgradeArtworkUrl(sanitizeNullableField(json.optString("artworkUrl")))

                val topSongsArray = json.optJSONArray("topSongs") ?: JSONArray()
                val topSongs = parseTrackDtosArray(topSongsArray)

                val albumsArray = json.optJSONArray("albums") ?: JSONArray()
                val albumsList = mutableListOf<YtMusicAlbumItemDto>()
                for (i in 0 until albumsArray.length()) {
                    val albObj = albumsArray.optJSONObject(i) ?: continue
                    val albId = sanitizeNullableField(albObj.optString("id")) ?: continue

                    albumsList.add(
                        YtMusicAlbumItemDto(
                            type = sanitizeFieldOrDefault(albObj.optString("type"), "album"),
                            id = albId,
                            title = sanitizeFieldOrDefault(albObj.optString("title"), "Untitled Album"),
                            artist = sanitizeNullableField(albObj.optString("artist")) ?: name,
                            year = sanitizeNullableField(albObj.optString("year")),
                            artworkUrl = upgradeArtworkUrl(sanitizeNullableField(albObj.optString("artworkUrl"))),
                            provider = "youtube_music",
                        )
                    )
                }

                YtMusicArtistDto(
                    id = id,
                    name = name,
                    description = sanitizeNullableField(json.optString("description")),
                    artworkUrl = artworkUrl,
                    topSongs = topSongs,
                    albums = albumsList,
                )
            }
        } catch (e: Exception) {
            throw mapFetchError(e, "Artist fetch failed for $artistId")
        }
    }

    open suspend fun getAlbum(albumId: String): YtMusicAlbumDto? {
        if (albumId.isBlank()) return null
        return try {
            val url = "${baseUrl.trimEnd('/')}/api/albums/$albumId"
            val request = Request.Builder().url(url).build()

            executeCancellable(request).use { response ->
                if (!response.isSuccessful) {
                    throw YtMusicException(
                        httpStatusToKind(response.code),
                        "GET $url failed with HTTP ${response.code}",
                    )
                }
                val body = response.body?.string() ?: return null
                val json = JSONObject(body)

                val id = sanitizeFieldOrDefault(json.optString("id"), albumId)
                val title = sanitizeFieldOrDefault(json.optString("title"), "Untitled Album")
                val artist = sanitizeFieldOrDefault(json.optString("artist"), "Unknown Artist")
                val artistId = sanitizeNullableField(json.optString("artistId"))
                val artworkUrl = upgradeArtworkUrl(sanitizeNullableField(json.optString("artworkUrl")))

                val tracksArray = json.optJSONArray("tracks") ?: JSONArray()
                val tracks = parseTrackDtosArray(tracksArray)

                YtMusicAlbumDto(
                    id = id,
                    title = title,
                    artist = artist,
                    artistId = artistId,
                    year = sanitizeNullableField(json.optString("year")),
                    artworkUrl = artworkUrl,
                    tracks = tracks,
                )
            }
        } catch (e: Exception) {
            throw mapFetchError(e, "Album fetch failed for $albumId")
        }
    }

    open suspend fun getPlaylist(playlistId: String): YtMusicPlaylistDto? {
        if (playlistId.isBlank()) return null
        return try {
            val url = "${baseUrl.trimEnd('/')}/api/playlists/$playlistId"
            val request = Request.Builder().url(url).build()

            executeCancellable(request).use { response ->
                if (!response.isSuccessful) {
                    throw YtMusicException(
                        httpStatusToKind(response.code),
                        "GET $url failed with HTTP ${response.code}",
                    )
                }
                val body = response.body?.string() ?: return null
                val json = JSONObject(body)

                val id = sanitizeFieldOrDefault(json.optString("id"), playlistId)
                val title = sanitizeFieldOrDefault(json.optString("title"), "Untitled Playlist")
                val author = sanitizeFieldOrDefault(json.optString("author"), "YouTube Music")
                val artworkUrl = upgradeArtworkUrl(sanitizeNullableField(json.optString("artworkUrl")))

                val tracksArray = json.optJSONArray("tracks") ?: JSONArray()
                val tracks = parseTrackDtosArray(tracksArray)

                YtMusicPlaylistDto(
                    id = id,
                    title = title,
                    description = sanitizeNullableField(json.optString("description")),
                    author = author,
                    artworkUrl = artworkUrl,
                    tracks = tracks,
                )
            }
        } catch (e: Exception) {
            throw mapFetchError(e, "Playlist fetch failed for $playlistId")
        }
    }

    /**
     * YouTube Music continuation / similar queue (M27.1).
     *
     * Reuses the existing backend metadata path `GET /api/watch/{id}`
     * (same NormalizedTrack shape as search). Returns an empty list — never
     * throws for empty input — so callers can always fall back to the local
     * autoplay engine. Network failures surface as [YtMusicException] via
     * [mapFetchError] like every other backend read.
     */
    open suspend fun getWatchQueue(trackId: String, limit: Int = 25): List<MediaTrack> {
        if (trackId.isBlank()) return emptyList()
        return try {
            val capped = limit.coerceIn(1, 50)
            val url = "${baseUrl.trimEnd('/')}/api/watch/$trackId?limit=$capped"
            val request = Request.Builder().url(url).build()

            executeCancellable(request).use { response ->
                if (!response.isSuccessful) {
                    throw YtMusicException(
                        httpStatusToKind(response.code),
                        "GET $url failed with HTTP ${response.code}",
                    )
                }
                val body = response.body?.string() ?: return emptyList()
                val json = JSONObject(body)
                val tracksArray = json.optJSONArray("tracks") ?: return emptyList()
                parseTracksArray(tracksArray)
            }
        } catch (e: Exception) {
            throw mapFetchError(e, "Watch queue failed for \"$trackId\"")
        }
    }

    /**
     * Lyric lines for [trackId] via `GET /api/lyrics/{id}` (M28). Returns
     * null when the backend has no lyrics (honest 404) or the read fails;
     * callers render the empty state. Never returns mock content.
     */
    open suspend fun getLyrics(trackId: String): List<String>? {
        if (trackId.isBlank()) return null
        return try {
            val url = "${baseUrl.trimEnd('/')}/api/lyrics/$trackId"
            val request = Request.Builder().url(url).build()

            executeCancellable(request).use { response ->
                if (!response.isSuccessful) return null
                val body = response.body?.string() ?: return null
                val json = JSONObject(body)
                if (!json.optBoolean("available", false)) return null
                val array = json.optJSONArray("lines") ?: return null
                val lines = mutableListOf<String>()
                for (i in 0 until array.length()) {
                    val line = array.optString(i, "")
                    if (line.isNotBlank()) lines.add(line)
                }
                lines.ifEmpty { null }
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw mapFetchError(e, "Lyrics fetch failed for $trackId")
        }
    }

    open suspend fun getTrackDetails(trackId: String): MediaTrack? {        if (trackId.isBlank()) return null
        return try {
            val url = "${baseUrl.trimEnd('/')}/api/tracks/$trackId"
            val request = Request.Builder().url(url).build()

            executeCancellable(request).use { response ->
                if (!response.isSuccessful) {
                    throw YtMusicException(
                        httpStatusToKind(response.code),
                        "GET $url failed with HTTP ${response.code}",
                    )
                }
                val body = response.body?.string() ?: return null
                val item = JSONObject(body)
                val id = sanitizeNullableField(item.optString("id")) ?: return null

                val title = sanitizeFieldOrDefault(item.optString("title"), "Unknown Title")
                val artist = sanitizeFieldOrDefault(item.optString("artist"), "Unknown Artist")
                val album = sanitizeFieldOrDefault(item.optString("album"), "Single")
                val durationMs = item.optLong("durationMs", 194000L)
                val artworkUrl = artworkOrYoutubeFallback(
                    upgradeArtworkUrl(sanitizeNullableField(item.optString("artworkUrl"))),
                    id,
                )

                MediaTrack(
                    id = id,
                    title = title,
                    artist = artist,
                    album = album,
                    durationSeconds = (durationMs / 1000).toInt().coerceAtLeast(1),
                    artworkUrl = artworkUrl,
                    mediaUri = null,
                )
            }
        } catch (e: Exception) {
            throw mapFetchError(e, "Track fetch failed for $trackId")
        }
    }

    private fun parseTracksArray(tracksArray: JSONArray): List<MediaTrack> {
        val resultList = mutableListOf<MediaTrack>()
        for (i in 0 until tracksArray.length()) {
            val item = tracksArray.optJSONObject(i) ?: continue
            val id = sanitizeNullableField(item.optString("id")) ?: continue

            val title = sanitizeFieldOrDefault(item.optString("title"), "Unknown Title")
            val artist = sanitizeFieldOrDefault(item.optString("artist"), "Unknown Artist")
            val album = sanitizeFieldOrDefault(item.optString("album"), "Single")
            val durationMs = item.optLong("durationMs", 194000L)
            val artworkUrl = artworkOrYoutubeFallback(
                upgradeArtworkUrl(sanitizeNullableField(item.optString("artworkUrl"))),
                id,
            )

            resultList.add(
                MediaTrack(
                    id = id,
                    title = title,
                    artist = artist,
                    album = album,
                    durationSeconds = (durationMs / 1000).toInt().coerceAtLeast(1),
                    artworkUrl = artworkUrl,
                    mediaUri = null,
                ),
            )
        }
        return resultList
    }

    private fun parseTrackDtosArray(tracksArray: JSONArray): List<YtMusicTrackDto> {
        val list = mutableListOf<YtMusicTrackDto>()
        for (i in 0 until tracksArray.length()) {
            val item = tracksArray.optJSONObject(i) ?: continue
            val id = sanitizeNullableField(item.optString("id")) ?: continue

            list.add(
                YtMusicTrackDto(
                    id = id,
                    title = sanitizeFieldOrDefault(item.optString("title"), "Unknown Title"),
                    artist = sanitizeFieldOrDefault(item.optString("artist"), "Unknown Artist"),
                    album = sanitizeFieldOrDefault(item.optString("album"), "Single"),
                    durationMs = item.optLong("durationMs", 194000L),
                    artworkUrl = upgradeArtworkUrl(sanitizeNullableField(item.optString("artworkUrl"))),
                    provider = "youtube_music",
                )
            )
        }
        return list
    }
}
