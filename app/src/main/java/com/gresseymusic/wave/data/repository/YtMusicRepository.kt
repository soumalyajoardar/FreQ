package com.gresseymusic.wave.data.repository

import com.gresseymusic.wave.data.model.AlbumDetail
import com.gresseymusic.wave.data.model.AlbumItem
import com.gresseymusic.wave.data.model.ArtistDetail
import com.gresseymusic.wave.data.model.FoundArtist
import com.gresseymusic.wave.data.model.HomeCatalogItem
import com.gresseymusic.wave.data.model.HomeCatalogSection
import com.gresseymusic.wave.data.model.PlaylistDetail
import com.gresseymusic.wave.data.remote.YtMusicApiClient
import com.gresseymusic.wave.data.remote.YtMusicDirectClient
import com.gresseymusic.wave.data.remote.LrcLibClient
import com.gresseymusic.wave.data.remote.YtMusicErrorKind
import com.gresseymusic.wave.data.remote.YtMusicException
import com.gresseymusic.wave.player.MediaTrack
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class YtMusicRepository(
    val apiClient: YtMusicApiClient = YtMusicApiClient(),
    // Musify-style direct InnerTube reads. Null keeps the backend-only
    // path (unit tests stay hermetic); production passes a real client.
    val directClient: YtMusicDirectClient? = null,
    // LRCLIB fallback for lyrics (production backend has no lyrics
    // endpoint). Null keeps lyrics backend-only (unit tests hermetic);
    // production passes a real client.
    val lrcLibClient: LrcLibClient? = null,
) : MusicRepository {

    override suspend fun getHomeTracks(): List<MediaTrack> {
        return emptyList()
    }

    override suspend fun getSearchResults(query: String): CatalogResult<List<MediaTrack>> {
        return withContext(Dispatchers.IO) {
            if (!YtMusicApiClient.isSearchableQuery(query)) {
                return@withContext runCatalogCall<List<MediaTrack>> { emptyList() }
            }
            runCatalogCall {
                // Direct InnerTube first (Musify-style); empty or failed
                // direct reads fall through to the freq-api backend.
                val direct = try {
                    directClient?.searchSongs(query)
                } catch (e: CancellationException) {
                    throw e
                } catch (e: Exception) {
                    null
                }
                if (!direct.isNullOrEmpty()) direct else apiClient.searchTracks(query)
            }
        }
    }

    override suspend fun getLibraryTracks(): List<MediaTrack> {
        return emptyList()
    }

    override suspend fun getTrack(trackId: String): MediaTrack? {
        return withContext(Dispatchers.IO) {
            try {
                apiClient.getTrackDetails(trackId)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // Session restore must degrade gracefully offline; a null
                // track is simply skipped by the caller.
                null
            }
        }
    }

    override suspend fun getHomeCatalog(): CatalogResult<List<HomeCatalogSection>> {
        return withContext(Dispatchers.IO) {
            runCatalogCall {
                val homeResponse = apiClient.getHome()
                homeResponse.sections.map { secDto ->
                    HomeCatalogSection(
                        title = secDto.title,
                        items = secDto.items.map { itemDto ->
                            HomeCatalogItem(
                                type = itemDto.type,
                                id = itemDto.id,
                                title = itemDto.title,
                                subtitle = itemDto.artist ?: itemDto.album,
                                artworkUrl = itemDto.artworkUrl,
                                track = if (itemDto.type == "song") {
                                    MediaTrack(
                                        id = itemDto.id,
                                        title = itemDto.title,
                                        artist = itemDto.artist ?: "Unknown Artist",
                                        album = itemDto.album ?: "Single",
                                        durationSeconds = (itemDto.durationMs?.div(1000) ?: 194L).toInt(),
                                        artworkUrl = itemDto.artworkUrl,
                                        mediaUri = null,
                                    )
                                } else null,
                            )
                        },
                    )
                }
            }
        }
    }

    override suspend fun getArtist(id: String): CatalogResult<ArtistDetail?> {
        return withContext(Dispatchers.IO) {
            runCatalogCall {
                val remoteArtist = apiClient.getArtist(id)
                    ?: throw YtMusicException(YtMusicErrorKind.NOT_FOUND, "Artist $id not found")
                ArtistDetail(
                    id = remoteArtist.id,
                    name = remoteArtist.name,
                    description = remoteArtist.description,
                    artworkUrl = remoteArtist.artworkUrl,
                    topSongs = remoteArtist.topSongs.map { songDto ->
                        MediaTrack(
                            id = songDto.id,
                            title = songDto.title,
                            artist = songDto.artist,
                            album = songDto.album ?: "Single",
                            durationSeconds = (songDto.durationMs?.div(1000) ?: 194L).toInt(),
                            artworkUrl = songDto.artworkUrl,
                            mediaUri = null,
                        )
                    },
                    albums = remoteArtist.albums.map { albDto ->
                        AlbumItem(
                            id = albDto.id,
                            title = albDto.title,
                            artist = albDto.artist,
                            year = albDto.year,
                            artworkUrl = albDto.artworkUrl,
                        )
                    },
                )
            }
        }
    }

    // NOTE: no mock fallback. A failed backend read returns Failure so the UI
    // can render an error/offline state; fake catalog content must never be
    // presented as production data.
    override suspend fun getAlbum(id: String): CatalogResult<AlbumDetail?> {
        return withContext(Dispatchers.IO) {
            runCatalogCall {
                val remoteAlbum = apiClient.getAlbum(id)
                    ?: throw YtMusicException(YtMusicErrorKind.NOT_FOUND, "Album $id not found")
                AlbumDetail(
                    id = remoteAlbum.id,
                    title = remoteAlbum.title,
                    artist = remoteAlbum.artist,
                    artistId = remoteAlbum.artistId,
                    year = remoteAlbum.year,
                    artworkUrl = remoteAlbum.artworkUrl,
                    tracks = remoteAlbum.tracks.map { songDto ->
                        MediaTrack(
                            id = songDto.id,
                            title = songDto.title,
                            artist = songDto.artist,
                            album = remoteAlbum.title,
                            durationSeconds = (songDto.durationMs?.div(1000) ?: 194L).toInt(),
                            artworkUrl = songDto.artworkUrl,
                            mediaUri = null,
                        )
                    },
                )
            }
        }
    }

    // NOTE: no mock fallback — see getAlbum.
    override suspend fun getPlaylist(id: String): CatalogResult<PlaylistDetail?> {
        return withContext(Dispatchers.IO) {
            runCatalogCall {
                val remotePlaylist = apiClient.getPlaylist(id)
                    ?: throw YtMusicException(YtMusicErrorKind.NOT_FOUND, "Playlist $id not found")
                PlaylistDetail(
                    id = remotePlaylist.id,
                    title = remotePlaylist.title,
                    description = remotePlaylist.description,
                    author = remotePlaylist.author,
                    artworkUrl = remotePlaylist.artworkUrl,
                    tracks = remotePlaylist.tracks.map { songDto ->
                        MediaTrack(
                            id = songDto.id,
                            title = songDto.title,
                            artist = songDto.artist,
                            album = remotePlaylist.title,
                            durationSeconds = (songDto.durationMs?.div(1000) ?: 194L).toInt(),
                            artworkUrl = songDto.artworkUrl,
                            mediaUri = null,
                        )
                    },
                )
            }
        }
    }

    override suspend fun searchArtists(query: String): List<FoundArtist> {
        if (query.trim().length < 2) return emptyList()
        return withContext(Dispatchers.IO) {
            try {
                directClient?.searchArtists(query) ?: emptyList()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                emptyList()
            }
        }
    }

    override suspend fun getLyrics(track: MediaTrack): List<String>? {        if (track.id.isBlank()) return null
        return withContext(Dispatchers.IO) {
            try {
                apiClient.getLyrics(track.id)
                    ?.let { sanitizeLyricsLines(it) }
                    ?.ifEmpty { null }
                    ?: lrcLibClient?.getLyrics(track)
                        ?.let { sanitizeLyricsLines(it) }
                        ?.ifEmpty { null }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // Lyrics are best-effort: the flip card renders an honest
                // empty state and playback is never affected.
                null
            }
        }
    }

    override suspend fun getWatchContinuation(trackId: String, limit: Int): List<MediaTrack> {        if (trackId.isBlank()) return emptyList()
        return withContext(Dispatchers.IO) {
            try {
                apiClient.getWatchQueue(trackId, limit)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // Continuation is best-effort: playback must survive a failed
                // fetch and fall back to the local autoplay engine.
                emptyList()
            }
        }
    }

    /**
     * Runs a backend read and classifies the outcome. Cancellation is never
     * swallowed; typed backend failures become [CatalogResult.Failure].
     */
    private inline fun <T> runCatalogCall(block: () -> T): CatalogResult<T> {
        return try {
            CatalogResult.Success(block())
        } catch (e: CancellationException) {
            throw e
        } catch (e: YtMusicException) {
            CatalogResult.Failure(e.kind)
        }
    }
}
