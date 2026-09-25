package com.gresseymusic.wave.ui.components

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.gresseymusic.wave.data.remote.YtMusicErrorKind
import com.gresseymusic.wave.ui.theme.FreqSpacing


/**
 * Error/offline state with retry for catalog detail screens and rails
 * (M11 fix pass, M15 visuals). A failed backend read must surface here —
 * never as mock content and never as a permanent loading spinner.
 */
@Composable
fun CatalogErrorState(
    message: String,
    onRetryClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    FreqErrorState(
        message = message,
        onRetryClick = onRetryClick,
        modifier = modifier.fillMaxWidth(),
    )
}

@Composable
fun CatalogLoadingState(
    message: String,
    modifier: Modifier = Modifier,
) {
    FreqLoadingState(
        message = message,
        modifier = modifier
            .fillMaxWidth()
            .height(FreqSpacing.artworkHero + FreqSpacing.md),
    )
}

/**
 * Human-readable message for a failed catalog read. `itemName` is lowercase,
 * e.g. "artist", "album", "playlist".
 */
fun catalogErrorMessage(itemName: String, kind: YtMusicErrorKind): String {
    return if (kind == YtMusicErrorKind.NOT_FOUND) {
        itemName.replaceFirstChar { it.uppercase() } + " not found."
    } else {
        "Couldn't load $itemName. Check your connection and try again."
    }
}