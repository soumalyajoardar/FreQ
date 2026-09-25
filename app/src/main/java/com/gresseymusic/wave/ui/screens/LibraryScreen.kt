package com.gresseymusic.wave.ui.screens

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
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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
import com.gresseymusic.wave.player.MediaTrack
import com.gresseymusic.wave.ui.components.CreatePlaylistDialog
import com.gresseymusic.wave.ui.components.FreqArtwork
import com.gresseymusic.wave.ui.components.FreqEmptyState
import com.gresseymusic.wave.ui.components.FreqGlassSurface
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
 * FreQ Library (M19). A personal collection, not a social profile:
 *
 * YOUR PLAYLISTS (user-owned, create first)
 * → LIKED SONGS (prominent collection card, play-all)
 * → RECENTLY PLAYED (real history, honest hint when empty)
 * → SAVED ALBUMS / ARTISTS / PLAYLISTS rails (real artwork, real counts)
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
            .padding(bottom = rememberMiniPlayerBottomClearance()),
        verticalArrangement = Arrangement.spacedBy(FreqSpacing.lg),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(FreqSpacing.xs)) {
            Text(
                text = "Library",
                style = Typography.displaySmall,
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

        if (visibility.showConsolidatedEmpty) {
            FreqEmptyState(
                message = "Your library is empty. Like songs, save albums and artists, " +
                    "or create a playlist to start your collection.",
            )
            return@Column
        }

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

        if (visibility.liked) {
            LikedSongsCard(
                count = likedTracks.size,
                artworkUrl = likedTracks.firstOrNull()?.artworkUrl,
                onPlayAll = {
                    playbackManager.playQueue(likedTracks)
                },
            )
        }

        Column(verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm)) {
            FreqSectionHeader(title = "Recently Played")
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
                                playbackManager.playTrack(track)
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

        if (visibility.albums) {
            Column(verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm)) {
                FreqSectionHeader(title = "Saved Albums")
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
            }
        }

        if (visibility.artists) {
            Column(verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm)) {
                FreqSectionHeader(title = "Followed Artists")
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
}

/** Liked Songs as a prominent collection card with real count + play-all. */
@Composable
private fun LikedSongsCard(
    count: Int,
    artworkUrl: String?,
    onPlayAll: () -> Unit,
) {
    val colors = FreqTheme.colors
    FreqGlassSurface(
        modifier = Modifier.fillMaxWidth(),
        tone = FreqGlassTone.Standard,
        shape = FreqShapes.cardLarge,
    ) {
        Row(
            modifier = Modifier.padding(FreqSpacing.md),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(FreqSpacing.md),
        ) {
            FreqArtwork(
                artworkUrl = artworkUrl,
                colors = listOf(colors.textSecondary, colors.textMuted),
                shape = FreqShapes.card,
                iconSize = FreqSpacing.iconLg,
                modifier = Modifier.size(64.dp),
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Liked Songs",
                    style = Typography.titleLarge,
                    color = colors.textPrimary,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(modifier = Modifier.height(FreqSpacing.xxs))
                Text(
                    text = "$count " + if (count == 1) "song" else "songs",
                    style = Typography.bodySmall,
                    color = colors.textSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            // M27.6: blurred glass play disc, neutral border — never cyan.
            FreqGlassSurface(
                modifier = Modifier
                    .size(FreqSpacing.touchTargetMin)
                    .clip(FreqShapes.circle)
                    .clickable(
                        role = Role.Button,
                        onClickLabel = "Play all liked songs",
                        onClick = onPlayAll,
                    ),
                tone = FreqGlassTone.Floating,
                shape = FreqShapes.circle,
                shadow = FreqElevation.none,
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Default.PlayArrow,
                    contentDescription = null,
                    tint = colors.textPrimary,
                    modifier = Modifier.size(FreqSpacing.iconLg),
                )
            }
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
