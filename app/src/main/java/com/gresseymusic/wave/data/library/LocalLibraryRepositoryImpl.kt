package com.gresseymusic.wave.data.library

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.gresseymusic.wave.data.model.AlbumItem
import com.gresseymusic.wave.data.model.UserPlaylist
import com.gresseymusic.wave.player.MediaTrack
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

private val Context.libraryDataStore: DataStore<Preferences> by preferencesDataStore(name = "freq_library_prefs")

class LocalLibraryRepositoryImpl(
    context: Context,
) : LocalLibraryRepository {

    private val dataStore = context.applicationContext.libraryDataStore
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val mutex = Mutex()

    // Set when the initial DataStore read itself fails (not per-collection
    // parse failures, which degrade to empty lists). While set, disk writes
    // are skipped so a session running on unreadable prefs can never
    // overwrite them with partial state; in-memory state stays fully live.
    // Always accessed under [mutex].
    private var initialLoadFailed = false

    companion object {
        val KEY_LIKED_TRACKS = stringPreferencesKey("liked_tracks_json")
        val KEY_RECENTLY_PLAYED = stringPreferencesKey("recently_played_json")
        val KEY_SAVED_ALBUMS = stringPreferencesKey("saved_albums_json")
        val KEY_SAVED_ARTISTS = stringPreferencesKey("saved_artists_json")
        val KEY_SAVED_PLAYLISTS = stringPreferencesKey("saved_playlists_json")
        val KEY_USER_PLAYLISTS = stringPreferencesKey("user_playlists_json")
    }

    private val _likedTracks = MutableStateFlow<List<MediaTrack>>(emptyList())
    override val likedTracks: StateFlow<List<MediaTrack>> = _likedTracks.asStateFlow()

    private val _recentlyPlayed = MutableStateFlow<List<MediaTrack>>(emptyList())
    override val recentlyPlayed: StateFlow<List<MediaTrack>> = _recentlyPlayed.asStateFlow()

    private val _savedAlbums = MutableStateFlow<List<AlbumItem>>(emptyList())
    override val savedAlbums: StateFlow<List<AlbumItem>> = _savedAlbums.asStateFlow()

    private val _savedArtists = MutableStateFlow<List<SavedArtistItem>>(emptyList())
    override val savedArtists: StateFlow<List<SavedArtistItem>> = _savedArtists.asStateFlow()

    private val _savedPlaylists = MutableStateFlow<List<SavedPlaylistItem>>(emptyList())
    override val savedPlaylists: StateFlow<List<SavedPlaylistItem>> = _savedPlaylists.asStateFlow()

    private val _userPlaylists = MutableStateFlow<List<UserPlaylist>>(emptyList())
    override val userPlaylists: StateFlow<List<UserPlaylist>> = _userPlaylists.asStateFlow()

    init {
        scope.launch {
            loadLibraryFromDataStore()
        }
    }

    private suspend fun loadLibraryFromDataStore() {
        mutex.withLock {
            try {
                val prefs = dataStore.data.firstOrNull() ?: return@withLock
                val likedJson = prefs[KEY_LIKED_TRACKS] ?: "[]"
                val recentJson = prefs[KEY_RECENTLY_PLAYED] ?: "[]"
                val albumsJson = prefs[KEY_SAVED_ALBUMS] ?: "[]"
                val artistsJson = prefs[KEY_SAVED_ARTISTS] ?: "[]"
                val playlistsJson = prefs[KEY_SAVED_PLAYLISTS] ?: "[]"
                val userPlJson = prefs[KEY_USER_PLAYLISTS] ?: "[]"

                _likedTracks.value = try { parseTracksJson(likedJson) } catch (e: Exception) { emptyList() }
                _recentlyPlayed.value = try { parseTracksJson(recentJson) } catch (e: Exception) { emptyList() }
                _savedAlbums.value = try { parseAlbumsJson(albumsJson) } catch (e: Exception) { emptyList() }
                _savedArtists.value = try { parseArtistsJson(artistsJson) } catch (e: Exception) { emptyList() }
                _savedPlaylists.value = try { parsePlaylistsJson(playlistsJson) } catch (e: Exception) { emptyList() }
                _userPlaylists.value = try { parseUserPlaylistsJson(userPlJson) } catch (e: Exception) { emptyList() }
            } catch (e: Exception) {
                e.printStackTrace()
                initialLoadFailed = true
            }
        }
    }

    override fun isTrackLiked(trackId: String): Boolean {
        return _likedTracks.value.any { it.id == trackId }
    }

    override suspend fun toggleTrackLiked(track: MediaTrack): Boolean {
        return mutex.withLock {
            val (updated, nowLiked) = toggleItemInList(_likedTracks.value, track, MediaTrack::id)
            _likedTracks.value = updated
            saveKeyToDataStore(KEY_LIKED_TRACKS, serializeTracksJson(updated))
            nowLiked
        }
    }

    override suspend fun recordTrackPlayed(track: MediaTrack) {
        // M27.2: record every successfully played track with a stable id,
        // including remote YTMusic catalog tracks (null local uri). Blank
        // ids can never dedupe or persist and are still skipped. Playability
        // itself is gated upstream by PlaybackManager (source must resolve).
        if (track.id.isBlank()) return

        mutex.withLock {
            val bounded = addTrackToRecent(_recentlyPlayed.value, track) ?: return@withLock
            _recentlyPlayed.value = bounded
            saveKeyToDataStore(KEY_RECENTLY_PLAYED, serializeTracksJson(bounded))
        }
    }

    override suspend fun clearRecentlyPlayed() {
        mutex.withLock {
            _recentlyPlayed.value = emptyList()
            saveKeyToDataStore(KEY_RECENTLY_PLAYED, "[]")
        }
    }

    override fun isAlbumSaved(albumId: String): Boolean {
        return _savedAlbums.value.any { it.id == albumId }
    }

    override suspend fun toggleAlbumSaved(album: AlbumItem): Boolean {
        return mutex.withLock {
            val (updated, nowSaved) = toggleItemInList(_savedAlbums.value, album, AlbumItem::id)
            _savedAlbums.value = updated
            saveKeyToDataStore(KEY_SAVED_ALBUMS, serializeAlbumsJson(updated))
            nowSaved
        }
    }

    override fun isArtistSaved(artistId: String): Boolean {
        return _savedArtists.value.any { it.id == artistId }
    }

    override suspend fun toggleArtistSaved(artistId: String, name: String, artworkUrl: String?): Boolean {
        return mutex.withLock {
            val item = SavedArtistItem(id = artistId, name = name, artworkUrl = artworkUrl)
            val (updated, nowSaved) = toggleItemInList(_savedArtists.value, item, SavedArtistItem::id)
            _savedArtists.value = updated
            saveKeyToDataStore(KEY_SAVED_ARTISTS, serializeArtistsJson(updated))
            nowSaved
        }
    }

    override fun isPlaylistSaved(playlistId: String): Boolean {
        return _savedPlaylists.value.any { it.id == playlistId }
    }

    override suspend fun togglePlaylistSaved(playlistId: String, title: String, author: String?, artworkUrl: String?): Boolean {
        return mutex.withLock {
            val item = SavedPlaylistItem(id = playlistId, title = title, author = author, artworkUrl = artworkUrl)
            val (updated, nowSaved) = toggleItemInList(_savedPlaylists.value, item, SavedPlaylistItem::id)
            _savedPlaylists.value = updated
            saveKeyToDataStore(KEY_SAVED_PLAYLISTS, serializePlaylistsJson(updated))
            nowSaved
        }
    }

    // User-created Local Playlist Implementation
    override fun getUserPlaylists(): List<UserPlaylist> {
        return _userPlaylists.value
    }

    override fun getUserPlaylist(playlistId: String): UserPlaylist? {
        return _userPlaylists.value.find { it.id == playlistId }
    }

    override suspend fun createPlaylist(title: String, description: String?): UserPlaylist? {
        if (!isValidPlaylistTitle(title)) return null
        return mutex.withLock {
            val now = System.currentTimeMillis()
            val newPlaylist = UserPlaylist(
                id = "user_pl_${UUID.randomUUID()}",
                title = title.trim(),
                description = sanitizePlaylistDescription(description),
                artworkUrl = null,
                createdAtMs = now,
                updatedAtMs = now,
                tracks = emptyList(),
            )
            val current = _userPlaylists.value.toMutableList()
            current.add(0, newPlaylist)
            _userPlaylists.value = current
            saveKeyToDataStore(KEY_USER_PLAYLISTS, serializeUserPlaylistsJson(current))
            newPlaylist
        }
    }

    override suspend fun renamePlaylist(playlistId: String, newTitle: String): Boolean {
        if (!isValidPlaylistTitle(newTitle)) return false
        return mutex.withLock {
            val current = _userPlaylists.value.toMutableList()
            val index = current.indexOfFirst { it.id == playlistId }
            if (index == -1) return@withLock false

            val existing = current[index]
            val updated = existing.copy(
                title = newTitle.trim(),
                updatedAtMs = System.currentTimeMillis(),
            )
            current[index] = updated
            _userPlaylists.value = current
            saveKeyToDataStore(KEY_USER_PLAYLISTS, serializeUserPlaylistsJson(current))
            true
        }
    }

    override suspend fun deletePlaylist(playlistId: String): Boolean {
        return mutex.withLock {
            val current = _userPlaylists.value.toMutableList()
            val removed = current.removeAll { it.id == playlistId }
            if (removed) {
                _userPlaylists.value = current
                saveKeyToDataStore(KEY_USER_PLAYLISTS, serializeUserPlaylistsJson(current))
            }
            removed
        }
    }

    override suspend fun addTrackToPlaylist(playlistId: String, track: MediaTrack): Boolean {
        return mutex.withLock {
            val current = _userPlaylists.value.toMutableList()
            val index = current.indexOfFirst { it.id == playlistId }
            if (index == -1) return@withLock false

            val existing = current[index]
            // Rule: Do not add duplicate tracks; leave existing track in current position
            val updatedTracks = addPlaylistTrackIfAbsent(existing.tracks, track) ?: return@withLock false

            val firstArt = existing.artworkUrl ?: track.artworkUrl
            val updated = existing.copy(
                tracks = updatedTracks,
                artworkUrl = firstArt,
                updatedAtMs = System.currentTimeMillis(),
            )
            current[index] = updated
            _userPlaylists.value = current
            saveKeyToDataStore(KEY_USER_PLAYLISTS, serializeUserPlaylistsJson(current))
            true
        }
    }

    override suspend fun removeTrackFromPlaylist(playlistId: String, trackId: String): Boolean {
        return mutex.withLock {
            val current = _userPlaylists.value.toMutableList()
            val index = current.indexOfFirst { it.id == playlistId }
            if (index == -1) return@withLock false

            val existing = current[index]
            val updatedTracks = removePlaylistTrack(existing.tracks, trackId) ?: return@withLock false

            val newArt = derivePlaylistArtworkAfterRemove(updatedTracks)
            val updated = existing.copy(
                tracks = updatedTracks,
                artworkUrl = newArt,
                updatedAtMs = System.currentTimeMillis(),
            )
            current[index] = updated
            _userPlaylists.value = current
            saveKeyToDataStore(KEY_USER_PLAYLISTS, serializeUserPlaylistsJson(current))
            true
        }
    }

    override suspend fun moveTrackInPlaylist(playlistId: String, fromIndex: Int, toIndex: Int): Boolean {
        return mutex.withLock {
            val current = _userPlaylists.value.toMutableList()
            val index = current.indexOfFirst { it.id == playlistId }
            if (index == -1) return@withLock false

            val existing = current[index]
            val tracks = moveItemInList(existing.tracks, fromIndex, toIndex) ?: return@withLock false

            val updated = existing.copy(
                tracks = tracks,
                updatedAtMs = System.currentTimeMillis(),
            )
            current[index] = updated
            _userPlaylists.value = current
            saveKeyToDataStore(KEY_USER_PLAYLISTS, serializeUserPlaylistsJson(current))
            true
        }
    }

    private suspend fun saveKeyToDataStore(key: Preferences.Key<String>, jsonString: String) {
        if (initialLoadFailed) return
        try {
            dataStore.edit { prefs ->
                prefs[key] = jsonString
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun serializeTracksJson(tracks: List<MediaTrack>): String {
        val array = JSONArray()
        for (track in tracks) {
            val obj = JSONObject()
            obj.put("id", track.id)
            obj.put("title", track.title)
            obj.put("artist", track.artist)
            obj.put("album", track.album)
            obj.put("durationSeconds", track.durationSeconds)
            obj.put("artworkUrl", track.artworkUrl ?: JSONObject.NULL)
            obj.put("mediaUri", track.mediaUri ?: JSONObject.NULL)
            array.put(obj)
        }
        return array.toString()
    }

    private fun parseTracksJson(jsonStr: String): List<MediaTrack> {
        val list = mutableListOf<MediaTrack>()
        try {
            val array = JSONArray(jsonStr)
            for (i in 0 until array.length()) {
                val obj = array.optJSONObject(i) ?: continue
                val id = obj.optString("id")
                if (id.isBlank()) continue

                val rawArt = obj.optString("artworkUrl", "")
                val artworkUrl = if (rawArt.isNotBlank() && rawArt != "null") rawArt else null

                val rawUri = obj.optString("mediaUri", "")
                val mediaUri = if (rawUri.isNotBlank() && rawUri != "null") rawUri else null

                list.add(
                    MediaTrack(
                        id = id,
                        title = obj.optString("title", "Unknown Title"),
                        artist = obj.optString("artist", "Unknown Artist"),
                        album = obj.optString("album", "Single"),
                        durationSeconds = obj.optInt("durationSeconds", 194),
                        artworkUrl = artworkUrl,
                        mediaUri = mediaUri,
                    )
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return list
    }

    private fun serializeAlbumsJson(albums: List<AlbumItem>): String {
        val array = JSONArray()
        for (alb in albums) {
            val obj = JSONObject()
            obj.put("id", alb.id)
            obj.put("title", alb.title)
            obj.put("artist", alb.artist ?: JSONObject.NULL)
            obj.put("year", alb.year ?: JSONObject.NULL)
            obj.put("artworkUrl", alb.artworkUrl ?: JSONObject.NULL)
            array.put(obj)
        }
        return array.toString()
    }

    private fun parseAlbumsJson(jsonStr: String): List<AlbumItem> {
        val list = mutableListOf<AlbumItem>()
        try {
            val array = JSONArray(jsonStr)
            for (i in 0 until array.length()) {
                val obj = array.optJSONObject(i) ?: continue
                val id = obj.optString("id")
                if (id.isBlank()) continue

                val rawArt = obj.optString("artworkUrl", "")
                val artworkUrl = if (rawArt.isNotBlank() && rawArt != "null") rawArt else null

                list.add(
                    AlbumItem(
                        id = id,
                        title = obj.optString("title", "Untitled Album"),
                        artist = if (obj.has("artist") && !obj.isNull("artist")) obj.optString("artist") else null,
                        year = if (obj.has("year") && !obj.isNull("year")) obj.optString("year") else null,
                        artworkUrl = artworkUrl,
                    )
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return list
    }

    private fun serializeArtistsJson(artists: List<SavedArtistItem>): String {
        val array = JSONArray()
        for (art in artists) {
            val obj = JSONObject()
            obj.put("id", art.id)
            obj.put("name", art.name)
            obj.put("artworkUrl", art.artworkUrl ?: JSONObject.NULL)
            array.put(obj)
        }
        return array.toString()
    }

    private fun parseArtistsJson(jsonStr: String): List<SavedArtistItem> {
        val list = mutableListOf<SavedArtistItem>()
        try {
            val array = JSONArray(jsonStr)
            for (i in 0 until array.length()) {
                val obj = array.optJSONObject(i) ?: continue
                val id = obj.optString("id")
                if (id.isBlank()) continue

                val rawArt = obj.optString("artworkUrl", "")
                val artworkUrl = if (rawArt.isNotBlank() && rawArt != "null") rawArt else null

                list.add(
                    SavedArtistItem(
                        id = id,
                        name = obj.optString("name", "Unknown Artist"),
                        artworkUrl = artworkUrl,
                    )
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return list
    }

    private fun serializePlaylistsJson(playlists: List<SavedPlaylistItem>): String {
        val array = JSONArray()
        for (pl in playlists) {
            val obj = JSONObject()
            obj.put("id", pl.id)
            obj.put("title", pl.title)
            obj.put("author", pl.author ?: JSONObject.NULL)
            obj.put("artworkUrl", pl.artworkUrl ?: JSONObject.NULL)
            array.put(obj)
        }
        return array.toString()
    }

    private fun parsePlaylistsJson(jsonStr: String): List<SavedPlaylistItem> {
        val list = mutableListOf<SavedPlaylistItem>()
        try {
            val array = JSONArray(jsonStr)
            for (i in 0 until array.length()) {
                val obj = array.optJSONObject(i) ?: continue
                val id = obj.optString("id")
                if (id.isBlank()) continue

                val rawArt = obj.optString("artworkUrl", "")
                val artworkUrl = if (rawArt.isNotBlank() && rawArt != "null") rawArt else null

                list.add(
                    SavedPlaylistItem(
                        id = id,
                        title = obj.optString("title", "Untitled Playlist"),
                        author = if (obj.has("author") && !obj.isNull("author")) obj.optString("author") else null,
                        artworkUrl = artworkUrl,
                    )
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return list
    }

    private fun serializeUserPlaylistsJson(playlists: List<UserPlaylist>): String {
        val array = JSONArray()
        for (pl in playlists) {
            val obj = JSONObject()
            obj.put("id", pl.id)
            obj.put("title", pl.title)
            obj.put("description", pl.description ?: JSONObject.NULL)
            obj.put("artworkUrl", pl.artworkUrl ?: JSONObject.NULL)
            obj.put("createdAtMs", pl.createdAtMs)
            obj.put("updatedAtMs", pl.updatedAtMs)
            obj.put("tracks", JSONArray(serializeTracksJson(pl.tracks)))
            array.put(obj)
        }
        return array.toString()
    }

    private fun parseUserPlaylistsJson(jsonStr: String): List<UserPlaylist> {
        val list = mutableListOf<UserPlaylist>()
        try {
            val array = JSONArray(jsonStr)
            for (i in 0 until array.length()) {
                val obj = array.optJSONObject(i) ?: continue
                val id = obj.optString("id")
                if (id.isBlank()) continue

                val rawArt = obj.optString("artworkUrl", "")
                val artworkUrl = if (rawArt.isNotBlank() && rawArt != "null") rawArt else null

                val rawDesc = obj.optString("description", "")
                val description = if (rawDesc.isNotBlank() && rawDesc != "null") rawDesc else null

                val tracksJson = obj.optJSONArray("tracks")?.toString() ?: "[]"

                list.add(
                    UserPlaylist(
                        id = id,
                        title = obj.optString("title", "Untitled Playlist"),
                        description = description,
                        artworkUrl = artworkUrl,
                        createdAtMs = obj.optLong("createdAtMs", System.currentTimeMillis()),
                        updatedAtMs = obj.optLong("updatedAtMs", System.currentTimeMillis()),
                        tracks = parseTracksJson(tracksJson),
                    )
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return list
    }
}
