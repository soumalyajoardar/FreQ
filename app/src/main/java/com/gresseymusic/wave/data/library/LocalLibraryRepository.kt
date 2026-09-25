package com.gresseymusic.wave.data.library

import androidx.compose.runtime.staticCompositionLocalOf
import com.gresseymusic.wave.data.model.AlbumItem
import com.gresseymusic.wave.data.model.UserPlaylist
import com.gresseymusic.wave.player.MediaTrack
import kotlinx.coroutines.flow.StateFlow

data class SavedArtistItem(
    val id: String,
    val name: String,
    val artworkUrl: String? = null,
)

data class SavedPlaylistItem(
    val id: String,
    val title: String,
    val author: String? = null,
    val artworkUrl: String? = null,
)

interface LocalLibraryRepository {
    val likedTracks: StateFlow<List<MediaTrack>>
    val recentlyPlayed: StateFlow<List<MediaTrack>>
    val savedAlbums: StateFlow<List<AlbumItem>>
    val savedArtists: StateFlow<List<SavedArtistItem>>
    val savedPlaylists: StateFlow<List<SavedPlaylistItem>>
    val userPlaylists: StateFlow<List<UserPlaylist>>

    fun isTrackLiked(trackId: String): Boolean
    suspend fun toggleTrackLiked(track: MediaTrack): Boolean
    suspend fun recordTrackPlayed(track: MediaTrack)
    suspend fun clearRecentlyPlayed()

    fun isAlbumSaved(albumId: String): Boolean
    suspend fun toggleAlbumSaved(album: AlbumItem): Boolean

    fun isArtistSaved(artistId: String): Boolean
    suspend fun toggleArtistSaved(artistId: String, name: String, artworkUrl: String?): Boolean

    fun isPlaylistSaved(playlistId: String): Boolean
    suspend fun togglePlaylistSaved(playlistId: String, title: String, author: String?, artworkUrl: String?): Boolean

    // User-created Local Playlist Methods
    fun getUserPlaylists(): List<UserPlaylist>
    fun getUserPlaylist(playlistId: String): UserPlaylist?
    suspend fun createPlaylist(title: String, description: String? = null): UserPlaylist?
    suspend fun renamePlaylist(playlistId: String, newTitle: String): Boolean
    suspend fun deletePlaylist(playlistId: String): Boolean
    suspend fun addTrackToPlaylist(playlistId: String, track: MediaTrack): Boolean
    suspend fun removeTrackFromPlaylist(playlistId: String, trackId: String): Boolean
    suspend fun moveTrackInPlaylist(playlistId: String, fromIndex: Int, toIndex: Int): Boolean
}

val LocalLibraryRepositoryProvider = staticCompositionLocalOf<LocalLibraryRepository> {
    error("LocalLibraryRepository not provided")
}
