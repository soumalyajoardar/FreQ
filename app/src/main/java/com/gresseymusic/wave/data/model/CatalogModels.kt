package com.gresseymusic.wave.data.model

import com.gresseymusic.wave.player.MediaTrack

data class HomeCatalogSection(
    val title: String,
    val items: List<HomeCatalogItem>,
)

data class HomeCatalogItem(
    val type: String, // "song", "album", "playlist", "artist"
    val id: String,
    val title: String,
    val subtitle: String? = null,
    val artworkUrl: String? = null,
    val track: MediaTrack? = null,
)

data class ArtistDetail(
    val id: String,
    val name: String,
    val description: String? = null,
    val artworkUrl: String? = null,
    val topSongs: List<MediaTrack> = emptyList(),
    val albums: List<AlbumItem> = emptyList(),
)

/**
 * On-device artist search hit (M28l): channel browse id that opens
 * [ArtistDetail], display name, "Artist • audience" subtitle line, and
 * circular artwork. Real InnerTube data only.
 */
data class FoundArtist(
    val id: String,
    val name: String,
    val subtitle: String? = null,
    val artworkUrl: String? = null,
)

data class AlbumItem(
    val id: String,
    val title: String,
    val artist: String? = null,
    val year: String? = null,
    val artworkUrl: String? = null,
)

data class AlbumDetail(
    val id: String,
    val title: String,
    val artist: String,
    val artistId: String? = null,
    val year: String? = null,
    val artworkUrl: String? = null,
    val tracks: List<MediaTrack> = emptyList(),
)

data class PlaylistDetail(
    val id: String,
    val title: String,
    val description: String? = null,
    val author: String? = null,
    val artworkUrl: String? = null,
    val tracks: List<MediaTrack> = emptyList(),
)
