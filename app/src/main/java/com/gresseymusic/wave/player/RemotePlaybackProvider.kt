package com.gresseymusic.wave.player

interface RemotePlaybackProvider {
    suspend fun resolvePlaybackSource(track: MediaTrack): PlaybackSource
}
