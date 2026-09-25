package com.gresseymusic.wave.data.repository

import androidx.compose.ui.graphics.Color
import com.gresseymusic.wave.data.model.AlbumDetail
import com.gresseymusic.wave.data.model.AlbumItem
import com.gresseymusic.wave.data.model.ArtistDetail
import com.gresseymusic.wave.data.model.FoundArtist
import com.gresseymusic.wave.data.model.HomeCatalogItem
import com.gresseymusic.wave.data.model.HomeCatalogSection
import com.gresseymusic.wave.data.model.PlaylistDetail
import com.gresseymusic.wave.player.MediaTrack
import com.gresseymusic.wave.ui.theme.WavePrimaryCyan
import com.gresseymusic.wave.ui.theme.WaveSecondaryViolet
import com.gresseymusic.wave.ui.theme.WaveTealAccent

class MockMusicRepository(
    private val packageName: String = "com.gresseymusic.wave",
) : MusicRepository {

    private val allTracks = listOf(
        MediaTrack(
            id = "now_1",
            title = "bad guy",
            artist = "Billie Eilish",
            album = "WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?",
            durationSeconds = 194,
            gradientColors = listOf(WavePrimaryCyan, WaveSecondaryViolet),
            mediaUri = "android.resource://$packageName/raw/test_track_1",
        ),
        MediaTrack(
            id = "song_2",
            title = "when the party's over",
            artist = "Billie Eilish",
            album = "WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?",
            durationSeconds = 196,
            gradientColors = listOf(Color(0xFF8B5CF6), Color(0xFF0F172A)),
            mediaUri = "android.resource://$packageName/raw/test_track_2",
        ),
        MediaTrack(
            id = "song_3",
            title = "lovely",
            artist = "Billie Eilish, Khalid",
            album = "13 Reasons Why",
            durationSeconds = 200,
            gradientColors = listOf(Color(0xFF06B6D4), Color(0xFF3B82F6)),
            mediaUri = "android.resource://$packageName/raw/test_track_3",
        ),
        MediaTrack(
            id = "song_4",
            title = "ocean eyes",
            artist = "Billie Eilish",
            album = "Don't Smile at Me",
            durationSeconds = 200,
            gradientColors = listOf(Color(0xFF3B82F6), Color(0xFF1E1B4B)),
            mediaUri = "android.resource://$packageName/raw/test_track_4",
        ),
        MediaTrack(
            id = "rec_1",
            title = "After Hours",
            artist = "The Weeknd",
            album = "After Hours",
            durationSeconds = 210,
            gradientColors = listOf(Color(0xFFE11D48), Color(0xFF4C1D95), Color(0xFF0F172A)),
            mediaUri = "android.resource://$packageName/raw/test_track_1",
        ),
        MediaTrack(
            id = "rec_2",
            title = "Chill Vibes",
            artist = "WAVE Ambient",
            album = "Chill Vibes",
            durationSeconds = 180,
            gradientColors = listOf(Color(0xFF8B5CF6), Color(0xFF06B6D4), Color(0xFF0F172A)),
            mediaUri = "android.resource://$packageName/raw/test_track_2",
        ),
        MediaTrack(
            id = "rec_3",
            title = "Midnight Drive",
            artist = "Synthwave Neon",
            album = "Midnight Drive",
            durationSeconds = 205,
            gradientColors = listOf(Color(0xFF00E5FF), Color(0xFF6366F1), Color(0xFF090A0F)),
            mediaUri = "android.resource://$packageName/raw/test_track_3",
        ),
        MediaTrack(
            id = "rec_4",
            title = "Cosmic Echoes",
            artist = "Starlight Audio",
            album = "Cosmic Echoes",
            durationSeconds = 220,
            gradientColors = listOf(Color(0xFFD946EF), Color(0xFF8B5CF6), Color(0xFF0F172A)),
            mediaUri = "android.resource://$packageName/raw/test_track_4",
        ),
        MediaTrack(
            id = "feat_1",
            title = "Discover Weekly",
            artist = "FreQ Curation",
            album = "Made For You",
            durationSeconds = 190,
            gradientColors = listOf(WavePrimaryCyan, WaveSecondaryViolet, WaveTealAccent),
            mediaUri = "android.resource://$packageName/raw/test_track_1",
        ),
        MediaTrack(
            id = "trend_1",
            title = "Hyperpop Aura",
            artist = "Global Top 50",
            album = "Hyperpop",
            durationSeconds = 185,
            gradientColors = listOf(Color(0xFFEC4899), Color(0xFF8B5CF6)),
            mediaUri = "android.resource://$packageName/raw/test_track_1",
        ),
        MediaTrack(
            id = "trend_2",
            title = "Deep Dive",
            artist = "Viral Hits",
            album = "Deep Dive",
            durationSeconds = 195,
            gradientColors = listOf(Color(0xFF06B6D4), Color(0xFF3B82F6)),
            mediaUri = "android.resource://$packageName/raw/test_track_2",
        ),
        MediaTrack(
            id = "trend_3",
            title = "Astral Echo",
            artist = "Electro Wave",
            album = "Astral",
            durationSeconds = 205,
            gradientColors = listOf(Color(0xFFA855F7), Color(0xFFEC4899)),
            mediaUri = "android.resource://$packageName/raw/test_track_3",
        ),
        MediaTrack(
            id = "alb_1",
            title = "Happier Than Ever",
            artist = "Billie Eilish",
            album = "Happier Than Ever",
            durationSeconds = 210,
            gradientColors = listOf(Color(0xFFF59E0B), Color(0xFF1E1B4B)),
            mediaUri = "android.resource://$packageName/raw/test_track_1",
        ),
        MediaTrack(
            id = "alb_2",
            title = "SOUR",
            artist = "Olivia Rodrigo",
            album = "SOUR",
            durationSeconds = 190,
            gradientColors = listOf(Color(0xFF8B5CF6), Color(0xFFEC4899)),
            mediaUri = "android.resource://$packageName/raw/test_track_2",
        ),
        MediaTrack(
            id = "alb_3",
            title = "IGOR",
            artist = "Tyler, The Creator",
            album = "IGOR",
            durationSeconds = 200,
            gradientColors = listOf(Color(0xFFEC4899), Color(0xFF0F172A)),
            mediaUri = "android.resource://$packageName/raw/test_track_3",
        ),
        MediaTrack(
            id = "alb_4",
            title = "Dawn FM",
            artist = "The Weeknd",
            album = "Dawn FM",
            durationSeconds = 215,
            gradientColors = listOf(Color(0xFF00E5FF), Color(0xFF1E1B4B)),
            mediaUri = "android.resource://$packageName/raw/test_track_4",
        ),
    )

    override suspend fun getHomeTracks(): List<MediaTrack> {
        return allTracks
    }

    override suspend fun getSearchResults(query: String): CatalogResult<List<MediaTrack>> {
        if (query.isBlank()) return CatalogResult.Success(allTracks)
        return CatalogResult.Success(
            allTracks.filter {
                it.title.contains(query, ignoreCase = true) ||
                    it.artist.contains(query, ignoreCase = true) ||
                    it.album.contains(query, ignoreCase = true)
            },
        )
    }

    override suspend fun getLibraryTracks(): List<MediaTrack> {
        return allTracks
    }

    override suspend fun getTrack(trackId: String): MediaTrack? {
        return allTracks.find { it.id == trackId }
    }

    override suspend fun getWatchContinuation(trackId: String, limit: Int): List<MediaTrack> {
        // Test-only seam: continuation is backend metadata; the mock has no
        // watch source, so callers must fall back to the local engine.
        return emptyList()
    }

    override suspend fun searchArtists(query: String): List<FoundArtist> {
        // Test-only seam: the mock carries no artist index.
        return emptyList()
    }

    override suspend fun getLyrics(track: MediaTrack): List<String>? {
        // Test-only seam: the mock carries no lyrics; callers render the
        // honest empty state.
        return null
    }

    override suspend fun getHomeCatalog(): CatalogResult<List<HomeCatalogSection>> {
        return CatalogResult.Success(
            listOf(
            HomeCatalogSection(
                title = "Made For You",
                items = listOf(
                    HomeCatalogItem(
                        type = "playlist",
                        id = "feat_1",
                        title = "Discover Weekly",
                        subtitle = "Your weekly mix of fresh music",
                        track = allTracks.find { it.id == "feat_1" },
                    )
                )
            ),
            HomeCatalogSection(
                title = "Trending Now",
                items = allTracks.filter { it.id.startsWith("trend_") }.map { track ->
                    HomeCatalogItem(
                        type = "song",
                        id = track.id,
                        title = track.title,
                        subtitle = track.artist,
                        track = track,
                    )
                }
            )
            )
        )
    }

    override suspend fun getArtist(id: String): CatalogResult<ArtistDetail?> {
        val artistSongs = allTracks.filter { it.artist.contains("Billie Eilish", ignoreCase = true) }.ifEmpty { allTracks.take(4) }
        return CatalogResult.Success(
            ArtistDetail(
                id = id,
                name = "Billie Eilish",
                description = "American singer and songwriter known for her distinct pop sound.",
                topSongs = artistSongs,
                albums = listOf(
                    AlbumItem(id = "alb_1", title = "WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?", artist = "Billie Eilish", year = "2019"),
                    AlbumItem(id = "alb_2", title = "Happier Than Ever", artist = "Billie Eilish", year = "2021"),
                )
            )
        )
    }

    override suspend fun getAlbum(id: String): CatalogResult<AlbumDetail?> {
        val albumSongs = allTracks.take(4)
        return CatalogResult.Success(
            AlbumDetail(
                id = id,
                title = "WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?",
                artist = "Billie Eilish",
                artistId = "art_1",
                year = "2019",
                tracks = albumSongs,
            )
        )
    }

    override suspend fun getPlaylist(id: String): CatalogResult<PlaylistDetail?> {
        val playlistSongs = allTracks.take(4)
        return CatalogResult.Success(
            PlaylistDetail(
                id = id,
                title = "Discover Weekly",
                description = "Your weekly mix of fresh music",
                author = "FreQ Curation",
                tracks = playlistSongs,
            )
        )
    }
}
