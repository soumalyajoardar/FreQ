package com.gresseymusic.wave.player

import android.net.Uri

class PlaybackSourceResolver(
    private val remoteProvider: RemotePlaybackProvider? = null,
) {

    suspend fun resolve(track: MediaTrack?): PlaybackSource {
        if (track == null) return PlaybackSource.Unavailable

        // Step 1: Local mediaUri resolution
        val rawUri = track.mediaUri
        if (!rawUri.isNullOrBlank()) {
            return try {
                PlaybackSource.LocalUri(Uri.parse(rawUri))
            } catch (e: Exception) {
                PlaybackSource.Unavailable
            }
        }

        // Step 2: Remote authorized playback provider resolution
        if (remoteProvider != null) {
            return try {
                remoteProvider.resolvePlaybackSource(track)
            } catch (e: Exception) {
                PlaybackSource.Unavailable
            }
        }

        return PlaybackSource.Unavailable
    }
}
