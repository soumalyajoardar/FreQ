package com.gresseymusic.wave.ui.screens

import com.gresseymusic.wave.data.model.FoundArtist
import com.gresseymusic.wave.data.remote.parseDirectArtistResponse
import com.gresseymusic.wave.data.repository.MockMusicRepository
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class ArtistSearchTest {

    private fun runs(vararg texts: String): JSONObject {
        val arr = JSONArray()
        texts.forEach { arr.put(JSONObject().put("text", it)) }
        return JSONObject().put("runs", arr)
    }

    private fun artistRow(
        name: String,
        browseId: String,
        subtitle: String = "Artist",
        artUrl: String = "https://lh3.googleusercontent.com/x=w120-h120-p-l90-rj",
    ): JSONObject {
        val flex = JSONArray()
        flex.put(
            JSONObject().put(
                "musicResponsiveListItemFlexColumnRenderer",
                JSONObject().put("text", runs(name)),
            ),
        )
        flex.put(
            JSONObject().put(
                "musicResponsiveListItemFlexColumnRenderer",
                JSONObject().put("text", runs(subtitle)),
            ),
        )
        val thumbs = JSONArray()
        thumbs.put(JSONObject().put("url", artUrl).put("width", 120).put("height", 120))
        val thumbnail = JSONObject().put(
            "musicThumbnailRenderer",
            JSONObject().put("thumbnail", JSONObject().put("thumbnails", thumbs)),
        )
        return JSONObject().put(
            "musicResponsiveListItemRenderer",
            JSONObject()
                .put("flexColumns", flex)
                .put("thumbnail", thumbnail)
                .put(
                    "navigationEndpoint",
                    JSONObject().put("browseEndpoint", JSONObject().put("browseId", browseId)),
                ),
        )
    }

    private fun shelfResponse(shelfTitle: String, vararg rows: JSONObject): JSONObject {
        val contents = JSONArray()
        rows.forEach { contents.put(it) }
        val shelf = JSONObject()
            .put("title", runs(shelfTitle))
            .put("contents", contents)
        val section = JSONObject().put("musicShelfRenderer", shelf)
        val sections = JSONArray().put(section)
        val content = JSONObject().put(
            "sectionListRenderer",
            JSONObject().put("contents", sections),
        )
        val tab = JSONObject().put("tabRenderer", JSONObject().put("content", content))
        val tabs = JSONArray().put(tab)
        return JSONObject().put(
            "contents",
            JSONObject().put("tabbedSearchResultsRenderer", JSONObject().put("tabs", tabs)),
        )
    }

    @Test
    fun `parses artist shelf rows`() {
        val root = shelfResponse(
            "Artists",
            artistRow("Arijit Singh", "UCDxKh1gFWeYsqePvgVzmPoQ", "Artist • 674M monthly audience"),
            artistRow("Arijit Singh Official", "UCabcd1234", "Artist"),
        )
        val artists = parseDirectArtistResponse(root)
        assertEquals(2, artists.size)
        assertEquals("UCDxKh1gFWeYsqePvgVzmPoQ", artists[0].id)
        assertEquals("Arijit Singh", artists[0].name)
        assertEquals("Artist • 674M monthly audience", artists[0].subtitle)
        assertTrue(artists[0].artworkUrl?.contains("w544-h544") == true)
    }

    @Test
    fun `skips song shelves`() {
        val root = shelfResponse(
            "Songs",
            artistRow("Some Song", "UCsongshelf"),
        )
        assertTrue(parseDirectArtistResponse(root).isEmpty())
    }

    @Test
    fun `skips rows without ids`() {
        val root = shelfResponse("Artists", artistRow("Nameless", ""))
        assertTrue(parseDirectArtistResponse(root).isEmpty())
    }

    @Test
    fun `dedupes repeated artist rows`() {
        val root = shelfResponse(
            "Artists",
            artistRow("Arijit Singh", "UCDx"),
            artistRow("Arijit Singh", "UCDx"),
        )
        assertEquals(1, parseDirectArtistResponse(root).size)
    }

    @Test
    fun `artist stats line formats counts honestly`() {
        assertEquals("5 top tracks • 2 albums", artistStatsLine(5, 2))
        assertEquals("1 top track • 1 album", artistStatsLine(1, 1))
        assertEquals("3 albums", artistStatsLine(0, 3))
        assertEquals("No tracks yet", artistStatsLine(0, 0))
    }

    @Test
    fun `mock repository carries no artists`() = runBlocking {
        assertTrue(MockMusicRepository().searchArtists("arijit").isEmpty())
    }

    @Test
    fun `found artist model carries detail identity`() {
        val artist = FoundArtist(id = "UCx", name = "Arijit Singh", subtitle = "Artist", artworkUrl = null)
        assertEquals("UCx", artist.id)
        assertEquals("Arijit Singh", artist.name)
    }
}
