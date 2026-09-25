package com.gresseymusic.wave.ui.screens

import android.app.Activity
import android.content.Intent
import android.speech.RecognizerIntent
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.ImeAction

import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.Icons
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.gresseymusic.wave.data.model.FoundArtist
import com.gresseymusic.wave.data.model.HomeCatalogSection
import com.gresseymusic.wave.data.settings.LocalSearchHistory
import com.gresseymusic.wave.data.settings.RecentSearchItem
import androidx.compose.ui.platform.LocalFocusManager
import com.gresseymusic.wave.data.settings.SearchHistory
import com.gresseymusic.wave.data.repository.CatalogResult
import com.gresseymusic.wave.data.repository.LocalMusicRepository
import com.gresseymusic.wave.data.repository.SearchSession
import com.gresseymusic.wave.player.LocalPlaybackManager
import com.gresseymusic.wave.player.MediaTrack
import com.gresseymusic.wave.ui.components.AddToPlaylistDialog
import com.gresseymusic.wave.ui.components.CatalogErrorState
import com.gresseymusic.wave.ui.components.FreqArtwork
import com.gresseymusic.wave.ui.components.FreqChip
import com.gresseymusic.wave.ui.components.FreqEmptyState
import com.gresseymusic.wave.ui.components.FreqGlassBackend
import com.gresseymusic.wave.ui.components.FreqGlassSurface
import com.gresseymusic.wave.ui.components.FreqIconButton
import com.gresseymusic.wave.ui.components.FreqIcons
import com.gresseymusic.wave.ui.components.FreqLoadingState
import com.gresseymusic.wave.ui.components.FreqMediaCard
import com.gresseymusic.wave.ui.components.FreqSectionHeader
import com.gresseymusic.wave.ui.components.formatSeekTime
import com.gresseymusic.wave.ui.theme.FreqGlassTone
import com.gresseymusic.wave.ui.theme.FreqResponsive
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.theme.FreqSpacing
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.Typography
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import com.gresseymusic.wave.ui.components.rememberMiniPlayerBottomClearance

private const val SEARCH_DEBOUNCE_MS = 350L

/** Browse-mode search hint (matches the flagship mock). */
const val SEARCH_PLACEHOLDER = "Artists, Songs, Lyrics and More"

/** Browse category tile: label, real search term, gradient. */
data class BrowseCategory(
    val title: String,
    val query: String,
    val colors: List<Color>,
)

/** Genre shortcuts; tapping one runs a real search for its term. */
val BROWSE_CATEGORIES = listOf(
    BrowseCategory("New Releases", "new releases", listOf(Color(0xFF8B5CF6), Color(0xFF4C1D95))),
    BrowseCategory("Hip-Hop", "hip hop", listOf(Color(0xFFF59E0B), Color(0xFFB45309))),
    BrowseCategory("Pop", "pop", listOf(Color(0xFF38BDF8), Color(0xFF1D4ED8))),
    BrowseCategory("Rock", "rock", listOf(Color(0xFFEF4444), Color(0xFF7F1D1D))),
    BrowseCategory("Dance", "dance", listOf(Color(0xFFA855F7), Color(0xFF6D28D9))),
    BrowseCategory("Chill", "chill", listOf(Color(0xFF2DD4BF), Color(0xFF0F766E))),
)

/** Max trending rows on the browse canvas. */
const val TRENDING_RAIL_LIMIT = 5

/** Monthly-audience threshold for a "famous" artist banner. */
const val FAMOUS_ARTIST_AUDIENCE = 500_000L

/**
 * Parses an audience count from an InnerTube subtitle ("Artist • 674M
 * monthly audience", "Artist • 1.2M subscribers"). Null when no number
 * present. Pure and unit-tested.
 */
fun parseAudienceCount(subtitle: String?): Long? {
    if (subtitle.isNullOrBlank()) return null
    val match = Regex("([\\d.,]+)\\s*([KMB])\\b").find(subtitle.uppercase()) ?: return null
    val value = match.groupValues[1].replace(",", "").toDoubleOrNull() ?: return null
    val multiplier = when (match.groupValues[2]) {
        "K" -> 1_000L
        "M" -> 1_000_000L
        "B" -> 1_000_000_000L
        else -> return null
    }
    return (value * multiplier).toLong()
}

/**
 * Whether an artist rates the top-result banner: real audience at or
 * above threshold. Obscure/no-data artists stay list-only. Pure.
 */
fun isFamousArtist(subtitle: String?): Boolean {
    return (parseAudienceCount(subtitle) ?: 0L) >= FAMOUS_ARTIST_AUDIENCE
}

/**
 * Whether [track] is the song the query names (exact title match,
 * case-insensitive): the popular-song top banner condition. Pure.
 */
fun isTopSongMatch(query: String, track: MediaTrack): Boolean {
    val q = query.trim()
    if (q.isEmpty()) return false
    return track.title.trim().equals(q, ignoreCase = true)
}

/**
 * First song tracks across home catalog sections for the browse-mode
 * Trending rail. Real backend data only — empty when unloadable. Pure.
 */
fun trendingTracksFromCatalog(
    sections: List<HomeCatalogSection>,
    limit: Int = TRENDING_RAIL_LIMIT,
): List<MediaTrack> {
    if (sections.isEmpty() || limit <= 0) return emptyList()
    val seen = LinkedHashSet<String>()
    val result = ArrayList<MediaTrack>(limit.coerceAtMost(sections.size * 4))
    for (section in sections) {
        for (item in section.items) {
            if (result.size >= limit) return result
            val track = item.track ?: continue
            if (track.id.isBlank()) continue
            if (!seen.add(track.id)) continue
            result.add(track)
        }
    }
    return result
}

/**
 * Search filter options (M18). The backend search returns tracks only, so
 * the only honest groupings of returned data are the track list itself
 * ("Songs") and albums derived from real track metadata ("Albums"). The
 * old Artists/Playlists options never matched anything and were removed
 * as fake affordances.
 */
private val SEARCH_FILTERS = listOf("All", "Songs", "Albums")

/**
 * Production Search always opens with an empty query (M11 follow-up fix).
 * A leftover development default ("billie eilish") used to pre-fill the
 * field and fire an unwanted search on entry. Extracted as a named constant
 * so the contract is explicit and host-testable.
 */
const val SEARCH_INITIAL_QUERY = ""

@OptIn(kotlinx.coroutines.FlowPreview::class)
@Composable
fun SearchScreen(
    modifier: Modifier = Modifier,
    onArtistClick: (String) -> Unit = {},
    onAlbumClick: (String) -> Unit = {},
    onOpenNowPlaying: () -> Unit = {},
) {
    val playbackManager = LocalPlaybackManager.current
    val musicRepository = LocalMusicRepository.current
    val searchHistory = LocalSearchHistory.current
    var searchQuery by remember { mutableStateOf(SEARCH_INITIAL_QUERY) }
    var selectedFilter by remember { mutableStateOf("All") }
    var selectedTrackForPlaylist by remember { mutableStateOf<MediaTrack?>(null) }
    var searchRetryCount by remember { mutableStateOf(0) }

    // Search history: unified recent activity (queries + tapped songs).
    val recentItems by searchHistory.historyFlow.collectAsState(initial = emptyList())

    val scope = rememberCoroutineScope()

    val dialogTrack = selectedTrackForPlaylist
    if (dialogTrack != null) {
        AddToPlaylistDialog(
            track = dialogTrack,
            onDismiss = { selectedTrackForPlaylist = null },
        )
    }

    // Debounced search: every keystroke restarts the debounce window, the
    // previous in-flight request is cancelled by collectLatest, and the
    // generation guard drops any late response that is no longer current —
    // so visible results always belong to the latest issued query.
    // Cancellation is rethrown (never shown as an error); only classified
    // backend failures set the error state. Mock results are never shown.
    // (M11 reliability contract — do not regress; see M18 §25.)
var searchResults by remember { mutableStateOf<List<MediaTrack>>(emptyList()) }
    var isSearching by remember { mutableStateOf(false) }
    var searchFailed by remember { mutableStateOf(false) }
    var artistResults by remember { mutableStateOf<List<FoundArtist>>(emptyList()) }
    val searchSession = remember { SearchSession() }
    LaunchedEffect(musicRepository, searchRetryCount) {
        snapshotFlow { searchQuery }
            .debounce(SEARCH_DEBOUNCE_MS)
            .distinctUntilChanged()
            .collectLatest { query ->
                val trimmed = query.trim()
                if (trimmed.length < 2) {
                    searchResults = emptyList()
                    searchFailed = false
                    isSearching = false
                    artistResults = emptyList()
                    return@collectLatest
                }
                val generation = searchSession.newGeneration()
                isSearching = true
                searchFailed = false
                // Artists fetch concurrently with songs; same generation
                // guard, same cancellation. No backend artist search
                // exists, so failures just hide the Artists section.
                launch {
                    val artists = try {
                        musicRepository.searchArtists(trimmed)
                    } catch (e: CancellationException) {
                        throw e
                    } catch (e: Exception) {
                        emptyList()
                    }
                    if (searchSession.isLatest(generation)) {
                        artistResults = artists
                    }
                }
                try {
                    when (val result = musicRepository.getSearchResults(trimmed)) {
                        is CatalogResult.Success -> {
                            if (searchSession.isLatest(generation)) {
                                searchResults = result.data
                                // M27.6: queries are recorded only on explicit
                                // IME submit (onSubmit) and tapped songs via
                                // recordTrack — never auto-saved fragments.
                            }
                        }
                        is CatalogResult.Failure -> {
                            if (searchSession.isLatest(generation)) {
                                searchResults = emptyList()
                                searchFailed = true
                            }
                        }
                    }
                } catch (e: CancellationException) {
                    throw e
                } finally {
                    if (searchSession.isLatest(generation)) {
                        isSearching = false
                    }
                }
            }
    }

/**
 * Recent activity shown when the search field is empty: submitted queries
 * and songs actually tapped from results. Queries restore + search;
 * songs resolve the real track and play it.
 */
@Composable
fun RecentSearchesSection(
    recentItems: List<RecentSearchItem>,
    onQueryClick: (String) -> Unit,
    onTrackClick: (RecentSearchItem.Track) -> Unit,
    onRemoveClick: (String) -> Unit,
    onClearAllClick: () -> Unit,
) {
    val colors = FreqTheme.colors
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "Recent",
                style = Typography.labelSmall,
                color = colors.textMuted,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = "Clear",
                style = Typography.labelSmall,
                color = colors.textPrimary,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier
                    .padding(end = FreqSpacing.md)
                    .clickable { onClearAllClick() },
            )
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(FreqShapes.card)
                .background(colors.glassStandard),
        ) {
            recentItems.forEachIndexed { index, item ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = FreqSpacing.md, vertical = FreqSpacing.sm),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    when (item) {
                        is RecentSearchItem.Query -> Row(
                            modifier = Modifier
                                .weight(1f)
                                .clickable(
                                    role = Role.Button,
                                    onClickLabel = "Search for ${item.query}",
                                    onClick = { onQueryClick(item.query) },
                                )
                                .padding(vertical = FreqSpacing.xs),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                imageVector = Icons.Default.Search,
                                contentDescription = null,
                                tint = colors.iconSecondary,
                                modifier = Modifier.size(FreqSpacing.iconMd),
                            )
                            Spacer(modifier = Modifier.width(FreqSpacing.sm))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = item.query,
                                    style = Typography.bodyMedium,
                                    color = colors.textPrimary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                                Text(
                                    text = "Search query",
                                    style = Typography.bodySmall,
                                    color = colors.textMuted,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                        }
                        is RecentSearchItem.Track -> Row(
                            modifier = Modifier
                                .weight(1f)
                                .clickable(
                                    role = Role.Button,
                                    onClickLabel = "Play ${item.title} by ${item.artist}",
                                    onClick = { onTrackClick(item) },
                                )
                                .padding(vertical = FreqSpacing.xs),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            FreqArtwork(
                                artworkUrl = item.artworkUrl,
                                colors = listOf(colors.textSecondary, colors.textMuted),
                                shape = FreqShapes.artworkSmall,
                                iconSize = FreqSpacing.iconSm,
                                modifier = Modifier.size(40.dp),
                            )
                            Spacer(modifier = Modifier.width(FreqSpacing.sm))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = item.title,
                                    style = Typography.bodyMedium,
                                    color = colors.textPrimary,
                                    fontWeight = FontWeight.SemiBold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                                Text(
                                    text = item.artist,
                                    style = Typography.bodySmall,
                                    color = colors.textMuted,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                        }
                    }
                    FreqIconButton(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Remove from history",
                        onClick = { onRemoveClick(item.key) },
                        glass = false,
                        tint = colors.textSecondary,
                        iconSize = FreqSpacing.iconSm,
                    )
                }
                if (index < recentItems.size - 1) {
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
@Composable
fun CategoryTile(
    category: BrowseCategory,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .height(92.dp)
            .clip(FreqShapes.card)
            .background(
                brush = Brush.linearGradient(
                    colors = category.colors,
                    start = Offset.Zero,
                    end = Offset.Infinite,
                ),
                shape = FreqShapes.card,
            )
            .clickable(
                role = Role.Button,
                indication = ripple(),
                interactionSource = remember { MutableInteractionSource() },
                onClickLabel = "Browse ${category.title}",
                onClick = onClick,
            )
            .padding(FreqSpacing.sm),
        contentAlignment = Alignment.TopStart,
    ) {
        Text(
            text = category.title,
            style = Typography.titleMedium,
            color = Color.White,
            fontWeight = FontWeight.Bold,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

/**
 * Browse-mode genre grid (flagship mock): two-column gradient tiles that
 * run a real search for their term. Pure UI over [BROWSE_CATEGORIES].
 */
@Composable
fun BrowseCategoriesSection(
    onCategoryClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
    ) {
        Text(
            text = "Browse Categories",
            style = Typography.titleMedium,
            color = FreqTheme.colors.textPrimary,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Column(verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm)) {
            BROWSE_CATEGORIES.chunked(2).forEach { row ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
                ) {
                    row.forEach { category ->
                        CategoryTile(
                            category = category,
                            onClick = { onCategoryClick(category.query) },
                            modifier = Modifier.weight(1f),
                        )
                    }
                    // Odd tile keeps the grid aligned.
                    if (row.size == 1) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

/**
 * Browse-mode trending rail (flagship mock): artwork, title/artist,
 * chevron. Row tap plays (no auto-open, like every other song tap).
 */
@Composable
fun TrendingSection(
    tracks: List<MediaTrack>,
    onPlay: (MediaTrack) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = FreqTheme.colors
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
    ) {
        Text(
            text = "Trending",
            style = Typography.titleMedium,
            color = colors.textPrimary,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(FreqShapes.card)
                .background(colors.glassStandard),
        ) {
            tracks.forEachIndexed { index, track ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(
                            role = Role.Button,
                            indication = ripple(),
                            interactionSource = remember { MutableInteractionSource() },
                            onClickLabel = "Play ${track.title} by ${track.artist}",
                            onClick = { onPlay(track) },
                        )
                        .padding(horizontal = FreqSpacing.md, vertical = FreqSpacing.sm),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    FreqArtwork(
                        artworkUrl = track.artworkUrl,
                        colors = track.gradientColors.ifEmpty {
                            listOf(colors.textSecondary, colors.textMuted)
                        },
                        shape = FreqShapes.artworkSmall,
                        iconSize = FreqSpacing.iconMd,
                        contentDescription = "Artwork for ${track.title}",
                        modifier = Modifier.size(FreqSpacing.artworkThumb),
                    )
                    Spacer(modifier = Modifier.width(FreqSpacing.sm))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = track.title.ifBlank { "Unknown Title" },
                            style = Typography.titleMedium,
                            color = colors.textPrimary,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            text = track.artist.ifBlank { "Unknown Artist" },
                            style = Typography.bodySmall,
                            color = colors.textSecondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    Spacer(modifier = Modifier.width(FreqSpacing.xs))
                    Icon(
                        imageVector = FreqIcons.ChevronRight,
                        contentDescription = null,
                        tint = colors.textMuted,
                        modifier = Modifier.size(FreqSpacing.iconMd),
                    )
                }
                if (index < tracks.size - 1) {
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

/**
 * Top-song banner: the query-named song as a hero card — large artwork,
 * title, artist • runtime. Full-card tap plays it.
 */
@Composable
fun SongBanner(
    track: MediaTrack,
    onPlay: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = FreqTheme.colors
    FreqGlassSurface(
        tone = FreqGlassTone.Strong,
        shape = FreqShapes.cardLarge,
        modifier = modifier
            .fillMaxWidth()
            .clip(FreqShapes.cardLarge)
            .clickable(
                role = Role.Button,
                indication = ripple(),
                interactionSource = remember { MutableInteractionSource() },
                onClickLabel = "Play ${track.title} by ${track.artist}",
                onClick = onPlay,
            ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(FreqSpacing.md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            FreqArtwork(
                artworkUrl = track.artworkUrl,
                colors = track.gradientColors.ifEmpty {
                    listOf(colors.textSecondary, colors.textMuted)
                },
                shape = FreqShapes.artwork,
                iconSize = FreqSpacing.iconXl,
                contentDescription = "Artwork for ${track.title}",
                modifier = Modifier.size(88.dp),
            )
            Spacer(modifier = Modifier.width(FreqSpacing.md))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "SONG",
                    style = Typography.labelSmall,
                    color = colors.textMuted,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                )
                Spacer(modifier = Modifier.height(FreqSpacing.xxs))
                Text(
                    text = track.title.ifBlank { "Unknown Title" },
                    style = Typography.headlineSmall,
                    color = colors.textPrimary,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(modifier = Modifier.height(FreqSpacing.xxs))
                Text(
                    text = "${track.artist.ifBlank { "Unknown Artist" }} • ${formatSeekTime(track.durationSeconds)}",
                    style = Typography.bodySmall,
                    color = colors.textSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Spacer(modifier = Modifier.width(FreqSpacing.xs))
            Icon(
                imageVector = Icons.Default.PlayArrow,
                contentDescription = null,
                tint = colors.textPrimary,
                modifier = Modifier.size(FreqSpacing.iconLg),
            )
        }
    }
}

/**
 * Top-artist banner (Spotify-style top result): the best artist hit as a
 * hero card — large circular artwork, name, audience line. Full-card tap
 * opens artist detail.
 */
@Composable
fun ArtistBanner(
    artist: FoundArtist,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = FreqTheme.colors
    FreqGlassSurface(
        tone = FreqGlassTone.Strong,
        shape = FreqShapes.cardLarge,
        modifier = modifier
            .fillMaxWidth()
            .clip(FreqShapes.cardLarge)
            .clickable(
                role = Role.Button,
                indication = ripple(),
                interactionSource = remember { MutableInteractionSource() },
                onClickLabel = "Open artist ${artist.name}",
                onClick = onClick,
            ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(FreqSpacing.md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            FreqArtwork(
                artworkUrl = artist.artworkUrl,
                colors = listOf(colors.textSecondary, colors.textMuted),
                shape = FreqShapes.circle,
                iconSize = FreqSpacing.iconXl,
                contentDescription = "Artwork for ${artist.name}",
                modifier = Modifier.size(88.dp),
            )
            Spacer(modifier = Modifier.width(FreqSpacing.md))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "ARTIST",
                    style = Typography.labelSmall,
                    color = colors.textMuted,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                )
                Spacer(modifier = Modifier.height(FreqSpacing.xxs))
                Text(
                    text = artist.name.ifBlank { "Unknown Artist" },
                    style = Typography.headlineSmall,
                    color = colors.textPrimary,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                if (!artist.subtitle.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(FreqSpacing.xxs))
                    Text(
                        text = artist.subtitle,
                        style = Typography.bodySmall,
                        color = colors.textSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            Spacer(modifier = Modifier.width(FreqSpacing.xs))
            Icon(
                imageVector = FreqIcons.ChevronRight,
                contentDescription = null,
                tint = colors.textMuted,
                modifier = Modifier.size(FreqSpacing.iconMd),
            )
        }
    }
}

/**
 * Artists rail (M28l): circular artwork, name, "Artist • audience"
 * subtitle, chevron. Row tap opens artist detail via the channel id.
 */
@Composable
fun ArtistsSection(
    artists: List<FoundArtist>,
    onArtistClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = FreqTheme.colors
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
    ) {
        Text(
            text = "Artists",
            style = Typography.titleMedium,
            color = colors.textPrimary,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(FreqShapes.card)
                .background(colors.glassStandard),
        ) {
            artists.forEachIndexed { index, artist ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(
                            role = Role.Button,
                            indication = ripple(),
                            interactionSource = remember { MutableInteractionSource() },
                            onClickLabel = "Open artist ${artist.name}",
                            onClick = { onArtistClick(artist.id) },
                        )
                        .padding(horizontal = FreqSpacing.md, vertical = FreqSpacing.sm),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    FreqArtwork(
                        artworkUrl = artist.artworkUrl,
                        colors = listOf(colors.textSecondary, colors.textMuted),
                        shape = FreqShapes.circle,
                        iconSize = FreqSpacing.iconMd,
                        contentDescription = "Artwork for ${artist.name}",
                        modifier = Modifier.size(FreqSpacing.artworkThumb),
                    )
                    Spacer(modifier = Modifier.width(FreqSpacing.sm))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = artist.name.ifBlank { "Unknown Artist" },
                            style = Typography.titleMedium,
                            color = colors.textPrimary,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        if (!artist.subtitle.isNullOrBlank()) {
                            Text(
                                text = artist.subtitle,
                                style = Typography.bodySmall,
                                color = colors.textSecondary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(FreqSpacing.xs))
                    Icon(
                        imageVector = FreqIcons.ChevronRight,
                        contentDescription = null,
                        tint = colors.textMuted,
                        modifier = Modifier.size(FreqSpacing.iconMd),
                    )
                }
                if (index < artists.size - 1) {
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

    // Presentation grouping over real returned tracks only.
    val albumGroups = remember(searchResults) { groupSearchTracksByAlbum(searchResults) }
    val visibleSongs = if (selectedFilter == "Albums") emptyList() else searchResults
    val visibleAlbums = if (selectedFilter == "Songs") emptyList() else albumGroups
    // Speculative prefetch: warm stream sources for visible results while
    // the user browses, so taps start instantly from cache.
    LaunchedEffect(visibleSongs) {
        playbackManager.prefetchTrackSources(visibleSongs)
    }
    val isSearchIdle = searchQuery.trim().length < 2

    // Trending rail (browse mode): song tracks from the shared home
    // catalog — the same real backend data Home shows, no extra fetch.
    val catalogState = LocalHomeCatalogState.current
    val trendingTracks = remember(catalogState.catalogResult) {
        trendingTracksFromCatalog(
            (catalogState.catalogResult as? CatalogResult.Success)?.data ?: emptyList(),
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
        SearchHeader()

        SearchInputRow(
            searchQuery = searchQuery,
            onQueryChange = { searchQuery = it },
            onCancelClick = { searchQuery = "" },
            onSubmit = { query ->
                searchQuery = query
                scope.launch { searchHistory.saveQuery(query) }
            },
        )

        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
            contentPadding = PaddingValues(end = FreqSpacing.md),
        ) {
            items(SEARCH_FILTERS, key = { it }) { filter ->
                FreqChip(
                    text = filter,
                    selected = filter == selectedFilter,
                    onClick = { selectedFilter = filter },
                )
            }
        }

        // Results canvas: idle / loading / error / empty / grouped results.
        // Failed or empty production results never fall back to mock data.
        if (isSearchIdle) {
            if (recentItems.isNotEmpty()) {
                RecentSearchesSection(
                    recentItems = recentItems,
                    onQueryClick = { query ->
                        searchQuery = query
                    },
                    onTrackClick = { item ->
                        // Tapping a history song always plays: resolve the
                        // full track when possible, otherwise fall back to
                        // the saved history metadata (id is the videoId, so
                        // stream resolution still works) — never a dead tap.
                        scope.launch {
                            try {
                                val full = musicRepository.getTrack(item.trackId)
                                    ?: MediaTrack(
                                        id = item.trackId,
                                        title = item.title,
                                        artist = item.artist,
                                        album = "Single",
                                        artworkUrl = item.artworkUrl,
                                    )
                                playbackManager.playTrack(full)
                                searchHistory.recordTrack(
                                    full.id,
                                    full.title,
                                    full.artist,
                                    full.artworkUrl,
                                )
                            } catch (e: CancellationException) {
                                throw e
                            } catch (e: Exception) {
                                // Offline: play from history metadata so the
                                // tap still produces audio when cached.
                                try {
                                    playbackManager.playTrack(
                                        MediaTrack(
                                            id = item.trackId,
                                            title = item.title,
                                            artist = item.artist,
                                            album = "Single",
                                            artworkUrl = item.artworkUrl,
                                        ),
                                    )
                                } catch (_: Exception) {
                                }
                            }
                        }
                    },
                    onRemoveClick = { key ->
                        scope.launch { searchHistory.removeItem(key) }
                    },
                    onClearAllClick = {
                        scope.launch { searchHistory.clearAll() }
                    },
                )
            } else {
                FreqEmptyState(message = "Search for songs, artists and albums.")
            }
            BrowseCategoriesSection(
                onCategoryClick = { searchQuery = it },
            )
            if (trendingTracks.isNotEmpty()) {
                TrendingSection(
                    tracks = trendingTracks,
                    onPlay = { track ->
                        scope.launch {
                            searchHistory.recordTrack(
                                track.id,
                                track.title,
                                track.artist,
                                track.artworkUrl,
                            )
                        }
                        playbackManager.playTrack(track)
                    },
                )
            }
        } else if (isSearching && searchResults.isEmpty()) {
            FreqLoadingState(message = "Searching for \"${searchQuery.trim()}\"…")
        } else if (searchFailed) {
            CatalogErrorState(
                message = "Search is unavailable. Check your connection and try again.",
                onRetryClick = { searchRetryCount += 1 },
            )
        } else if (visibleSongs.isEmpty() && visibleAlbums.isEmpty()) {
            FreqEmptyState(message = "No results for \"${searchQuery.trim()}\".")
        } else {
            SearchResultHeader(
                query = searchQuery.trim(),
                songCount = searchResults.size,
                albumCount = albumGroups.size,
            )

            // Top result: famous artist banner wins; otherwise an
            // exact-title song banners like one. Remaining artists list on.
            val topArtist = if (selectedFilter == "All") {
                artistResults.firstOrNull { isFamousArtist(it.subtitle) }
            } else {
                null
            }
            val otherArtists = if (selectedFilter == "All") {
                artistResults.filter { it.id != topArtist?.id }
            } else {
                emptyList()
            }
            val topSong = if (topArtist == null && selectedFilter != "Albums") {
                searchResults.firstOrNull { isTopSongMatch(searchQuery, it) }
            } else {
                null
            }
            if (topArtist != null) {
                ArtistBanner(
                    artist = topArtist,
                    onClick = { onArtistClick(topArtist.id) },
                )
            } else if (topSong != null) {
                SongBanner(
                    track = topSong,
                    onPlay = {
                        scope.launch {
                            searchHistory.recordTrack(
                                topSong.id,
                                topSong.title,
                                topSong.artist,
                                topSong.artworkUrl,
                            )
                        }
                        playbackManager.playTrack(topSong)
                    },
                )
            }
            if (otherArtists.isNotEmpty()) {
                ArtistsSection(
                    artists = otherArtists,
                    onArtistClick = onArtistClick,
                )
            }

            if (visibleSongs.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm)) {
                    FreqSectionHeader(title = "Songs")
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(FreqShapes.card)
                            .background(FreqTheme.colors.glassStandard),
                    ) {
                        visibleSongs.forEachIndexed { index, track ->
                            SearchTrackRow(
                                track = track,
                                onPlay = {
                                    // M27.6: record actually-tapped songs in
                                    // recent activity, then play normally.
                                    scope.launch {
                                        searchHistory.recordTrack(
                                            track.id,
                                            track.title,
                                            track.artist,
                                            track.artworkUrl,
                                        )
                                    }
                                    playbackManager.playTrack(track)
                                },
                                onPlayNext = { playbackManager.playNext(track) },
                                onAddToQueue = { playbackManager.addToQueue(track) },
                                onAddToPlaylist = { selectedTrackForPlaylist = track },
                            )
                            if (index < visibleSongs.size - 1) {
                                HorizontalDivider(
                                    color = FreqTheme.colors.glassBorder,
                                    thickness = 1.dp,
                                )
                            }
                        }
                    }
                }
            }

            if (visibleAlbums.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm)) {
                    FreqSectionHeader(title = "Albums")
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
                        contentPadding = PaddingValues(end = FreqSpacing.md),
                    ) {
                        items(visibleAlbums, key = { it.key }) { group ->
                            FreqMediaCard(
                                title = group.title,
                                subtitle = "${group.artist} • ${group.tracks.size} " +
                                    if (group.tracks.size == 1) "track" else "tracks",
                                artworkUrl = group.artworkUrl,
                                colors = group.gradientColors,
                                onClick = {
                                    group.tracks.firstOrNull()?.let {
                                        scope.launch {
                                            searchHistory.recordTrack(
                                                it.id,
                                                it.title,
                                                it.artist,
                                                it.artworkUrl,
                                            )
                                        }
                                        playbackManager.playTrack(it)
                                    }
                                },
                                contentDescription = "Play album ${group.title} by ${group.artist}",
                            )
                        }
                    }
                }
            }
        }
    }
}

/**
 * Album grouping over real search-result tracks (M18). Groups by album and
 * artist in first-seen order. Tracks without a genuine album
 * (blank/"Single" backend defaults) stay in Songs only — the Albums rail
 * must not invent album entities. Pure and unit-tested.
 */
data class AlbumSearchGroup(
    val key: String,
    val title: String,
    val artist: String,
    val artworkUrl: String?,
    val gradientColors: List<Color>,
    val tracks: List<MediaTrack>,
)

fun groupSearchTracksByAlbum(tracks: List<MediaTrack>): List<AlbumSearchGroup> {
    val orderedKeys = mutableListOf<String>()
    val buckets = mutableMapOf<String, MutableList<MediaTrack>>()
    for (track in tracks) {
        if (track.album.isBlank() || track.album == "Single") continue
        val key = "${track.artist}::${track.album}"
        if (!buckets.containsKey(key)) {
            orderedKeys.add(key)
        }
        buckets.getOrPut(key) { mutableListOf() }.add(track)
    }
    return orderedKeys.mapNotNull { key ->
        val group = buckets[key] ?: return@mapNotNull null
        val first = group.first()
        AlbumSearchGroup(
            key = key,
            title = first.album,
            artist = first.artist,
            artworkUrl = first.artworkUrl,
            gradientColors = first.gradientColors,
            tracks = group.toList(),
        )
    }
}

/**
 * Honest result summary from real counts only. Pure and unit-tested.
 */
fun searchResultSummary(songCount: Int, albumCount: Int): String {
    val parts = mutableListOf<String>()
    if (songCount > 0) parts.add("$songCount " + if (songCount == 1) "song" else "songs")
    if (albumCount > 0) parts.add("$albumCount " + if (albumCount == 1) "album" else "albums")
    return parts.joinToString(" • ").ifEmpty { "No results" }
}

@Composable
private fun SearchHeader() {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = "Search",
            style = Typography.displaySmall,
            color = FreqTheme.colors.textPrimary,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
private fun SearchInputRow(
    searchQuery: String,
    onQueryChange: (String) -> Unit,
    onCancelClick: () -> Unit,
    onSubmit: (String) -> Unit,
) {
    val focusManager = LocalFocusManager.current
    val context = LocalContext.current
    // Voice input: system recognizer fills the field and submits. No
    // permission needed (intent-based); missing recognizer toasts honestly.
    val voiceLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val spoken = result.data
                ?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
                ?.firstOrNull()
                ?.trim()
            if (!spoken.isNullOrBlank()) {
                onQueryChange(spoken)
                onSubmit(spoken)
            }
        }
    }
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
    ) {
        FreqGlassSurface(
            tone = FreqGlassTone.Floating,
            shape = FreqShapes.pill,
            glassBackend = FreqGlassBackend.HAZE,
            contentAlignment = Alignment.CenterStart,
            modifier = Modifier
                .weight(1f)
                .height(FreqSpacing.touchTargetMin)
                .clip(FreqShapes.pill),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = FreqSpacing.md),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = null,
                    tint = FreqTheme.colors.iconSecondary,
                    modifier = Modifier.size(FreqSpacing.iconMd),
                )
                Spacer(modifier = Modifier.width(FreqSpacing.xs))

                BasicTextField(
                    value = searchQuery,
                    onValueChange = onQueryChange,
                    modifier = Modifier.weight(1f),
                    textStyle = Typography.bodyMedium.copy(color = FreqTheme.colors.textPrimary),
                    cursorBrush = SolidColor(FreqTheme.colors.textSecondary),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(
                        onSearch = {
                            onSubmit(searchQuery.trim())
                            focusManager.clearFocus()
                        },
                    ),
                    decorationBox = { innerTextField ->
                        if (searchQuery.isEmpty()) {
                            Text(
                                text = SEARCH_PLACEHOLDER,
                                style = Typography.bodyMedium,
                                color = FreqTheme.colors.textMuted,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                        innerTextField()
                    },
                )

                if (searchQuery.isNotEmpty()) {
                    FreqIconButton(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Clear search",
                        onClick = onCancelClick,
                        glass = false,
                        tint = FreqTheme.colors.textSecondary,
                        iconSize = FreqSpacing.iconMd,
                    )
                } else {
                    FreqIconButton(
                        imageVector = FreqIcons.Mic,
                        contentDescription = "Voice search",
                        onClick = {
                            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                                putExtra(
                                    RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                                    RecognizerIntent.LANGUAGE_MODEL_FREE_FORM,
                                )
                            }
                            try {
                                if (intent.resolveActivity(context.packageManager) != null) {
                                    voiceLauncher.launch(intent)
                                } else {
                                    Toast.makeText(context, "Voice search not available", Toast.LENGTH_SHORT).show()
                                }
                            } catch (_: Exception) {
                                Toast.makeText(context, "Voice search not available", Toast.LENGTH_SHORT).show()
                            }
                        },
                        glass = false,
                        tint = FreqTheme.colors.textSecondary,
                        iconSize = FreqSpacing.iconMd,
                    )
                }
            }
        }

        Text(
            text = "Cancel",
            style = Typography.labelLarge,
            color = FreqTheme.colors.textSecondary,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.clickable { onCancelClick() },
        )
    }
}

/**
 * Query context header: the searched text as the discovery canvas title,
 * with an honest count line derived from real results.
 */
@Composable
private fun SearchResultHeader(
    query: String,
    songCount: Int,
    albumCount: Int,
) {
    val colors = FreqTheme.colors
    Column(verticalArrangement = Arrangement.spacedBy(FreqSpacing.xxs)) {
        Text(
            text = "SEARCH RESULTS",
            style = Typography.labelSmall,
            color = colors.textMuted,
            fontWeight = FontWeight.Bold,
        )
        Text(
            text = query,
            style = Typography.headlineMedium,
            color = colors.textPrimary,
            fontWeight = FontWeight.Bold,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            text = searchResultSummary(songCount, albumCount),
            style = Typography.bodySmall,
            color = colors.textMuted,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

/**
 * Calm track row: artwork, title/artist, duration, and a single 44dp
 * overflow holding every real action (Play, Play Next, Add to Queue,
 * Add to Playlist). Row tap plays; nothing here is decorative.
 */
@Composable
private fun SearchTrackRow(
    track: MediaTrack,
    onPlay: () -> Unit,
    onPlayNext: () -> Unit,
    onAddToQueue: () -> Unit,
    onAddToPlaylist: () -> Unit,
) {
    var showMenu by remember { mutableStateOf(false) }
    val colors = FreqTheme.colors

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(
                role = Role.Button,
                onClickLabel = "Play ${track.title} by ${track.artist}",
                onClick = onPlay,
            )
            .padding(horizontal = FreqSpacing.md, vertical = FreqSpacing.sm),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        FreqArtwork(
            artworkUrl = track.artworkUrl,
            colors = track.gradientColors,
            shape = FreqShapes.artworkSmall,
            iconSize = FreqSpacing.iconMd,
            modifier = Modifier.size(FreqSpacing.artworkThumb),
        )

        Spacer(modifier = Modifier.width(FreqSpacing.md))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = track.title,
                style = Typography.titleMedium,
                color = colors.textPrimary,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = track.artist,
                style = Typography.bodySmall,
                color = colors.textSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }

        Spacer(modifier = Modifier.width(FreqSpacing.xs))

        Text(
            text = formatSeekTime(track.durationSeconds),
            style = Typography.bodySmall,
            color = colors.textMuted,
            modifier = Modifier.padding(end = FreqSpacing.xs),
        )

        Box {
            FreqIconButton(
                imageVector = Icons.Default.MoreVert,
                contentDescription = "More options for ${track.title}",
                onClick = { showMenu = true },
                glass = false,
                tint = colors.textSecondary,
            )

            DropdownMenu(
                expanded = showMenu,
                onDismissRequest = { showMenu = false },
                modifier = Modifier.background(colors.surfaceElevated),
            ) {
                DropdownMenuItem(
                    text = { Text("Play", color = colors.textPrimary) },
                    onClick = {
                        showMenu = false
                        onPlay()
                    },
                )
                DropdownMenuItem(
                    text = { Text("Play Next", color = colors.textPrimary) },
                    onClick = {
                        showMenu = false
                        onPlayNext()
                    },
                )
                DropdownMenuItem(
                    text = { Text("Add to Queue", color = colors.textPrimary) },
                    onClick = {
                        showMenu = false
                        onAddToQueue()
                    },
                )
                DropdownMenuItem(
                    text = { Text("Add to Playlist", color = colors.textPrimary) },
                    onClick = {
                        showMenu = false
                        onAddToPlaylist()
                    },
                )
            }
        }
    }
}
