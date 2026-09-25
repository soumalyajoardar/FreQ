package com.gresseymusic.wave.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.SubcomposeAsyncImage
import com.gresseymusic.wave.data.library.LocalLibraryRepositoryProvider
import com.gresseymusic.wave.data.model.ArtistDetail
import com.gresseymusic.wave.data.repository.CatalogResult
import com.gresseymusic.wave.data.repository.LocalMusicRepository
import com.gresseymusic.wave.player.LocalPlaybackManager
import com.gresseymusic.wave.ui.components.CatalogErrorState
import com.gresseymusic.wave.ui.components.catalogErrorMessage
import com.gresseymusic.wave.ui.components.ArtPlaceholder
import com.gresseymusic.wave.ui.components.CatalogLoadingState
import com.gresseymusic.wave.ui.components.FreqArtwork
import com.gresseymusic.wave.ui.components.FreqEmptyState
import com.gresseymusic.wave.ui.components.FreqGhostButton
import com.gresseymusic.wave.ui.components.FreqGlassSurface
import com.gresseymusic.wave.ui.components.FreqIconButton
import com.gresseymusic.wave.ui.components.FreqMediaCard
import com.gresseymusic.wave.ui.components.FreqPlayButton
import com.gresseymusic.wave.ui.components.FreqPrimaryButton
import com.gresseymusic.wave.ui.components.FreqSectionHeader
import com.gresseymusic.wave.ui.components.FreqTrackRow
import com.gresseymusic.wave.ui.theme.FreqResponsive
import com.gresseymusic.wave.ui.theme.FreqGlassTone
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.theme.FreqSpacing
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.Typography
import com.gresseymusic.wave.ui.theme.rememberAmbientWash
import com.gresseymusic.wave.ui.theme.vignetteBrush
import kotlinx.coroutines.launch
import com.gresseymusic.wave.ui.components.rememberMiniPlayerBottomClearance

/**
 * FreQ Artist Detail (M21). An identity-led discovery destination —
 * deliberately distinct from Album's editorial hero:
 *
 * CENTERED IDENTITY (circular artwork, name, follow, play)
 * → TOP TRACKS (ranked calm rows, artist ordering in the queue)
 * → ALBUMS (artwork-forward rail)
 *
 * Only real backend content renders: top tracks, albums, description.
 * No follower counts, bios-invention, genres, or related artists —
 * sparse is honest.
 */
@Composable
fun ArtistDetailScreen(
    artistId: String,
    onBackClick: () -> Unit,
    onAlbumClick: (String) -> Unit,
    modifier: Modifier = Modifier,
    onOpenNowPlaying: () -> Unit = {},
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val musicRepository = LocalMusicRepository.current
    val libraryRepository = LocalLibraryRepositoryProvider.current
    val playbackManager = LocalPlaybackManager.current

    val savedArtists by libraryRepository.savedArtists.collectAsState()
    val isSaved = remember(savedArtists, artistId) { libraryRepository.isArtistSaved(artistId) }

    var detailRetryCount by remember { mutableStateOf(0) }
    val artistDetail by produceState<CatalogResult<ArtistDetail?>?>(
        initialValue = null,
        key1 = artistId,
        key2 = detailRetryCount,
    ) {
        value = musicRepository.getArtist(artistId)
    }

    // A null payload inside Success is treated as not-found defensively;
    // YtMusicRepository itself reports missing data as a NOT_FOUND Failure.
    val artist = (artistDetail as? CatalogResult.Success)?.data
    val colors = FreqTheme.colors

    Box(modifier = modifier.fillMaxSize()) {
        if (artist == null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .navigationBarsPadding()
                    .padding(horizontal = FreqSpacing.md),
                verticalArrangement = Arrangement.spacedBy(FreqSpacing.md),
            ) {
                ArtistTopBar(
                    onBackClick = onBackClick,
                    isSaved = false,
                    artistName = "",
                    onFollowClick = {},
                )
                if (artistDetail == null) {
                    CatalogLoadingState(message = "Loading artist...")
                } else {
                    val failure = artistDetail as? CatalogResult.Failure
                    CatalogErrorState(
                        message = if (failure != null) catalogErrorMessage("artist", failure.kind)
                        else "Artist not found.",
                        onRetryClick = { detailRetryCount += 1 },
                    )
                }
            }
            return@Box
        }

        // Restrained theme atmosphere (no per-element blur passes).
        val atmosphere = rememberAmbientWash(emptyList())
        val vignette = remember(colors) { vignetteBrush(colors.scrim) }
        Box(modifier = Modifier.fillMaxSize().background(atmosphere))
        Box(modifier = Modifier.fillMaxSize().background(vignette))

        val shortScreen =
            LocalConfiguration.current.screenHeightDp < FreqResponsive.SHORT_HEIGHT_DP
        val artSize = if (shortScreen) 112.dp else 144.dp

        Column(
            modifier = Modifier
                .fillMaxSize()
                .navigationBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(bottom = rememberMiniPlayerBottomClearance()),
            verticalArrangement = Arrangement.spacedBy(FreqSpacing.md),
        ) {
            // Banner: full-bleed artwork to the top edge with a bottom
            // fade; top bar overlaid, name overlaid bottom-start.
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(260.dp),
                contentAlignment = Alignment.BottomStart,
            ) {
                if (artist.artworkUrl.isNullOrBlank()) {
                    ArtPlaceholder(
                        colors = listOf(colors.textSecondary, colors.textMuted),
                        shape = RectangleShape,
                        iconSize = 64.dp,
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    SubcomposeAsyncImage(
                        model = artist.artworkUrl,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        alignment = Alignment.TopCenter,
                        modifier = Modifier.fillMaxSize(),
                    )
                }
                // Bottom fade so the overlaid name stays legible on any art.
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    Color.Transparent,
                                    Color.Black.copy(alpha = 0.55f),
                                    Color.Black.copy(alpha = 0.85f),
                                ),
                            ),
                        ),
                )
                ArtistTopBar(
                    onBackClick = onBackClick,
                    isSaved = isSaved,
                    artistName = artist.name,
                    onFollowClick = {
                        scope.launch {
                            val nowSaved = libraryRepository.toggleArtistSaved(
                                artistId = artist.id,
                                name = artist.name,
                                artworkUrl = artist.artworkUrl,
                            )
                            val msg = if (nowSaved) "Artist added to Library" else "Artist removed from Library"
                            Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                        }
                    },
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .statusBarsPadding(),
                )
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = FreqSpacing.md)
                        .padding(bottom = FreqSpacing.md),
                ) {
                    Text(
                        text = "ARTIST",
                        style = Typography.labelSmall,
                        color = Color.White.copy(alpha = 0.85f),
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                    )
                    Text(
                        text = artist.name,
                        style = Typography.displaySmall,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }

            // Stats + description + actions in flow.
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = FreqSpacing.md),
                verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
            ) {
                Text(
                    text = artistStatsLine(artist.topSongs.size, artist.albums.size),
                    style = Typography.labelMedium,
                    color = colors.textMuted,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                if (!artist.description.isNullOrBlank()) {
                    Text(
                        text = artist.description,
                        style = Typography.bodySmall,
                        color = colors.textSecondary,
                        maxLines = 4,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Row(
                    horizontalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    FreqPlayButton(
                        text = "Play",
                        enabled = artist.topSongs.isNotEmpty(),
                        onClick = {
                            playbackManager.playQueue(artist.topSongs)
                        },
                        modifier = Modifier.weight(1f),
                    )
                    FreqGhostButton(
                        text = if (isSaved) "Following" else "Follow",
                        onClick = {
                            scope.launch {
                                val nowSaved = libraryRepository.toggleArtistSaved(
                                    artistId = artist.id,
                                    name = artist.name,
                                    artworkUrl = artist.artworkUrl,
                                )
                                val msg = if (nowSaved) "Artist added to Library" else "Artist removed from Library"
                                Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                            }
                        },
                        leadingIcon = if (isSaved) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                    )
                }
            }

            if (artist.topSongs.isEmpty() && artist.albums.isEmpty()) {
                FreqEmptyState(message = "Nothing found for this artist yet.")
            } else {
                if (artist.topSongs.isNotEmpty()) {
                    Column(
                        modifier = Modifier.padding(horizontal = FreqSpacing.md),
                        verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
                    ) {
                        FreqSectionHeader(title = "Top Tracks")
                        FreqGlassSurface(
                            tone = FreqGlassTone.Standard,
                            shape = FreqShapes.card,
                        ) {
                            Column {
                                artist.topSongs.forEachIndexed { index, track ->
                                    FreqTrackRow(
                                        track = track,
                                        leadingLabel = (index + 1).toString(),
                                        onPlay = {
                                            // Artist ordering becomes the queue context.
                                            playbackManager.playQueue(artist.topSongs, index)
                                        },
                                        onPlayNext = { playbackManager.playNext(track) },
                                        onAddToQueue = { playbackManager.addToQueue(track) },
                                    )
                                    if (index < artist.topSongs.size - 1) {
                                        HorizontalDivider(
                                            color = colors.glassBorder,
                                            thickness = 1.dp,
                                            modifier = Modifier.padding(horizontal = FreqSpacing.md),
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                if (artist.albums.isNotEmpty()) {
                    Column(
                        modifier = Modifier.padding(horizontal = FreqSpacing.md),
                        verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
                    ) {
                        FreqSectionHeader(title = "Albums")
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
                            contentPadding = PaddingValues(end = FreqSpacing.md),
                        ) {
                            items(artist.albums, key = { it.id }) { album ->
                                FreqMediaCard(
                                    title = album.title,
                                    subtitle = album.year,
                                    artworkUrl = album.artworkUrl,
                                    colors = listOf(colors.textSecondary, colors.textMuted),
                                    onClick = { onAlbumClick(album.id) },
                                    contentDescription = "Open album ${album.title}",
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ArtistTopBar(
    onBackClick: () -> Unit,
    isSaved: Boolean,
    artistName: String,
    onFollowClick: () -> Unit,
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
        FreqIconButton(
            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
            contentDescription = "Back",
            onClick = onBackClick,
        )
        FreqIconButton(
            imageVector = if (isSaved) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
            contentDescription = if (isSaved) {
                "Unfollow $artistName"
            } else {
                "Follow $artistName"
            },
            onClick = onFollowClick,
            tint = if (isSaved) colors.accentPink else null,
        )
    }
}

/**
 * Honest artist stats line from real counts ("5 top tracks • 2 albums").
 * Parts with zero counts are omitted; both zero yields "No tracks yet".
 * Pure and unit-tested.
 */
fun artistStatsLine(trackCount: Int, albumCount: Int): String {
    val parts = mutableListOf<String>()
    if (trackCount > 0) {
        parts.add("$trackCount " + if (trackCount == 1) "top track" else "top tracks")
    }
    if (albumCount > 0) {
        parts.add("$albumCount " + if (albumCount == 1) "album" else "albums")
    }
    return parts.joinToString(" • ").ifEmpty { "No tracks yet" }
}
