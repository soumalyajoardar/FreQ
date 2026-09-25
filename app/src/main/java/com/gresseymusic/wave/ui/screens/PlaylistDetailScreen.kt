package com.gresseymusic.wave.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Text
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.SubcomposeAsyncImage
import com.gresseymusic.wave.data.library.LocalLibraryRepositoryProvider
import com.gresseymusic.wave.data.model.PlaylistDetail
import com.gresseymusic.wave.data.repository.CatalogResult
import com.gresseymusic.wave.data.repository.LocalMusicRepository
import com.gresseymusic.wave.player.LocalPlaybackManager
import com.gresseymusic.wave.ui.components.ArtPlaceholder
import com.gresseymusic.wave.ui.components.CatalogErrorState
import com.gresseymusic.wave.ui.components.CatalogLoadingState
import com.gresseymusic.wave.ui.components.catalogErrorMessage
import com.gresseymusic.wave.ui.components.FreqEmptyState
import com.gresseymusic.wave.ui.components.FreqGhostButton
import com.gresseymusic.wave.ui.components.FreqIconButton
import com.gresseymusic.wave.ui.components.FreqIcons
import com.gresseymusic.wave.ui.components.FreqTrackRow
import com.gresseymusic.wave.ui.theme.FreqGlassTone
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.theme.FreqSpacing
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.Typography
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import com.gresseymusic.wave.ui.components.rememberMiniPlayerBottomClearance

/**
 * FreQ Playlist Detail (M22). A curated collection canvas — deliberately
 * distinct from Album's editorial hero and Artist's centered identity:
 *
 * COVER BANNER (full-bleed artwork, cropped, no text over it)
 * → FLOATING GLASS INFO CARD (eyebrow, title, curator, count, description)
 * → PLAY + SAVE actions (existing manager/library behavior)
 * → TRACKS (shared calm rows, playlist ordering becomes the queue)
 *
 * Only real backend fields render. A missing curator, description, or
 * artwork is omitted or falls back honestly — never fabricated.
 */
@Composable
fun PlaylistDetailScreen(
    playlistId: String,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier,
    onOpenNowPlaying: () -> Unit = {},
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val musicRepository = LocalMusicRepository.current
    val libraryRepository = LocalLibraryRepositoryProvider.current
    val playbackManager = LocalPlaybackManager.current

    val savedPlaylists by libraryRepository.savedPlaylists.collectAsState()
    val isSaved = remember(savedPlaylists, playlistId) { libraryRepository.isPlaylistSaved(playlistId) }
    val shuffleEnabled by remember(playbackManager) {
        playbackManager.state.map { it.shuffleEnabled }.distinctUntilChanged()
    }.collectAsState(initial = playbackManager.state.value.shuffleEnabled)

    var detailRetryCount by remember { mutableStateOf(0) }
    val playlistDetail by produceState<CatalogResult<PlaylistDetail?>?>(
        initialValue = null,
        key1 = playlistId,
        key2 = detailRetryCount,
    ) {
        value = musicRepository.getPlaylist(playlistId)
    }

    // A null payload inside Success is treated as not-found defensively;
    // YtMusicRepository itself reports missing data as a NOT_FOUND Failure.
    val playlist = (playlistDetail as? CatalogResult.Success)?.data
    val colors = FreqTheme.colors

    Box(modifier = modifier.fillMaxSize()) {
        if (playlist == null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .statusBarsPadding()
                    .navigationBarsPadding()
                    .padding(horizontal = FreqSpacing.md),
                verticalArrangement = Arrangement.spacedBy(FreqSpacing.md),
            ) {
                PlaylistTopBar(
                    onBackClick = onBackClick,
                    isSaved = false,
                    playlistTitle = "",
                    onSaveClick = {},
                )
                if (playlistDetail == null) {
                    CatalogLoadingState(message = "Loading playlist...")
                } else {
                    val failure = playlistDetail as? CatalogResult.Failure
                    CatalogErrorState(
                        message = if (failure != null) catalogErrorMessage("playlist", failure.kind)
                        else "Playlist not found.",
                        onRetryClick = { detailRetryCount += 1 },
                    )
                }
            }
            return@Box
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(bottom = rememberMiniPlayerBottomClearance()),
            verticalArrangement = Arrangement.spacedBy(FreqSpacing.md),
        ) {
            PlaylistTopBar(
                onBackClick = onBackClick,
                isSaved = isSaved,
                playlistTitle = playlist.title,
                onSaveClick = {
                    scope.launch {
                        togglePlaylistSaved(
                            libraryRepository = libraryRepository,
                            playlist = playlist,
                            context = context,
                        )
                    }
                },
            )

            // Centered identity: square artwork, title, "N Songs • Xh Ym".
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                if (playlist.artworkUrl.isNullOrBlank()) {
                    ArtPlaceholder(
                        colors = listOf(colors.textSecondary, colors.textMuted),
                        shape = FreqShapes.artwork,
                        iconSize = 64.dp,
                        modifier = Modifier.size(200.dp),
                    )
                } else {
                    SubcomposeAsyncImage(
                        model = playlist.artworkUrl,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        alignment = Alignment.TopCenter,
                        modifier = Modifier
                            .size(200.dp)
                            .clip(FreqShapes.artwork),
                    )
                }
                Spacer(modifier = Modifier.height(FreqSpacing.sm))
                Text(
                    text = playlist.title.ifBlank { "Unknown Playlist" },
                    style = Typography.displaySmall,
                    color = colors.textPrimary,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(horizontal = FreqSpacing.md),
                )
                Spacer(modifier = Modifier.height(FreqSpacing.xxs))
                Text(
                    text = formatPlaylistStats(
                        playlist.tracks.size,
                        playlist.tracks.sumOf { it.durationSeconds },
                    ),
                    style = Typography.bodySmall,
                    color = colors.textSecondary,
                    textAlign = TextAlign.Center,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }

            // Play + Shuffle: frosted Haze glass pills, white icon + label.
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = FreqSpacing.md),
                horizontalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                FreqGhostButton(
                    text = "Play",
                    enabled = playlist.tracks.isNotEmpty(),
                    leadingIcon = Icons.Default.PlayArrow,
                    onClick = {
                        if (playlist.tracks.isNotEmpty()) {
                            playbackManager.playQueue(playlist.tracks)
                        }
                    },
                    modifier = Modifier.weight(1f),
                )
                FreqGhostButton(
                    text = "Shuffle",
                    enabled = playlist.tracks.isNotEmpty(),
                    leadingIcon = FreqIcons.Shuffle,
                    onClick = {
                        if (playlist.tracks.isNotEmpty()) {
                            if (!shuffleEnabled) playbackManager.toggleShuffle()
                            playbackManager.playQueue(playlist.tracks)
                        }
                    },
                    modifier = Modifier.weight(1f),
                )
            }

            if (!playlist.description.isNullOrBlank()) {
                Text(
                    text = playlist.description,
                    style = Typography.bodyMedium,
                    color = colors.textSecondary,
                    maxLines = 4,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(horizontal = FreqSpacing.md),
                )
            }

            Column(
                verticalArrangement = Arrangement.spacedBy(FreqSpacing.xs),
            ) {
                if (playlist.tracks.isNotEmpty()) {
                    playlist.tracks.forEachIndexed { index, track ->
                        FreqTrackRow(
                            track = track,
                            showDuration = false,
                            onPlay = {
                                // Playlist ordering becomes the queue context.
                                playbackManager.playQueue(playlist.tracks, index)
                            },
                            onPlayNext = { playbackManager.playNext(track) },
                            onAddToQueue = { playbackManager.addToQueue(track) },
                        )
                    }
                } else {
                    FreqEmptyState(message = "This playlist has no tracks listed.")
                }
            }
        }
    }
}

@Composable
private fun PlaylistTopBar(
    onBackClick: () -> Unit,
    isSaved: Boolean,
    playlistTitle: String,
    onSaveClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = FreqTheme.colors
    Row(
        modifier = modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(horizontal = FreqSpacing.md, vertical = FreqSpacing.sm),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Scrim-backed buttons stay legible over bright artwork in both
        // themes without a full banner scrim.
        FreqIconButton(
            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
            contentDescription = "Back",
            onClick = onBackClick,
            modifier = Modifier.background(colors.scrim, FreqShapes.circle),
            glass = false,
        )
        FreqIconButton(
            imageVector = if (isSaved) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
            contentDescription = if (isSaved) {
                "Remove playlist $playlistTitle from library"
            } else {
                "Save playlist $playlistTitle to library"
            },
            onClick = onSaveClick,
            modifier = Modifier.background(colors.scrim, FreqShapes.circle),
            glass = false,
            tint = if (isSaved) colors.accentPink else colors.iconPrimary,
        )
    }
}

private suspend fun togglePlaylistSaved(
    libraryRepository: com.gresseymusic.wave.data.library.LocalLibraryRepository,
    playlist: PlaylistDetail,
    context: android.content.Context,
) {
    val nowSaved = libraryRepository.togglePlaylistSaved(
        playlistId = playlist.id,
        title = playlist.title,
        author = playlist.author,
        artworkUrl = playlist.artworkUrl,
    )
    val msg = if (nowSaved) "Playlist saved to Library" else "Playlist removed from Library"
    Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
}

/**
 * Curator line from a real author only. Backend fallbacks and blanks stay
 * hidden — "Curated by FreQ" is never synthesized. Pure and unit-tested.
 */
fun curatorLine(author: String?): String? {
    if (author.isNullOrBlank()) return null
    return "Curated by $author"
}

/**
 * Honest playlist stats line ("50 Songs • 3h 12m") from the real track
 * list. Pure and unit-tested.
 */
fun formatPlaylistStats(trackCount: Int, totalSeconds: Int): String {
    val count = "$trackCount " + if (trackCount == 1) "Song" else "Songs"
    return "$count • ${formatDurationLong(totalSeconds)}"
}

/**
 * Long duration label ("3h 12m" / "45m 10s" / "3m" / "45s"). Pure and
 * unit-tested.
 */
fun formatDurationLong(totalSeconds: Int): String {
    val coerced = totalSeconds.coerceAtLeast(0)
    val hours = coerced / 3600
    val minutes = (coerced % 3600) / 60
    val seconds = coerced % 60
    return when {
        hours > 0 -> "${hours}h ${minutes}m"
        minutes > 0 -> if (seconds > 0) "${minutes}m ${seconds}s" else "${minutes}m"
        else -> "${seconds}s"
    }
}
/**
 * Honest track-count line from the real list size. Pure and unit-tested.
 */
fun playlistTrackCountLine(trackCount: Int): String {
    if (trackCount <= 0) return "No tracks yet"
    return "$trackCount " + if (trackCount == 1) "track" else "tracks"
}
