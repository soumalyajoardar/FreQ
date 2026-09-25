package com.gresseymusic.wave.data.remote

import com.gresseymusic.wave.data.repository.CatalogResult
import com.gresseymusic.wave.data.repository.YtMusicRepository
import com.gresseymusic.wave.player.MediaTrack
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

/**
 * Direct InnerTube search tests (Musify-style reads).
 *
 * The parsing helpers are pure and verified against canned InnerTube
 * JSON shaped like real `music.youtube.com` search responses; the
 * repository wiring tests prove direct-first ordering with backend
 * fallback and cancellation propagation. No network in any test.
 */
class YtMusicDirectSearchTest {

    // ---------- duration parsing ----------

    @Test
    fun `durations parse minutes and seconds`() {
        assertEquals(194, parseDirectDurationSeconds("3:14"))
        assertEquals(45, parseDirectDurationSeconds("0:45"))
        assertEquals(600, parseDirectDurationSeconds("10:00"))
    }

    @Test
    fun `durations parse hours`() {
        assertEquals(3723, parseDirectDurationSeconds("1:02:03"))
    }

    @Test
    fun `non-durations parse as zero`() {
        assertEquals(0, parseDirectDurationSeconds(""))
        assertEquals(0, parseDirectDurationSeconds("LIVE"))
        assertEquals(0, parseDirectDurationSeconds(" • "))
        assertEquals(0, parseDirectDurationSeconds("3:7x"))
    }

    @Test
    fun `duration detector matches clock text only`() {
        assertTrue(isDirectDurationText("2:33"))
        assertTrue(isDirectDurationText("1:02:03"))
        assertFalse(isDirectDurationText("Billie Eilish"))
        assertFalse(isDirectDurationText(" • "))
    }

    // ---------- request body ----------

    @Test
    fun `request body carries query, songs filter and remix client`() {
        val body = directSearchRequestBody("Ghost", "9.99")
        assertEquals("Ghost", body.optString("query"))
        assertTrue(body.optString("params").isNotBlank())
        val client = body.optJSONObject("context")?.optJSONObject("client")
        assertEquals("WEB_REMIX", client?.optString("clientName"))
        assertEquals("9.99", client?.optString("clientVersion"))
    }

    // ---------- response parsing ----------

    private fun run(text: String, browseId: String? = null): JSONObject {
        val run = JSONObject().put("text", text)
        if (browseId != null) {
            run.put(
                "navigationEndpoint",
                JSONObject().put("browseEndpoint", JSONObject().put("browseId", browseId)),
            )
        }
        return run
    }

    private fun runs(vararg runs: JSONObject): JSONArray {
        val array = JSONArray()
        runs.forEach { array.put(it) }
        return array
    }

    private fun flexColumn(runs: JSONArray): JSONObject {
        return JSONObject().put(
            "musicResponsiveListItemFlexColumnRenderer",
            JSONObject().put("text", JSONObject().put("runs", runs)),
        )
    }

    private fun songItem(
        videoId: String?,
        title: String,
        subtitleRuns: JSONArray?,
        thumbUrl: String?,
    ): JSONObject {
        val item = JSONObject()
        if (videoId != null) {
            item.put("playlistItemData", JSONObject().put("videoId", videoId))
        }
        val flex = JSONArray()
        flex.put(flexColumn(runs(JSONObject().put("text", title))))
        if (subtitleRuns != null) {
            flex.put(flexColumn(subtitleRuns))
        }
        item.put("flexColumns", flex)
        if (thumbUrl != null) {
            item.put(
                "thumbnail",
                JSONObject().put(
                    "musicThumbnailRenderer",
                    JSONObject().put(
                        "thumbnail",
                        JSONObject().put(
                            "thumbnails",
                            JSONArray().put(
                                JSONObject()
                                    .put("url", thumbUrl)
                                    .put("width", 120)
                                    .put("height", 120),
                            ),
                        ),
                    ),
                ),
            )
        }
        return item
    }

    private fun shelf(vararg items: JSONObject): JSONObject {
        val contents = JSONArray()
        items.forEach { contents.put(JSONObject().put("musicResponsiveListItemRenderer", it)) }
        return JSONObject().put("musicShelfRenderer", JSONObject().put("contents", contents))
    }

    private fun response(vararg shelves: JSONObject): JSONObject {
        val contents = JSONArray()
        shelves.forEach { contents.put(it) }
        return JSONObject().put(
            "contents",
            JSONObject().put(
                "tabbedSearchResultsRenderer",
                JSONObject().put(
                    "tabs",
                    JSONArray().put(
                        JSONObject().put(
                            "tabRenderer",
                            JSONObject().put(
                                "content",
                                JSONObject().put(
                                    "sectionListRenderer",
                                    JSONObject().put("contents", contents),
                                ),
                            ),
                        ),
                    ),
                ),
            ),
        )
    }

    @Test
    fun `full song row maps every field`() {
        val root = response(
            shelf(
                songItem(
                    videoId = "dQw4w9WgXcQ",
                    title = "Ghost",
                    subtitleRuns = runs(
                        run("Justin Bieber", "UC"),
                        run(" • "),
                        run("Justice", "MPRE"),
                        run(" • "),
                        run("2:33"),
                    ),
                    thumbUrl = "//lh3.googleusercontent.com/x=w60-h60-l90-rj",
                ),
            ),
        )
        val tracks = parseDirectSearchResponse(root)
        assertEquals(1, tracks.size)
        val track = tracks.first()
        assertEquals("dQw4w9WgXcQ", track.id)
        assertEquals("Ghost", track.title)
        assertEquals("Justin Bieber", track.artist)
        assertEquals("Justice", track.album)
        assertEquals(153, track.durationSeconds)
        assertEquals(
            "https://lh3.googleusercontent.com/x=w544-h544-l90-rj",
            track.artworkUrl,
        )
        assertNull(track.mediaUri)
    }

    @Test
    fun `minimal row degrades honestly and skips video-less rows`() {
        val artistCard = JSONObject().put("flexColumns", JSONArray())
        val root = response(
            shelf(
                songItem(
                    videoId = "abcdefghijk",
                    title = "Untitled Jam",
                    subtitleRuns = null,
                    thumbUrl = null,
                ),
                artistCard,
                JSONObject(),
            ),
        )
        val tracks = parseDirectSearchResponse(root)
        assertEquals(1, tracks.size)
        val track = tracks.first()
        assertEquals("abcdefghijk", track.id)
        assertEquals("Untitled Jam", track.title)
        assertEquals("Unknown Artist", track.artist)
        assertEquals("Single", track.album)
        assertEquals(194, track.durationSeconds)
        // Genuine video thumbnail fallback, upgraded to HQ.
        assertEquals("https://i.ytimg.com/vi/abcdefghijk/hq720.jpg", track.artworkUrl)
    }

    @Test
    fun `watch-endpoint video id is accepted when playlist data is absent`() {
        val item = songItem(
            videoId = null,
            title = "Fallback Id",
            subtitleRuns = runs(run("Singer", "UC"), run(" • "), run("3:00")),
            thumbUrl = null,
        )
        item.put(
            "navigationEndpoint",
            JSONObject().put("watchEndpoint", JSONObject().put("videoId", "watchid12345")),
        )
        val tracks = parseDirectSearchResponse(response(shelf(item)))
        assertEquals(1, tracks.size)
        assertEquals("watchid12345", tracks.first().id)
        assertEquals("Singer", tracks.first().artist)
        assertEquals("Single", tracks.first().album)
        assertEquals(180, tracks.first().durationSeconds)
    }

    @Test
    fun `unknown shapes yield empty, never a crash`() {
        assertTrue(parseDirectSearchResponse(JSONObject()).isEmpty())
        assertTrue(
            parseDirectSearchResponse(JSONObject().put("contents", JSONObject())).isEmpty(),
        )
    }

    @Test
    fun `largest thumbnail wins and protocol-relative urls are fixed`() {
        val thumbs = JSONArray()
            .put(JSONObject().put("url", "//lh3.googleusercontent.com/s=w60-h60").put("width", 60).put("height", 60))
            .put(JSONObject().put("url", "https://lh3.googleusercontent.com/b=w120-h120").put("width", 120).put("height", 120))
        val item = JSONObject().put(
            "thumbnail",
            JSONObject().put(
                "musicThumbnailRenderer",
                JSONObject().put("thumbnail", JSONObject().put("thumbnails", thumbs)),
            ),
        )
        assertEquals("https://lh3.googleusercontent.com/b=w120-h120", pickDirectThumbnailUrl(item))
        assertNull(pickDirectThumbnailUrl(JSONObject()))
    }

    // ---------- repository wiring ----------

    private class FakeSearchApi : YtMusicApiClient("https://fake.test/") {
        var calls = 0
        var result: List<MediaTrack> = emptyList()
        override suspend fun searchTracks(query: String): List<MediaTrack> {
            calls++
            return result
        }
    }

    private class FakeDirect(
        private val result: List<MediaTrack>?,
        private val throwCancel: Boolean = false,
    ) : YtMusicDirectClient() {
        override suspend fun searchSongs(query: String): List<MediaTrack>? {
            if (throwCancel) throw CancellationException("obsolete search")
            return result
        }
    }

    private fun directTrack() = MediaTrack(
        id = "direct1",
        title = "Direct Song",
        artist = "Direct Singer",
        album = "Direct Record",
    )

    @Test
    fun `direct hit wins and backend stays untouched`() = runBlocking {
        val api = FakeSearchApi()
        val repository = YtMusicRepository(apiClient = api, directClient = FakeDirect(listOf(directTrack())))
        val result = repository.getSearchResults("song")
        assertTrue(result is CatalogResult.Success)
        assertEquals("direct1", (result as CatalogResult.Success).data.first().id)
        assertEquals(0, api.calls)
    }

    @Test
    fun `direct miss falls back to backend`() = runBlocking {
        val api = FakeSearchApi()
        api.result = listOf(directTrack().copy(id = "backend1"))
        val repository = YtMusicRepository(apiClient = api, directClient = FakeDirect(null))
        val result = repository.getSearchResults("song")
        assertTrue(result is CatalogResult.Success)
        assertEquals("backend1", (result as CatalogResult.Success).data.first().id)
        assertEquals(1, api.calls)
    }

    @Test
    fun `direct empty falls back to backend`() = runBlocking {
        val api = FakeSearchApi()
        val repository = YtMusicRepository(apiClient = api, directClient = FakeDirect(emptyList()))
        repository.getSearchResults("song")
        assertEquals(1, api.calls)
    }

    @Test
    fun `short query short-circuits without touching network clients`() = runBlocking {
        val api = FakeSearchApi()
        val repository = YtMusicRepository(apiClient = api, directClient = FakeDirect(listOf(directTrack())))
        val result = repository.getSearchResults("x")
        assertTrue(result is CatalogResult.Success)
        assertTrue((result as CatalogResult.Success).data.isEmpty())
        assertEquals(0, api.calls)
    }

    @Test
    fun `direct cancellation propagates instead of falling back`() {
        val api = FakeSearchApi()
        val repository = YtMusicRepository(apiClient = api, directClient = FakeDirect(null, throwCancel = true))
        assertThrows(CancellationException::class.java) {
            runBlocking { repository.getSearchResults("song") }
        }
        assertEquals(0, api.calls)
    }
}
