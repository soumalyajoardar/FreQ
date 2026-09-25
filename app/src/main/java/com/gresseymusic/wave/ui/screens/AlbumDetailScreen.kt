package com.gresseymusic.wave.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
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
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.gresseymusic.wave.data.library.LocalLibraryRepositoryProvider
import com.gresseymusic.wave.data.model.AlbumDetail
import com.gresseymusic.wave.data.model.AlbumItem
import com.gresseymusic.wave.data.repository.CatalogResult
import com.gresseymusic.wave.data.repository.LocalMusicRepository
import com.gresseymusic.wave.player.LocalPlaybackManager
import com.gresseymusic.wave.ui.components.CatalogErrorState
import com.gresseymusic.wave.ui.components.catalogErrorMessage
import com.gresseymusic.wave.ui.components.CatalogLoadingState
import com.gresseymusic.wave.ui.components.FreqArtwork
import com.gresseymusic.wave.ui.components.FreqEmptyState
import com.gresseymusic.wave.ui.components.FreqGlassSurface
import com.gresseymusic.wave.ui.components.FreqIconButton
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
 * FreQ Album Detail (M21). A focused, immersive collection:
 *
 * ARTWORK-LED HERO (art left, identity right, theme atmosphere wash)
 * → PLAY + SAVE actions (existing PlaybackManager/Library behavior)
 * → TRACKS (shared calm rows, album ordering preserved in the queue)
 *
 * Only real backend metadata renders: artist (navigates when an id
 * exists), year and track count when provided. Nothing is fabricated —
 * missing metadata is omitted, not placeholdered.
 */
@Composable
fun AlbumDetailScreen(
    albumId: String,
    onBackClick: () -> Unit,
    onArtistClick: (String) -> Unit,
    modifier: Modifier = Modifier,
    onOpenNowPlaying: () -> Unit = {},
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val musicRepository = LocalMusicRepository.current
    val libraryRepository = LocalLibraryRepositoryProvider.current
    val playbackManager = LocalPlaybackManager.current

    val savedAlbums by libraryRepository.savedAlbums.collectAsState()
    val isSaved = remember(savedAlbums, albumId) { libraryRepository.isAlbumSaved(albumId) }

    var detailRetryCount by remember { mutableStateOf(0) }
    val albumDetail by produceState<CatalogResult<AlbumDetail?>?>(
        initialValue = null,
        key1 = albumId,
        key2 = detailRetryCount,
    ) {
        value = musicRepository.getAlbum(albumId)
    }

    // A null payload inside Success is treated as not-found defensively;
    // YtMusicRepository itself reports missing data as a NOT_FOUND Failure.
    val album = (albumDetail as? CatalogResult.Success)?.data
    val colors = FreqTheme.colors

    Box(modifier = modifier.fillMaxSize()) {
        if (album == null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .statusBarsPadding()
                    .navigationBarsPadding()
                    .padding(horizontal = FreqSpacing.md),
                verticalArrangement = Arrangement.spacedBy(FreqSpacing.md),
            ) {
                AlbumTopBar(onBackClick = onBackClick)
                if (albumDetail == null) {
                    CatalogLoadingState(message = "Loading album...")
                } else {
                    val failure = albumDetail as? CatalogResult.Failure
                    CatalogErrorState(
                        message = if (failure != null) catalogErrorMessage("album", failure.kind)
                        else "Album not found.",
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
        val artSize = if (shortScreen) 120.dp else 148.dp

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
            AlbumTopBar(onBackClick = onBackClick)

            // Hero: artwork-led, identity right.
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(FreqSpacing.md),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                FreqArtwork(
                    artworkUrl = album.artworkUrl,
                    colors = listOf(colors.textSecondary, colors.textMuted),
                    shape = FreqShapes.cardLarge,
                    iconSize = 48.dp,
                    contentDescription = "Artwork for ${album.title}",
                    modifier = Modifier.size(artSize),
                )

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "ALBUM",
                        style = Typography.labelSmall,
                        color = colors.textMuted,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(modifier = Modifier.height(FreqSpacing.xxs))
                    Text(
                        text = album.title,
                        style = Typography.headlineLarge,
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Bold,
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Spacer(modifier = Modifier.height(FreqSpacing.xs))
                    val artistId = album.artistId
                    Text(
                        text = album.artist,
                        style = Typography.titleMedium,
                        color = colors.textPrimary,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.then(
                            if (artistId != null) {
                                Modifier.clickable(
                                    role = Role.Button,
                                    onClickLabel = "Open artist ${album.artist}",
                                    onClick = { onArtistClick(artistId) },
                                )
                            } else {
                                Modifier
                            },
                        ),
                    )
                    albumMetaLine(album.year, album.tracks.size)?.let { meta ->
                        Spacer(modifier = Modifier.height(FreqSpacing.xxs))
                        Text(
                            text = meta,
                            style = Typography.bodySmall,
                            color = colors.textMuted,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }

            // Actions: Play establishes album ordering in the queue; Save
            // toggles the existing local-library state.
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                FreqPrimaryButton(
                    text = if (album.tracks.isEmpty()) "Play" else "Play Album",
                    onClick = {
                        if (album.tracks.isNotEmpty()) {
                            playbackManager.playQueue(album.tracks)
                        }
                    },
                    enabled = album.tracks.isNotEmpty(),
                    leadingIcon = Icons.Default.PlayArrow,
                    modifier = Modifier.weight(1f),
                )
                FreqIconButton(
                    imageVector = if (isSaved) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                    contentDescription = if (isSaved) "Remove album from library" else "Save album to library",
                    onClick = {
                        scope.launch {
                            val albItem = AlbumItem(
                                id = album.id,
                                title = album.title,
                                artist = album.artist,
                                year = album.year,
                                artworkUrl = album.artworkUrl,
                            )
                            val nowSaved = libraryRepository.toggleAlbumSaved(albItem)
                            val msg = if (nowSaved) "Album saved to Library" else "Album removed from Library"
                            Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                        }
                    },
                    tint = if (isSaved) colors.accentPink else null,
                )
            }

            if (album.tracks.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm)) {
                    FreqSectionHeader(title = "Tracks")
                    FreqGlassSurface(
                        tone = FreqGlassTone.Standard,
                        shape = FreqShapes.card,
                    ) {
                        Column {
                            album.tracks.forEachIndexed { index, track ->
                                FreqTrackRow(
                                    track = track,
                                    leadingLabel = (index + 1).toString(),
                                    onPlay = {
                                        // Album ordering becomes the queue context.
                                        playbackManager.playQueue(album.tracks, index)
                                    },
                                    onPlayNext = { playbackManager.playNext(track) },
                                    onAddToQueue = { playbackManager.addToQueue(track) },
                                )
                                if (index < album.tracks.size - 1) {
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
            } else {
                FreqEmptyState(message = "This album has no tracks listed.")
            }
        }
    }
}

@Composable
private fun AlbumTopBar(onBackClick: () -> Unit) {
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
        Spacer(modifier = Modifier.size(FreqSpacing.touchTargetDense))
    }
}

/**
 * Honest album meta line from real fields only: year and/or track count.
 * Null when neither exists — missing metadata is omitted, never
 * placeholdered ("2019", "Single", "Unknown" are never rendered).
 * Pure and unit-tested.
 */
fun albumMetaLine(year: String?, trackCount: Int): String? {
    val parts = mutableListOf<String>()
    if (!year.isNullOrBlank()) parts.add(year)
    if (trackCount > 0) parts.add("$trackCount " + if (trackCount == 1) "track" else "tracks")
    return parts.joinToString(" • ").ifEmpty { null }
}
