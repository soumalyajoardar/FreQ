package com.gresseymusic.wave.player

data class PlaybackState(
    val currentTrack: MediaTrack? = null,
    val isPlaying: Boolean = false,
    val isLoading: Boolean = false,
    val isFavorite: Boolean = false,
    val progressSeconds: Float = 0f,
    val shuffleEnabled: Boolean = false,
    val repeatMode: Int = 0, // 0: Off, 1: Repeat All, 2: Repeat One
    val queue: List<MediaTrack> = emptyList(),
    val currentQueueIndex: Int = 0,
    val playbackError: String? = null,
    val audioMode: AudioMode = AudioMode.NORMAL,
) {
    val currentArtist: String get() = currentTrack?.artist ?: ""
    val currentAlbum: String get() = currentTrack?.album ?: ""
    val durationSeconds: Int get() = currentTrack?.durationSeconds ?: 0
    val nextTrack: MediaTrack? get() = queue.getOrNull((currentQueueIndex + 1) % queue.size.coerceAtLeast(1))
}
