package com.gresseymusic.wave.data.repository

import androidx.compose.runtime.staticCompositionLocalOf
import com.gresseymusic.wave.data.model.AlbumDetail
import com.gresseymusic.wave.data.model.ArtistDetail
import com.gresseymusic.wave.data.model.FoundArtist
import com.gresseymusic.wave.data.model.HomeCatalogSection
import com.gresseymusic.wave.data.model.PlaylistDetail
import com.gresseymusic.wave.player.MediaTrack

interface MusicRepository {
    suspend fun getHomeTracks(): List<MediaTrack>
    suspend fun getSearchResults(query: String): CatalogResult<List<MediaTrack>>
    suspend fun getLibraryTracks(): List<MediaTrack>
    suspend fun getTrack(trackId: String): MediaTrack?

    // Catalog Browsing Extensions. Success with an empty list / null payload
    // means the backend genuinely has nothing; Failure means the read itself
    // failed (offline, throttled, server error, malformed). Callers must
    // render loading/empty/error states and must never substitute mock
    // catalog content for a Failure.
    suspend fun getHomeCatalog(): CatalogResult<List<HomeCatalogSection>>
    suspend fun getArtist(id: String): CatalogResult<ArtistDetail?>
    suspend fun getAlbum(id: String): CatalogResult<AlbumDetail?>
    suspend fun getPlaylist(id: String): CatalogResult<PlaylistDetail?>

    /**
     * Lyrics for [track] (M28e).
     *
     * Backend first, LRCLIB second: returns the lyric lines when either
     * source has them; null means unavailable (no lyrics for this track,
     * offline, server error). Never throws for transport failures and
     * never returns mock content.
     */
    suspend fun getLyrics(track: MediaTrack): List<String>?

    /**
     * On-device artist search (M28l): people matching [query] with channel
     * ids that open artist detail. Direct InnerTube only — no backend
     * artist search exists — so failures yield an empty list and the
     * Artists section simply stays hidden. Never throws for transport
     * failures and never returns mock content.
     */
    suspend fun searchArtists(query: String): List<FoundArtist>

    /**
     * YouTube Music continuation / similar queue for [trackId] (M27.1).
     *
     * Returns real backend metadata only; an empty list means unavailable
     * (unknown id, offline, server error) and the caller must fall back to
     * the local autoplay engine. Never throws for transport failures and
     * never returns mock content.
     */
    suspend fun getWatchContinuation(trackId: String, limit: Int = 25): List<MediaTrack>
}

val LocalMusicRepository = staticCompositionLocalOf<MusicRepository> {
    error("MusicRepository not provided")
}

/** Max lyric lines kept per track (bounds memory on pathological responses). */
const val MAX_LYRICS_LINES = 500

/**
 * Trims blank lines and caps length. Pure and unit-tested.
 */
fun sanitizeLyricsLines(lines: List<String>): List<String> {
    return lines.map { it.trim() }.filter { it.isNotEmpty() }.take(MAX_LYRICS_LINES)
}
