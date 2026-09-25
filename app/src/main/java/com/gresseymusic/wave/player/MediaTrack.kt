package com.gresseymusic.wave.player

import androidx.compose.ui.graphics.Color

data class MediaTrack(
    val id: String,
    val title: String,
    val artist: String,
    val album: String,
    val durationSeconds: Int = 194,
    // M27.3: neutral slate fallback for tracks without a backend palette
    // (e.g. watch-continuation items without artwork). Artwork itself still
    // provides color wherever present; no cyan/violet placeholder cards.
    val gradientColors: List<Color> = listOf(
        Color(0xFF3A3F55),
        Color(0xFF171A26),
    ),
    val mediaUri: String? = null,
    val artworkUrl: String? = null,
) {
    // A track is potentially playable if it has a local uri OR a remote
    // YouTube Music videoId. Actual playability is decided by
    // PlaybackSourceResolver (local uri -> RemotePlaybackProvider -> backend
    // /api/playback which resolves a real googlevideo stream via yt-dlp).
    val isPlayable: Boolean get() = !mediaUri.isNullOrBlank() || id.isNotBlank()
}
