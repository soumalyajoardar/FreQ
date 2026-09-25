package com.gresseymusic.wave.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.gresseymusic.wave.data.library.LocalLibraryRepositoryProvider
import com.gresseymusic.wave.player.LocalPlaybackManager
import com.gresseymusic.wave.ui.components.DeletePlaylistDialog
import com.gresseymusic.wave.ui.components.FreqArtwork
import com.gresseymusic.wave.ui.components.FreqEmptyState
import com.gresseymusic.wave.ui.components.FreqGlassSurface
import com.gresseymusic.wave.ui.components.FreqIconButton
import com.gresseymusic.wave.ui.components.FreqPrimaryButton
import com.gresseymusic.wave.ui.components.FreqSectionHeader
import com.gresseymusic.wave.ui.components.FreqTrackRow
import com.gresseymusic.wave.ui.components.RenamePlaylistDialog
import com.gresseymusic.wave.ui.theme.FreqResponsive
import com.gresseymusic.wave.ui.theme.FreqGlassTone
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.theme.FreqSpacing
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.Typography
import kotlinx.coroutines.launch
import com.gresseymusic.wave.ui.theme.rememberAmbientWash
import com.gresseymusic.wave.ui.theme.vignetteBrush
import com.gresseymusic.wave.ui.components.rememberMiniPlayerBottomClearance

/**
 * FreQ User Playlist Detail (M23). A personal management console —
 * deliberately distinct from Remote Playlist's banner canvas:
 *
 * MANAGEMENT BAR (back, rename, delete — ownership controls up front)
 * → IDENTITY ROW (derived artwork left, MY PLAYLIST eyebrow, editable
 *   title, real count, Add Tracks entry)
 * → PLAY action (playlist ordering becomes the queue)
 * → TRACKS (shared calm rows with move/remove, honest empty state)
 *
 * Everything mutates through the existing LocalLibraryRepository methods;
 * playback flows through the existing PlaybackManager queue APIs.
 */
@Composable
fun UserPlaylistDetailScreen(
    playlistId: String,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier,
    onDeleted: () -> Unit = {},
    onBrowseTracksClick: () -> Unit = {},
    onOpenNowPlaying: () -> Unit = {},
) {
    val libraryRepository = LocalLibraryRepositoryProvider.current
    val playbackManager = LocalPlaybackManager.current
    val scope = rememberCoroutineScope()

    val userPlaylists by libraryRepository.userPlaylists.collectAsState()
    val playlist = remember(userPlaylists, playlistId) {
        userPlaylists.find { it.id == playlistId }
    }

    var showRenameDialog by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    val colors = FreqTheme.colors

    if (playlist == null) {
        Column(
            modifier = modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = FreqSpacing.md),
            verticalArrangement = Arrangement.spacedBy(FreqSpacing.md),
        ) {
            UserPlaylistTopBar(
                onBackClick = onBackClick,
                title = "",
                onRenameClick = {},
                onDeleteClick = {},
            )
            FreqEmptyState(message = "Playlist not found. It may have been deleted.")
        }
        return
    }

    if (showRenameDialog) {
        RenamePlaylistDialog(
            playlistId = playlist.id,
            currentTitle = playlist.title,
            onDismiss = { showRenameDialog = false },
        )
    }

    if (showDeleteDialog) {
        DeletePlaylistDialog(
            playlistId = playlist.id,
            playlistTitle = playlist.title,
            onDismiss = { showDeleteDialog = false },
            onDeleted = onDeleted,
        )
    }

    // Restrained theme atmosphere (no per-element blur passes).
    val atmosphere = rememberAmbientWash(emptyList())
    val vignette = remember(colors) { vignetteBrush(colors.scrim) }

    Box(modifier = modifier.fillMaxSize()) {
        Box(modifier = Modifier.fillMaxSize().background(atmosphere))
        Box(modifier = Modifier.fillMaxSize().background(vignette))

        val shortScreen =
            LocalConfiguration.current.screenHeightDp < FreqResponsive.SHORT_HEIGHT_DP
        val artSize = if (shortScreen) 104.dp else 128.dp

        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = FreqSpacing.md)
            .padding(bottom = rememberMiniPlayerBottomClearance()),
            verticalArrangement = Arrangement.spacedBy(FreqSpacing.lg),
        ) {
            UserPlaylistTopBar(
                onBackClick = onBackClick,
                title = playlist.title,
                onRenameClick = { showRenameDialog = true },
                onDeleteClick = { showDeleteDialog = true },
            )

            // Identity: derived artwork left, editable identity right.
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(FreqSpacing.md),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                FreqArtwork(
                    artworkUrl = playlist.artworkUrl,
                    colors = listOf(colors.textSecondary, colors.textMuted),
                    shape = FreqShapes.cardLarge,
                    iconSize = 40.dp,
                    contentDescription = "Artwork for ${playlist.title}",
                    modifier = Modifier.size(artSize),
                )

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "MY PLAYLIST",
                        style = Typography.labelSmall,
                        color = colors.textMuted,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(modifier = Modifier.height(FreqSpacing.xxs))
                    Text(
                        text = playlist.title,
                        style = Typography.headlineLarge,
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Bold,
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Spacer(modifier = Modifier.height(FreqSpacing.xxs))
                    Text(
                        text = playlistTrackCountLine(playlist.tracks.size),
                        style = Typography.bodySmall,
                        color = colors.textMuted,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    if (!playlist.description.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(FreqSpacing.xxs))
                        Text(
                            text = playlist.description,
                            style = Typography.bodySmall,
                            color = colors.textSecondary,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }

            // Actions: Play establishes ordering; Add Tracks opens Search,
            // where the existing add-to-playlist flow covers this playlist.
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                FreqPrimaryButton(
                    text = if (playlist.tracks.isEmpty()) "Play" else "Play Playlist",
                    onClick = {
                        if (playlist.tracks.isNotEmpty()) {
                            playbackManager.playQueue(playlist.tracks)
                        }
                    },
                    enabled = playlist.tracks.isNotEmpty(),
                    leadingIcon = Icons.Default.PlayArrow,
                    modifier = Modifier.weight(1f),
                )
                FreqIconButton(
                    imageVector = Icons.Default.Add,
                    contentDescription = "Add tracks to ${playlist.title}",
                    onClick = onBrowseTracksClick,
                    tint = colors.textPrimary,
                )
            }

            if (playlist.tracks.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm)) {
                    FreqSectionHeader(title = "Tracks")
                    PlaylistTrackContainer {
                        playlist.tracks.forEachIndexed { index, track ->
                            FreqTrackRow(
                                track = track,
                                leadingLabel = (index + 1).toString(),
                                onPlay = {
                                    // Playlist ordering becomes the queue context.
                                    playbackManager.playQueue(playlist.tracks, index)
                                },
                                onPlayNext = { playbackManager.playNext(track) },
                                onAddToQueue = { playbackManager.addToQueue(track) },
                                onMoveUp = {
                                    scope.launch {
                                        libraryRepository.moveTrackInPlaylist(
                                            playlist.id,
                                            index,
                                            index - 1,
                                        )
                                    }
                                },
                                onMoveDown = {
                                    scope.launch {
                                        libraryRepository.moveTrackInPlaylist(
                                            playlist.id,
                                            index,
                                            index + 1,
                                        )
                                    }
                                },
                                canMoveUp = index > 0,
                                canMoveDown = index < playlist.tracks.size - 1,
                                onRemove = {
                                    scope.launch {
                                        libraryRepository.removeTrackFromPlaylist(playlist.id, track.id)
                                    }
                                },
                                removeText = "Remove from Playlist",
                            )
                            if (index < playlist.tracks.size - 1) {
                                HorizontalDivider(
                                    color = colors.glassBorder,
                                    thickness = 1.dp,
                                    modifier = Modifier.padding(horizontal = FreqSpacing.md),
                                )
                            }
                        }
                    }
                }
            } else {
                FreqEmptyState(
                    message = "This playlist is empty. Use Add Tracks to find music for it.",
                )
            }
        }
    }
}

@Composable
private fun UserPlaylistTopBar(
    onBackClick: () -> Unit,
    title: String,
    onRenameClick: () -> Unit,
    onDeleteClick: () -> Unit,
) {
    val colors = FreqTheme.colors
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        FreqIconButton(
            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
            contentDescription = "Back",
            onClick = onBackClick,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(FreqSpacing.xs)) {
            FreqIconButton(
                imageVector = Icons.Default.Edit,
                contentDescription = "Rename playlist $title",
                onClick = onRenameClick,
            )
            FreqIconButton(
                imageVector = Icons.Default.Delete,
                contentDescription = "Delete playlist $title",
                onClick = onDeleteClick,
                tint = colors.error,
            )
        }
    }
}

/** Shared glass container for user-playlist tracks. */
@Composable
private fun PlaylistTrackContainer(
    content: @Composable () -> Unit,
) {
    FreqGlassSurface(
        tone = FreqGlassTone.Standard,
        shape = FreqShapes.card,
    ) {
        Column {
            content()
        }
    }
}
