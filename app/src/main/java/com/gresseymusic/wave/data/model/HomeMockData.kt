package com.gresseymusic.wave.data.model

import androidx.compose.ui.graphics.Color

data class CategoryPill(
    val id: String,
    val title: String,
    val isActive: Boolean = false,
)

data class AlbumCardItem(
    val id: String,
    val title: String,
    val subtitle: String,
    val gradientColors: List<Color>,
)

data class TrendingItem(
    val id: String,
    val rank: String,
    val title: String,
    val subtitle: String,
    val gradientColors: List<Color>,
)

data class TrackItem(
    val id: String,
    val title: String,
    val artist: String,
    val duration: String,
    val gradientColors: List<Color>,
)

object HomeMockData {
    /**
     * Static filter labels for the Home filter row (M14). These are product
     * chrome, not catalog content: no fake tracks, artists, or mixes live
     * here anymore. All previous fake rails (recently played, trending,
     * library track, featured mix) were removed so empty/failed production
     * results can never fall back to development fixtures.
     */
    val categories = listOf(
        CategoryPill("1", "All", isActive = true),
        CategoryPill("2", "Chill Vibes"),
        CategoryPill("3", "Electronic"),
        CategoryPill("4", "Indie Pop"),
        CategoryPill("5", "Spatial Sound"),
    )
}
