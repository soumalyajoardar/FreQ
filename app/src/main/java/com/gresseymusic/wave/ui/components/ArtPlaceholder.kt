package com.gresseymusic.wave.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.Dp
import coil.compose.SubcomposeAsyncImage
import coil.compose.SubcomposeAsyncImageContent
import com.gresseymusic.wave.ui.components.ArtPlaceholder
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.theme.FreqTheme












@Composable
fun ArtPlaceholder(
    colors: List<Color>,
    modifier: Modifier = Modifier,
    shape: Shape = FreqShapes.artwork,
    iconSize: Dp = 20.dp,
    artworkUrl: String? = null,
) {
    if (!artworkUrl.isNullOrBlank()) {
        SubcomposeAsyncImage(
            model = artworkUrl,
            contentDescription = "Artwork",
            contentScale = ContentScale.Crop,
            modifier = modifier.clip(shape),
            loading = {
                GradientPlaceholderContent(colors = colors, iconSize = iconSize)
            },
            error = {
                GradientPlaceholderContent(colors = colors, iconSize = iconSize)
            },
            success = {
                SubcomposeAsyncImageContent()
            },
        )
    } else {
        Box(
            modifier = modifier
                .clip(shape)
                .background(
                    brush = Brush.linearGradient(
                        colors = if (colors.size >= 2) colors else listOf(FreqTheme.colors.surfaceElevated, FreqTheme.colors.onAccent),
                    ),
                ),
            contentAlignment = Alignment.Center,
        ) {
            GradientPlaceholderContent(colors = colors, iconSize = iconSize)
        }
    }
}

@Composable
private fun GradientPlaceholderContent(
    colors: List<Color>,
    iconSize: Dp,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.linearGradient(
                    colors = if (colors.size >= 2) colors else listOf(FreqTheme.colors.surfaceElevated, FreqTheme.colors.onAccent),
                ),
            ),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(FreqTheme.colors.glassBorderStrong, Color(0x00FFFFFF)),
                    ),
                ),
        )
        // Pre-load state is a loading spinner — never a play button.
        // Shows while the thumbnail is still decoding (or missing).
        CircularProgressIndicator(
            color = FreqTheme.colors.textPrimary.copy(alpha = 0.85f),
            strokeWidth = 3.dp,
            modifier = Modifier.size(iconSize),
        )
    }
}