package com.gresseymusic.wave.data.model

import com.gresseymusic.wave.player.MediaTrack

data class UserPlaylist(
    val id: String,
    val title: String,
    val description: String? = null,
    val artworkUrl: String? = null,
    val createdAtMs: Long = System.currentTimeMillis(),
    val updatedAtMs: Long = System.currentTimeMillis(),
    val tracks: List<MediaTrack> = emptyList(),
)
