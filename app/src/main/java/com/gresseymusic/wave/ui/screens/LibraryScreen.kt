package com.gresseymusic.wave.ui.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.gresseymusic.wave.data.library.LocalDownloadedTracks
import com.gresseymusic.wave.data.library.LocalLibraryRepositoryProvider
import com.gresseymusic.wave.player.LocalPlaybackManager
import com.gresseymusic.wave.player.MediaTrack
import com.gresseymusic.wave.ui.components.CreatePlaylistDialog
import com.gresseymusic.wave.ui.components.FreqArtwork
import com.gresseymusic.wave.ui.components.FreqEmptyState
import com.gresseymusic.wave.ui.components.FreqGlassSurface
import com.gresseymusic.wave.ui.components.FreqIconButton
import com.gresseymusic.wave.ui.components.FreqIcons
import com.gresseymusic.wave.ui.components.FreqMediaCard
import com.gresseymusic.wave.ui.components.FreqSectionHeader
import com.gresseymusic.wave.ui.theme.FreqElevation
import com.gresseymusic.wave.ui.theme.FreqGlassTone
import com.gresseymusic.wave.ui.theme.FreqResponsive
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.theme.FreqSpacing
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.Typography
import com.gresseymusic.wave.ui.components.rememberMiniPlayerBottomClearance

/**
 * FreQ Library (M19, browse rows M28p). A personal collection, not a
 * social profile:
 *
 * HEADER (title + search shortcut)
 * → CATEGORY ROWS (Playlists / Artists / Albums / Songs expand inline;
 *   Genres and Downloads have no backing data or engine, so no dead rows)
 * → RECENTLY ADDED rail (real history, honest hint when empty)
 *
 * Every section renders from genuine local-library state. Non-empty
 * sections show rails; a fully empty library shows one consolidated empty
 * state. No fake counts, no Downloads fiction, no dead taps, no account UI.
 */
@Composable
fun LibraryScreen(
    modifier: Modifier = Modifier,
    onAlbumClick: (String) -> Unit = {},
    onPlaylistClick: (String) -> Unit = {},
    onUserPlaylistClick: (String) -> Unit = {},
    onArtistClick: (String) -> Unit = {},
    onSearchClick: () -> Unit = {},
    onOpenNowPlaying: () -> Unit = {},
) {
    val playbackManager = LocalPlaybackManager.current
    val libraryRepository = LocalLibraryRepositoryProvider.current

    val likedTracks by libraryRepository.likedTracks.collectAsState()
    val recentlyPlayed by libraryRepository.recentlyPlayed.collectAsState()
    val savedAlbums by libraryRepository.savedAlbums.collectAsState()
    val savedArtists by libraryRepository.savedArtists.collectAsState()
    val savedPlaylists by libraryRepository.savedPlaylists.collectAsState()
    val userPlaylists by libraryRepository.userPlaylists.collectAsState()

    var showCreateDialog by remember { mutableStateOf(false) }
    var expandedPlaylists by remember { mutableStateOf(false) }
    var expandedArtists by remember { mutableStateOf(false) }
    var expandedAlbums by remember { mutableStateOf(false) }
    var expandedSongs by remember { mutableStateOf(false) }
    var expandedDownloads by remember { mutableStateOf(false) }
    val downloadsRepository = LocalDownloadedTracks.current
    val downloadedTracks by downloadsRepository.downloaded.collectAsState()
    LaunchedEffect(downloadsRepository) {
        downloadsRepository.refresh()
    }
    val colors = FreqTheme.colors
    val railArtSize = FreqResponsive.railCardWidthFor(LocalConfiguration.current.screenWidthDp)

    if (showCreateDialog) {
        CreatePlaylistDialog(
            onDismiss = { showCreateDialog = false },
            onPlaylistCreated = { newPlId ->
                onUserPlaylistClick(newPlId)
            },
        )
    }

    val visibility = remember(
        likedTracks.size,
        recentlyPlayed.size,
        savedAlbums.size,
        savedArtists.size,
        savedPlaylists.size,
        userPlaylists.size,
    ) {
        resolveLibraryVisibility(
            likedCount = likedTracks.size,
            recentCount = recentlyPlayed.size,
            albumCount = savedAlbums.size,
            artistCount = savedArtists.size,
            savedPlaylistCount = savedPlaylists.size,
            userPlaylistCount = userPlaylists.size,
        )
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = FreqSpacing.md)
            .padding(top = FreqSpacing.sm, bottom = rememberMiniPlayerBottomClearance()),
        verticalArrangement = Arrangement.spacedBy(FreqSpacing.lg),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(FreqSpacing.xs)) {
                Text(
                    text = "Library",
                    style = Typography.displayMedium,
                    color = colors.textPrimary,
                    fontWeight = FontWeight.Bold,
                )
                if (!visibility.showConsolidatedEmpty) {
                    Text(
                        text = libraryCollectionSummary(
                            likedCount = likedTracks.size,
                            albumCount = savedAlbums.size,
                            artistCount = savedArtists.size,
                            playlistCount = savedPlaylists.size + userPlaylists.size,
                        ),
                        style = Typography.bodySmall,
                        color = colors.textMuted,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            FreqIconButton(
                imageVector = Icons.Default.Search,
                contentDescription = "Search",
                onClick = onSearchClick,
            )
        }

        if (visibility.showConsolidatedEmpty) {
            FreqEmptyState(
                message = "Your library is empty. Like songs, save albums and artists, " +
                    "or create a playlist to start your collection.",
            )
            return@Column
        }

        // Category rows: real collections expand inline; Genres and
        // Downloads have no backing data or engine, so no dead rows.
        Column(verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm)) {
            LibraryCategoryRow(
                imageVector = Icons.Default.List,
                iconTint = Color(0xFF8B5CF6),
                label = "Playlists",
                expanded = expandedPlaylists,
                onClick = { expandedPlaylists = !expandedPlaylists },
            )
            if (expandedPlaylists) {
                // User-owned playlists first: the most actionable collection.
                Column(verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm)) {
                    FreqSectionHeader(
                        title = "Your Playlists",
                        actionText = "+ Create",
                        onActionClick = { showCreateDialog = true },
                    )
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
                        contentPadding = PaddingValues(end = FreqSpacing.md),
                    ) {
                        item(key = "create_playlist") {
                            CreatePlaylistCard(onClick = { showCreateDialog = true })
                        }
                        items(userPlaylists, key = { it.id }) { pl ->
                            FreqMediaCard(
                                title = pl.title,
                                subtitle = "${pl.tracks.size} " + if (pl.tracks.size == 1) "track" else "tracks",
                                artworkUrl = pl.artworkUrl,
                                colors = listOf(colors.textSecondary, colors.textMuted),
                                onClick = { onUserPlaylistClick(pl.id) },
                                artSize = railArtSize,
                                contentDescription = "Open playlist ${pl.title}",
                            )
                        }
                    }
                    if (userPlaylists.isEmpty()) {
                        Text(
                            text = "No playlists yet — create one to organize your music.",
                            style = Typography.bodySmall,
                            color = colors.textMuted,
                        )
                    }
                }
                if (visibility.savedPlaylists) {
                    Column(verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm)) {
                        FreqSectionHeader(title = "Saved Playlists")
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
                            contentPadding = PaddingValues(end = FreqSpacing.md),
                        ) {
                            items(savedPlaylists, key = { it.id }) { playlist ->
                                FreqMediaCard(
                                    title = playlist.title,
                                    subtitle = playlist.author,
                                    artworkUrl = playlist.artworkUrl,
                                    colors = listOf(colors.textSecondary, colors.textMuted),
                                    onClick = { onPlaylistClick(playlist.id) },
                                    artSize = railArtSize,
                                    contentDescription = "Open playlist ${playlist.title}",
                                )
                            }
                        }
                    }
                }
            }

            LibraryCategoryRow(
                imageVector = Icons.Default.Person,
                iconTint = Color(0xFF60A5FA),
                label = "Artists",
                expanded = expandedArtists,
                onClick = { expandedArtists = !expandedArtists },
            )
            if (expandedArtists) {
                if (visibility.artists) {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
                        contentPadding = PaddingValues(end = FreqSpacing.md),
                    ) {
                        items(savedArtists, key = { it.id }) { artist ->
                            FreqMediaCard(
                                title = artist.name,
                                subtitle = null,
                                artworkUrl = artist.artworkUrl,
                                colors = listOf(colors.textSecondary, colors.textMuted),
                                onClick = { onArtistClick(artist.id) },
                                artSize = railArtSize,
                                circular = true,
                                contentDescription = "Open artist ${artist.name}",
                            )
                        }
                    }
                } else {
                    Text(
                        text = "No followed artists yet.",
                        style = Typography.bodySmall,
                        color = colors.textMuted,
                    )
                }
            }

            LibraryCategoryRow(
                imageVector = FreqIcons.Album,
                iconTint = Color(0xFFF59E0B),
                label = "Albums",
                expanded = expandedAlbums,
                onClick = { expandedAlbums = !expandedAlbums },
            )
            if (expandedAlbums) {
                if (visibility.albums) {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
                        contentPadding = PaddingValues(end = FreqSpacing.md),
                    ) {
                        items(savedAlbums, key = { it.id }) { album ->
                            FreqMediaCard(
                                title = album.title,
                                subtitle = album.artist,
                                artworkUrl = album.artworkUrl,
                                colors = listOf(colors.textSecondary, colors.textMuted),
                                onClick = { onAlbumClick(album.id) },
                                artSize = railArtSize,
                                contentDescription = "Open album ${album.title}",
                            )
                        }
                    }
                } else {
                    Text(
                        text = "No saved albums yet.",
                        style = Typography.bodySmall,
                        color = colors.textMuted,
                    )
                }
            }

            LibraryCategoryRow(
                imageVector = FreqIcons.MusicNote,
                iconTint = Color(0xFFEC4899),
                label = "Songs",
                expanded = expandedSongs,
                onClick = { expandedSongs = !expandedSongs },
            )
            if (expandedSongs) {
                if (visibility.liked) {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
                        contentPadding = PaddingValues(end = FreqSpacing.md),
                    ) {
                        items(likedTracks, key = { it.id }) { track ->
                            FreqMediaCard(
                                title = track.title,
                                subtitle = track.artist,
                                artworkUrl = track.artworkUrl,
                                colors = track.gradientColors,
                                onClick = {
                                    if (!playbackManager.playTrack(track)) onOpenNowPlaying()
                                },
                                artSize = railArtSize,
                                badge = true,
                                contentDescription = "Play ${track.title} by ${track.artist}",
                            )
                        }
                    }
                } else {
                    Text(
                        text = "No liked songs yet — tap the heart on any song.",
                        style = Typography.bodySmall,
                        color = colors.textMuted,
                    )
                }
            }

            LibraryCategoryRow(
                imageVector = FreqIcons.Download,
                iconTint = Color(0xFF4ADE80),
                label = "Downloads",
                expanded = expandedDownloads,
                onClick = { expandedDownloads = !expandedDownloads },
            )
            if (expandedDownloads) {
                if (downloadedTracks.isNotEmpty()) {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
                        contentPadding = PaddingValues(end = FreqSpacing.md),
                    ) {
                        items(downloadedTracks, key = { it.id }) { track ->
                            FreqMediaCard(
                                title = track.title,
                                subtitle = track.artist,
                                artworkUrl = track.artworkUrl,
                                colors = track.gradientColors,
                                onClick = {
                                    if (!playbackManager.playTrack(track)) onOpenNowPlaying()
                                },
                                artSize = railArtSize,
                                badge = true,
                                contentDescription = "Play downloaded ${track.title} by ${track.artist}",
                            )
                        }
                    }
                } else {
                    Text(
                        text = "No downloads yet — use Download in the player menu.",
                        style = Typography.bodySmall,
                        color = colors.textMuted,
                    )
                }
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm)) {
            FreqSectionHeader(title = "Recently Added")
            if (recentlyPlayed.isNotEmpty()) {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
                    contentPadding = PaddingValues(end = FreqSpacing.md),
                ) {
                    items(recentlyPlayed, key = { it.id }) { track ->
                        FreqMediaCard(
                            title = track.title,
                            subtitle = track.artist,
                            artworkUrl = track.artworkUrl,
                            colors = track.gradientColors,
                            onClick = {
                                if (!playbackManager.playTrack(track)) onOpenNowPlaying()
                            },
                            artSize = railArtSize,
                            badge = true,
                            contentDescription = "Play ${track.title} by ${track.artist}",
                        )
                    }
                }
            } else {
                Text(
                    text = "Tracks you play will appear here.",
                    style = Typography.bodySmall,
                    color = colors.textMuted,
                )
            }
        }
    }
}

/**
 * Category row (flagship mock): frosted pill, tinted glyph, label,
 * chevron. Toggles its inline collection — never a dead destination.
 */
@Composable
private fun LibraryCategoryRow(
    imageVector: ImageVector,
    iconTint: Color,
    label: String,
    expanded: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = FreqTheme.colors
    // Chevron swings right → down on expand (and back on collapse).
    val chevronTurn by animateFloatAsState(
        targetValue = if (expanded) 90f else 0f,
        animationSpec = tween(durationMillis = 250),
        label = "chevronTurn",
    )
    FreqGlassSurface(
        modifier = modifier
            .fillMaxWidth()
            .clip(FreqShapes.pill)
            .clickable(
                role = Role.Button,
                indication = ripple(),
                interactionSource = remember { MutableInteractionSource() },
                onClickLabel = label,
                onClick = onClick,
            ),
        tone = FreqGlassTone.Standard,
        shape = FreqShapes.pill,
        shadow = FreqElevation.none,
        contentAlignment = Alignment.CenterStart,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = FreqSpacing.md, vertical = FreqSpacing.sm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = imageVector,
                contentDescription = null,
                tint = iconTint,
                modifier = Modifier.size(22.dp),
            )
            Spacer(modifier = Modifier.width(FreqSpacing.sm))
            Text(
                text = label,
                style = Typography.titleMedium,
                color = colors.textPrimary,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            Icon(
                imageVector = FreqIcons.ChevronRight,
                contentDescription = null,
                tint = colors.textMuted,
                modifier = Modifier
                    .size(FreqSpacing.iconMd)
                    .graphicsLayer {
                        rotationZ = chevronTurn
                    },
            )
        }
    }
}

/** Dashed-look create affordance without custom drawing: accent outline card. */
@Composable
private fun CreatePlaylistCard(onClick: () -> Unit) {
    val colors = FreqTheme.colors
    Column(
        modifier = Modifier
            .width(FreqSpacing.artworkCard + FreqSpacing.md)
            .clip(FreqShapes.card)
            .clickable(
                role = Role.Button,
                onClickLabel = "Create new playlist",
                onClick = onClick,
            ),
    ) {
        Box(
            modifier = Modifier
                .size(FreqSpacing.artworkCard)
                .clip(FreqShapes.card)
                .background(colors.glassStandard),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Default.Add,
                contentDescription = null,
                tint = colors.textPrimary,
                modifier = Modifier.size(FreqSpacing.iconLg),
            )
        }
        Spacer(modifier = Modifier.height(FreqSpacing.xs))
        Text(
            text = "New Playlist",
            style = Typography.titleMedium,
            color = colors.textPrimary,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            text = "Tap to create",
            style = Typography.bodySmall,
            color = colors.textMuted,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

/** Which library sections render. Pure and unit-tested. */
data class LibraryVisibility(
    val liked: Boolean,
    val albums: Boolean,
    val artists: Boolean,
    val savedPlaylists: Boolean,
    val showConsolidatedEmpty: Boolean,
)

/**
 * Visibility rules: populated collections render rails; an entirely empty
 * library renders one consolidated empty state instead of six hollow
 * sections. Recently Played and user playlists always render (with honest
 * hints when empty) unless the consolidated state takes over.
 */
fun resolveLibraryVisibility(
    likedCount: Int,
    recentCount: Int,
    albumCount: Int,
    artistCount: Int,
    savedPlaylistCount: Int,
    userPlaylistCount: Int,
): LibraryVisibility {
    val allEmpty = likedCount == 0 && recentCount == 0 && albumCount == 0 &&
        artistCount == 0 && savedPlaylistCount == 0 && userPlaylistCount == 0
    return LibraryVisibility(
        liked = likedCount > 0,
        albums = albumCount > 0,
        artists = artistCount > 0,
        savedPlaylists = savedPlaylistCount > 0,
        showConsolidatedEmpty = allEmpty,
    )
}

/**
 * Honest collection summary from real counts only. Pure and unit-tested.
 */
fun libraryCollectionSummary(
    likedCount: Int,
    albumCount: Int,
    artistCount: Int,
    playlistCount: Int,
): String {
    val parts = mutableListOf<String>()
    if (likedCount > 0) parts.add("$likedCount " + if (likedCount == 1) "liked song" else "liked songs")
    if (albumCount > 0) parts.add("$albumCount " + if (albumCount == 1) "album" else "albums")
    if (artistCount > 0) parts.add("$artistCount " + if (artistCount == 1) "artist" else "artists")
    if (playlistCount > 0) parts.add("$playlistCount " + if (playlistCount == 1) "playlist" else "playlists")
    return parts.joinToString(" • ")
}
