package com.gresseymusic.wave.data.remote

data class YtMusicSearchResponse(
    val tracks: List<YtMusicTrackDto> = emptyList(),
)

data class YtMusicHomeResponse(
    val sections: List<YtMusicHomeSectionDto> = emptyList(),
)

data class YtMusicHomeSectionDto(
    val title: String,
    val items: List<YtMusicHomeItemDto> = emptyList(),
)

data class YtMusicHomeItemDto(
    val type: String,
    val id: String,
    val title: String,
    val artist: String? = null,
    val artistId: String? = null,
    val album: String? = null,
    val year: String? = null,
    val durationMs: Long? = null,
    val artworkUrl: String? = null,
    val provider: String? = null,
)

data class YtMusicTrackDto(
    val id: String,
    val title: String,
    val artist: String,
    val album: String? = null,
    val durationMs: Long? = null,
    val artworkUrl: String? = null,
    val provider: String? = null,
)

/**
 * YouTube Music watch-continuation response (M27.1).
 *
 * Backed by the existing backend metadata path `GET /api/watch/{id}`
 * (ytmusicapi `get_watch_playlist`, no stream extraction): the ordered
 * similar/up-next tracks for a seed track. Pure metadata — stream
 * resolution stays on the existing playback path.
 */
data class YtMusicWatchResponse(
    val trackId: String,
    val playlistId: String? = null,
    val tracks: List<YtMusicTrackDto> = emptyList(),
)

data class YtMusicArtistDto(
    val id: String,
    val name: String,
    val description: String? = null,
    val artworkUrl: String? = null,
    val topSongs: List<YtMusicTrackDto> = emptyList(),
    val albums: List<YtMusicAlbumItemDto> = emptyList(),
)

data class YtMusicAlbumItemDto(
    val type: String = "album",
    val id: String,
    val title: String,
    val artist: String? = null,
    val year: String? = null,
    val artworkUrl: String? = null,
    val provider: String? = null,
)

data class YtMusicAlbumDto(
    val id: String,
    val title: String,
    val artist: String,
    val artistId: String? = null,
    val year: String? = null,
    val artworkUrl: String? = null,
    val tracks: List<YtMusicTrackDto> = emptyList(),
)

data class YtMusicPlaylistDto(
    val id: String,
    val title: String,
    val description: String? = null,
    val author: String? = null,
    val artworkUrl: String? = null,
    val tracks: List<YtMusicTrackDto> = emptyList(),
)
