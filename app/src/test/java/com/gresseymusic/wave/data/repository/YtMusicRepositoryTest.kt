package com.gresseymusic.wave.data.repository

import com.gresseymusic.wave.data.remote.YtMusicAlbumDto
import com.gresseymusic.wave.data.remote.YtMusicAlbumItemDto
import com.gresseymusic.wave.data.remote.YtMusicApiClient
import com.gresseymusic.wave.data.remote.YtMusicArtistDto
import com.gresseymusic.wave.data.remote.YtMusicErrorKind
import com.gresseymusic.wave.data.remote.YtMusicException
import com.gresseymusic.wave.data.remote.YtMusicHomeResponse
import com.gresseymusic.wave.data.remote.YtMusicHomeSectionDto
import com.gresseymusic.wave.data.remote.YtMusicHomeItemDto
import com.gresseymusic.wave.data.remote.YtMusicPlaylistDto
import com.gresseymusic.wave.data.remote.YtMusicTrackDto
import com.gresseymusic.wave.player.MediaTrack
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test

/**
 * Repository failure-handling tests (Milestone 11 fix pass).
 *
 * Uses a fake [YtMusicApiClient] subclass — no network. Verifies that
 * backend failures surface as [CatalogResult.Failure] (so the UI can render
 * error/offline states) and that mock catalog content is never substituted
 * for a failed production read.
 */
class YtMusicRepositoryTest {

    private class FakeYtMusicApiClient : YtMusicApiClient("https://fake.test/") {
        var searchResult: List<MediaTrack> = emptyList()
        var searchFailure: Throwable? = null
        var homeResult: YtMusicHomeResponse = YtMusicHomeResponse()
        var homeFailure: Throwable? = null
        var artistResult: YtMusicArtistDto? = null
        var artistFailure: Throwable? = null
        var albumResult: YtMusicAlbumDto? = null
        var albumFailure: Throwable? = null
        var playlistResult: YtMusicPlaylistDto? = null
        var playlistFailure: Throwable? = null
        var trackResult: MediaTrack? = null
        var trackFailure: Throwable? = null

        override suspend fun searchTracks(query: String): List<MediaTrack> {
            searchFailure?.let { throw it }
            return searchResult
        }

        override suspend fun getHome(): YtMusicHomeResponse {
            homeFailure?.let { throw it }
            return homeResult
        }

        override suspend fun getArtist(artistId: String): YtMusicArtistDto? {
            artistFailure?.let { throw it }
            return artistResult
        }

        override suspend fun getAlbum(albumId: String): YtMusicAlbumDto? {
            albumFailure?.let { throw it }
            return albumResult
        }

        override suspend fun getPlaylist(playlistId: String): YtMusicPlaylistDto? {
            playlistFailure?.let { throw it }
            return playlistResult
        }

        override suspend fun getTrackDetails(trackId: String): MediaTrack? {
            trackFailure?.let { throw it }
            return trackResult
        }
    }

    private fun repo(fake: FakeYtMusicApiClient) = YtMusicRepository(apiClient = fake)

    private fun trackDto(id: String) = YtMusicTrackDto(
        id = id,
        title = "Title $id",
        artist = "Artist $id",
        album = "Album $id",
        durationMs = 180000L,
    )

    @Test
    fun `search success passes real tracks through`() = runBlocking {
        val fake = FakeYtMusicApiClient()
        fake.searchResult = listOf(
            MediaTrack(id = "vid1", title = "Song", artist = "Singer", album = "Record"),
        )
        val result = repo(fake).getSearchResults("song")
        assertTrue(result is CatalogResult.Success)
        assertEquals(1, (result as CatalogResult.Success).data.size)
        assertEquals("vid1", result.data.first().id)
    }

    @Test
    fun `search network failure becomes Failure, not fake results`() = runBlocking {
        val fake = FakeYtMusicApiClient()
        fake.searchFailure = YtMusicException(YtMusicErrorKind.NETWORK_ERROR, "down")
        val result = repo(fake).getSearchResults("song")
        assertTrue(result is CatalogResult.Failure)
        assertEquals(YtMusicErrorKind.NETWORK_ERROR, (result as CatalogResult.Failure).kind)
    }

    @Test
    fun `search rate limiting surfaces as RATE_LIMITED`() = runBlocking {
        val fake = FakeYtMusicApiClient()
        fake.searchFailure = YtMusicException(YtMusicErrorKind.RATE_LIMITED, "throttled")
        val result = repo(fake).getSearchResults("song")
        assertEquals(
            YtMusicErrorKind.RATE_LIMITED,
            (result as CatalogResult.Failure).kind,
        )
    }

    @Test
    fun `album 404 returns Failure, never mock fallback content`() = runBlocking {
        val fake = FakeYtMusicApiClient()
        fake.albumFailure = YtMusicException(YtMusicErrorKind.NOT_FOUND, "nope")
        val result = repo(fake).getAlbum("missing_album")
        // Before the fix this path returned fake Billie Eilish content from
        // MockMusicRepository; now it must be an explicit failure.
        assertTrue(result is CatalogResult.Failure)
        assertEquals(YtMusicErrorKind.NOT_FOUND, (result as CatalogResult.Failure).kind)
    }

    @Test
    fun `album null backend payload returns NOT_FOUND failure`() = runBlocking {
        val fake = FakeYtMusicApiClient()
        fake.albumResult = null
        val result = repo(fake).getAlbum("missing_album")
        assertTrue(result is CatalogResult.Failure)
        assertEquals(YtMusicErrorKind.NOT_FOUND, (result as CatalogResult.Failure).kind)
    }

    @Test
    fun `playlist server error returns SERVER_ERROR failure`() = runBlocking {
        val fake = FakeYtMusicApiClient()
        fake.playlistFailure = YtMusicException(YtMusicErrorKind.SERVER_ERROR, "boom")
        val result = repo(fake).getPlaylist("pl1")
        assertTrue(result is CatalogResult.Failure)
        assertEquals(YtMusicErrorKind.SERVER_ERROR, (result as CatalogResult.Failure).kind)
    }

    @Test
    fun `artist success maps DTO fields`() = runBlocking {
        val fake = FakeYtMusicApiClient()
        fake.artistResult = YtMusicArtistDto(
            id = "ar1",
            name = "Real Artist",
            topSongs = listOf(trackDto("v1")),
            albums = listOf(),
        )
        val result = repo(fake).getArtist("ar1")
        assertTrue(result is CatalogResult.Success)
        val artist = (result as CatalogResult.Success).data
        assertNotNull(artist)
        assertEquals("Real Artist", artist!!.name)
        assertEquals(1, artist.topSongs.size)
        assertEquals("v1", artist.topSongs.first().id)
    }

    @Test
    fun `home item without artist or album has null subtitle, never null-string`() = runBlocking {
        // Regression test for the M11 follow-up "null" labels bug: production
        // /api/home items carry explicit JSON nulls for artist/album. Once
        // parsed, both DTO fields are Kotlin null, so the repository subtitle
        // must be null (rendered as empty) — never the literal "null".
        val fake = FakeYtMusicApiClient()
        fake.homeResult = YtMusicHomeResponse(
            sections = listOf(
                YtMusicHomeSectionDto(
                    title = "Throwbacks",
                    items = listOf(
                        YtMusicHomeItemDto(
                            type = "playlist",
                            id = "RDCLAK5uy_test",
                            title = "The Hits: '80s",
                            artist = null,
                            album = null,
                        ),
                    ),
                ),
            ),
        )
        val result = repo(fake).getHomeCatalog()
        assertTrue(result is CatalogResult.Success)
        val item = (result as CatalogResult.Success).data.first().items.first()
        assertEquals("Throwbacks", (result.data.first()).title)
        assertEquals("The Hits: '80s", item.title)
        assertNull(item.subtitle)
    }

    @Test
    fun `home item prefers artist over album for subtitle`() = runBlocking {
        val fake = FakeYtMusicApiClient()
        fake.homeResult = YtMusicHomeResponse(
            sections = listOf(
                YtMusicHomeSectionDto(
                    title = "New",
                    items = listOf(
                        YtMusicHomeItemDto(
                            type = "song",
                            id = "v1",
                            title = "Fresh",
                            artist = "Real Artist",
                            album = "Real Album",
                        ),
                    ),
                ),
            ),
        )
        val result = repo(fake).getHomeCatalog()
        assertTrue(result is CatalogResult.Success)
        assertEquals("Real Artist", (result as CatalogResult.Success).data.first().items.first().subtitle)
    }

    @Test
    fun `home success maps sections, genuine empty stays empty success`() = runBlocking {
        val fake = FakeYtMusicApiClient()
        fake.homeResult = YtMusicHomeResponse(
            sections = listOf(
                YtMusicHomeSectionDto(
                    title = "New",
                    items = listOf(
                        YtMusicHomeItemDto(type = "song", id = "v9", title = "Fresh"),
                    ),
                ),
            ),
        )
        val result = repo(fake).getHomeCatalog()
        assertTrue(result is CatalogResult.Success)
        assertEquals(1, (result as CatalogResult.Success).data.size)

        fake.homeResult = YtMusicHomeResponse()
        val empty = repo(fake).getHomeCatalog()
        assertTrue(empty is CatalogResult.Success)
        assertTrue((empty as CatalogResult.Success).data.isEmpty())
    }

    @Test
    fun `home network failure becomes Failure`() = runBlocking {
        val fake = FakeYtMusicApiClient()
        fake.homeFailure = YtMusicException(YtMusicErrorKind.NETWORK_ERROR, "down")
        val result = repo(fake).getHomeCatalog()
        assertEquals(
            YtMusicErrorKind.NETWORK_ERROR,
            (result as CatalogResult.Failure).kind,
        )
    }

    @Test
    fun `cancellation propagates instead of becoming Failure`() {
        val fake = FakeYtMusicApiClient()
        fake.searchFailure = CancellationException("obsolete search")
        assertThrows(CancellationException::class.java) {
            runBlocking { repo(fake).getSearchResults("song") }
        }
    }

    @Test
    fun `getTrack still degrades to null on failure for session restore`() = runBlocking {
        // PlaybackManager restore skips null tracks; that contract is unchanged.
        val fake = FakeYtMusicApiClient()
        fake.trackFailure = YtMusicException(YtMusicErrorKind.NETWORK_ERROR, "down")
        assertNull(repo(fake).getTrack("anything"))
    }

    @Test
    fun `getTrack returns restored track on success`() = runBlocking {
        val fake = FakeYtMusicApiClient()
        fake.trackResult = MediaTrack(id = "v1", title = "Song", artist = "Singer", album = "Record")
        val track = repo(fake).getTrack("v1")
        assertNotNull(track)
        assertEquals("v1", track!!.id)
    }

    @Test
    fun `album success maps fields`() = runBlocking {
        val fake = FakeYtMusicApiClient()
        fake.albumResult = YtMusicAlbumDto(
            id = "al1",
            title = "Real Album",
            artist = "Real Artist",
            artistId = "ar1",
            year = "2024",
            tracks = listOf(trackDto("v1"), trackDto("v2")),
        )
        val result = repo(fake).getAlbum("al1")
        assertTrue(result is CatalogResult.Success)
        val album = (result as CatalogResult.Success).data
        assertNotNull(album)
        assertEquals("Real Album", album!!.title)
        assertEquals("ar1", album.artistId)
        assertEquals(2, album.tracks.size)
        assertEquals("Real Album", album.tracks.first().album)
    }

    @Test
    fun `album with empty track list is still success`() = runBlocking {
        val fake = FakeYtMusicApiClient()
        fake.albumResult = YtMusicAlbumDto(
            id = "al1",
            title = "Empty Album",
            artist = "Someone",
        )
        val result = repo(fake).getAlbum("al1")
        assertTrue(result is CatalogResult.Success)
        assertTrue((result as CatalogResult.Success).data!!.tracks.isEmpty())
    }

    @Test
    fun `album server error becomes Failure`() = runBlocking {
        val fake = FakeYtMusicApiClient()
        fake.albumFailure = YtMusicException(YtMusicErrorKind.SERVER_ERROR, "boom")
        val result = repo(fake).getAlbum("al1")
        assertEquals(YtMusicErrorKind.SERVER_ERROR, (result as CatalogResult.Failure).kind)
    }

    @Test
    fun `playlist success maps fields`() = runBlocking {
        val fake = FakeYtMusicApiClient()
        fake.playlistResult = YtMusicPlaylistDto(
            id = "pl1",
            title = "Real Playlist",
            description = "A mix",
            author = "Curator",
            tracks = listOf(trackDto("v1")),
        )
        val result = repo(fake).getPlaylist("pl1")
        assertTrue(result is CatalogResult.Success)
        val playlist = (result as CatalogResult.Success).data
        assertNotNull(playlist)
        assertEquals("Real Playlist", playlist!!.title)
        assertEquals("Curator", playlist.author)
        assertEquals(1, playlist.tracks.size)
    }

    @Test
    fun `playlist with empty track list is still success`() = runBlocking {
        val fake = FakeYtMusicApiClient()
        fake.playlistResult = YtMusicPlaylistDto(id = "pl1", title = "Empty", author = "Nobody")
        val result = repo(fake).getPlaylist("pl1")
        assertTrue(result is CatalogResult.Success)
        assertTrue((result as CatalogResult.Success).data!!.tracks.isEmpty())
    }

    @Test
    fun `artist not found becomes NOT_FOUND failure`() = runBlocking {
        val fake = FakeYtMusicApiClient()
        fake.artistFailure = YtMusicException(YtMusicErrorKind.NOT_FOUND, "gone")
        val result = repo(fake).getArtist("missing")
        assertEquals(YtMusicErrorKind.NOT_FOUND, (result as CatalogResult.Failure).kind)
    }

    @Test
    fun `artist network error becomes Failure`() = runBlocking {
        val fake = FakeYtMusicApiClient()
        fake.artistFailure = YtMusicException(YtMusicErrorKind.NETWORK_ERROR, "down")
        val result = repo(fake).getArtist("ar1")
        assertEquals(YtMusicErrorKind.NETWORK_ERROR, (result as CatalogResult.Failure).kind)
    }

    @Test
    fun `artist with empty albums is still success`() = runBlocking {
        val fake = FakeYtMusicApiClient()
        fake.artistResult = YtMusicArtistDto(id = "ar1", name = "Solo")
        val result = repo(fake).getArtist("ar1")
        assertTrue(result is CatalogResult.Success)
        val artist = (result as CatalogResult.Success).data
        assertNotNull(artist)
        assertTrue(artist!!.albums.isEmpty())
        assertTrue(artist.topSongs.isEmpty())
    }

    @Test
    fun `malformed backend payload becomes MALFORMED failure`() = runBlocking {
        val fake = FakeYtMusicApiClient()
        fake.searchFailure = YtMusicException(YtMusicErrorKind.MALFORMED_RESPONSE, "bad json")
        val result = repo(fake).getSearchResults("song")
        assertEquals(YtMusicErrorKind.MALFORMED_RESPONSE, (result as CatalogResult.Failure).kind)
    }

    @Test
    fun `genuine empty search stays empty success`() = runBlocking {
        val fake = FakeYtMusicApiClient()
        fake.searchResult = emptyList()
        val result = repo(fake).getSearchResults("zzzznoresults")
        assertTrue(result is CatalogResult.Success)
        assertTrue((result as CatalogResult.Success).data.isEmpty())
    }

    @Test
    fun `production catalog mappings never emit test-track audio`() = runBlocking {
        // M14: development audio (test_track_N) must never leak into
        // production catalog results. The production repository maps every
        // remote track with a null local uri; remote playability is resolved
        // later via the playback provider, never via bundled fixtures.
        val fake = FakeYtMusicApiClient()
        fake.searchResult = listOf(
            MediaTrack(id = "v1", title = "Song", artist = "Singer", album = "Record"),
        )
        fake.homeResult = YtMusicHomeResponse(
            sections = listOf(
                YtMusicHomeSectionDto(
                    title = "New",
                    items = listOf(
                        YtMusicHomeItemDto(type = "song", id = "v1", title = "Song", artist = "Singer"),
                    ),
                ),
            ),
        )
        fake.artistResult = YtMusicArtistDto(
            id = "ar1",
            name = "Artist",
            topSongs = listOf(trackDto("v1")),
            albums = listOf(YtMusicAlbumItemDto(id = "al1", title = "Album")),
        )
        fake.albumResult = YtMusicAlbumDto(
            id = "al1",
            title = "Album",
            artist = "Artist",
            tracks = listOf(trackDto("v1")),
        )
        fake.playlistResult = YtMusicPlaylistDto(
            id = "pl1",
            title = "Playlist",
            tracks = listOf(trackDto("v1")),
        )

        val repository = repo(fake)
        val collected = mutableListOf<MediaTrack>()
        (repository.getSearchResults("song") as CatalogResult.Success).data.let(collected::addAll)
        (repository.getHomeCatalog() as CatalogResult.Success).data.forEach { section ->
            section.items.mapNotNullTo(collected) { it.track }
        }
        collected.addAll((repository.getArtist("ar1") as CatalogResult.Success).data!!.topSongs)
        collected.addAll((repository.getAlbum("al1") as CatalogResult.Success).data!!.tracks)
        collected.addAll((repository.getPlaylist("pl1") as CatalogResult.Success).data!!.tracks)

        assertTrue(collected.isNotEmpty())
        collected.forEach { track ->
            val uri = track.mediaUri ?: ""
            assertFalse("track ${track.id} leaks dev audio: $uri", uri.contains("test_track_"))
            assertFalse("track ${track.id} leaks dev audio: $uri", uri.contains("android.resource"))
        }
    }

    @Test
    fun `mock repository still serves dev tracks as Success`() = runBlocking {        // MockMusicRepository is retained for dev/test playback paths — it now
        // speaks the same CatalogResult contract.
        val mock = MockMusicRepository()
        val search = mock.getSearchResults("bad guy")
        assertTrue(search is CatalogResult.Success)
        assertTrue((search as CatalogResult.Success).data.isNotEmpty())
        val album = mock.getAlbum("alb_1")
        assertTrue((album as CatalogResult.Success).data != null)
    }
}
