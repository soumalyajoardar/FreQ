package com.gresseymusic.wave.player

import android.net.Uri

sealed interface PlaybackSource {
    val isPlayable: Boolean

    data class LocalUri(
        val uri: Uri,
    ) : PlaybackSource {
        override val isPlayable: Boolean = true
    }

    data class RemoteUri(
        val uri: Uri,
        val mimeType: String? = "audio/mpeg",
        val expiresAtMs: Long? = null,
    ) : PlaybackSource {
        override val isPlayable: Boolean = true
    }

    object Unavailable : PlaybackSource {
        override val isPlayable: Boolean = false
    }
}
