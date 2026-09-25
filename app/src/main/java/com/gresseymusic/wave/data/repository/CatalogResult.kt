package com.gresseymusic.wave.data.repository

import com.gresseymusic.wave.data.remote.YtMusicErrorKind

/**
 * Result of a catalog read (Milestone 11 fix pass).
 *
 * The previous contract (null/emptyList on every failure) made it impossible
 * for the UI to distinguish "backend has nothing" from "backend unreachable",
 * which is how mock data ended up masquerading as an offline catalog.
 *
 * - [Success] carries real data. An empty list / null payload means the
 *   backend genuinely has nothing — never a failure.
 * - [Failure] carries a classified [YtMusicErrorKind]. Mock data must never
 *   be substituted for a [Failure].
 */
sealed interface CatalogResult<out T> {
    data class Success<T>(val data: T) : CatalogResult<T>
    data class Failure(val kind: YtMusicErrorKind) : CatalogResult<Nothing>
}
