package com.gresseymusic.wave.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.Icons
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.window.Dialog
import java.time.LocalTime
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.gresseymusic.wave.data.library.LocalLibraryRepositoryProvider
import com.gresseymusic.wave.data.model.HomeCatalogItem
import com.gresseymusic.wave.data.model.HomeCatalogSection
import com.gresseymusic.wave.data.recommendation.ListeningRecommendationEngine
import com.gresseymusic.wave.data.recommendation.RecommendationState
import com.gresseymusic.wave.data.repository.CatalogResult
import com.gresseymusic.wave.data.settings.LocalUserPreferences
import com.gresseymusic.wave.data.settings.UserPreferences
import com.gresseymusic.wave.player.LocalPlaybackManager
import com.gresseymusic.wave.player.MediaTrack
import com.gresseymusic.wave.ui.components.CatalogErrorState
import com.gresseymusic.wave.ui.components.FreqDialogSurface
import com.gresseymusic.wave.ui.components.FreqEmptyState
import com.gresseymusic.wave.ui.components.FreqGhostButton
import com.gresseymusic.wave.ui.components.FreqHeroCard
import com.gresseymusic.wave.ui.components.FreqIconButton
import com.gresseymusic.wave.ui.components.FreqMediaCard
import com.gresseymusic.wave.ui.components.FreqSectionHeader
import com.gresseymusic.wave.ui.theme.FreqResponsive
import com.gresseymusic.wave.ui.theme.FreqSpacing
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.Typography
import com.gresseymusic.wave.ui.screens.LocalHomeCatalogState


/**
 * FreQ Home (M17). Discovery-first hierarchy built only from genuine data:
 *
 * HERO (first item of the first real catalog section)
 * → RECENTLY PLAYED (real local history, honest empty hint otherwise)
 * → CATALOG RAILS (every backend section, type-appropriate cards)
 *
 * M14 removed all fake rails, heroes, and fallbacks; this redesign keeps
 * that contract — empty or failed results render FreQ states, never
 * fixtures. The old `getHomeTracks` dead path and its derived sections are
 * gone: that endpoint always returns empty in production.
 */
@Composable
fun HomeScreen(
    modifier: Modifier = Modifier,
    onAlbumClick: (String) -> Unit = {},
    onPlaylistClick: (String) -> Unit = {},
    onOpenNowPlaying: () -> Unit = {},
) {
    val playbackManager = LocalPlaybackManager.current
    val scope = rememberCoroutineScope()
    val libraryRepository = LocalLibraryRepositoryProvider.current
    val userPreferences = LocalUserPreferences.current
    val catalogState = LocalHomeCatalogState.current
    val username by userPreferences.usernameFlow.collectAsState(initial = null)
    val appOpenCount by userPreferences.appOpenCountFlow.collectAsState(initial = 0)

    // Rotating headline: reads the app open count to change the editorial line.
    // The actual increment happens once per process launch in MainActivity.



    // Catalog result from app-shell level state (loaded once, survives nav).
    val catalogResult: CatalogResult<List<HomeCatalogSection>>? = catalogState.catalogResult
    val catalogRetryCount = catalogState.retryCount

    val realRecentlyPlayed by libraryRepository.recentlyPlayed.collectAsState()
    val likedTracks by libraryRepository.likedTracks.collectAsState()
    val savedArtists by libraryRepository.savedArtists.collectAsState()
    val userPlaylists by libraryRepository.userPlaylists.collectAsState()
    val currentTrack by remember(playbackManager) {
        playbackManager.state.map { it.currentTrack }.distinctUntilChanged()
    }.collectAsState(initial = null)
    val recommendationState = remember(realRecentlyPlayed, likedTracks, savedArtists, userPlaylists, catalogResult, currentTrack?.id) {
        val catalogSections = (catalogResult as? CatalogResult.Success)?.data ?: emptyList()
        ListeningRecommendationEngine.computeRecommendations(
            recentlyPlayed = realRecentlyPlayed,
            likedTracks = likedTracks,
            savedArtists = savedArtists,
            userPlaylists = userPlaylists,
            catalogSections = catalogSections,
            currentTrackId = currentTrack?.id,
        )
    }

    val screenWidthDp = LocalConfiguration.current.screenWidthDp
    val railArtSize = FreqResponsive.railCardWidthFor(screenWidthDp)

    fun openCatalogItem(item: HomeCatalogItem) {
        when (item.type) {
            "album" -> onAlbumClick(item.id)
            "playlist" -> onPlaylistClick(item.id)
            "song" -> {
                if (item.track != null) {
                    if (!playbackManager.playTrack(item.track)) onOpenNowPlaying()
                }
            }
            else -> {}
        }
    }

    fun playTrackAndOpen(track: MediaTrack) {
        if (!playbackManager.playTrack(track)) onOpenNowPlaying()
    }

    var showAccountDialog by remember { mutableStateOf(false) }

    // Content renders instantly — no staggered entrance travel.
    // Boot: while the catalog hasn't loaded, the whole screen is one big
    // smooth loading animation; content (including thumbnails) appears
    // together once everything is in.
    if (catalogResult == null) {
        HomeBootLoading(modifier = modifier)
        return
    }
    Column(
        modifier = modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = FreqSpacing.md)
            .padding(top = FreqSpacing.sm, bottom = if (currentTrack != null) FreqSpacing.miniPlayerClearance else FreqSpacing.bottomBarClearance),
        verticalArrangement = Arrangement.spacedBy(FreqSpacing.lg),
    ) {
        HomeHeader(
            greetingLabel = UserPreferences.greetingLabelForHour(LocalTime.now().hour),
            headline = UserPreferences.headlineForAppOpenCount(appOpenCount.coerceAtLeast(1)),
            subHeadline = UserPreferences.subHeadlineForAppOpenCount(appOpenCount.coerceAtLeast(1)),
            username = username,
            onAccountClick = { showAccountDialog = true },
        )

        when (val result = catalogResult) {
            is CatalogResult.Failure -> {
                CatalogErrorState(
                    message = "Couldn't load your music. Check your connection and try again.",
                    onRetryClick = { catalogState.retry() },
                )
            }
            is CatalogResult.Success -> {
                if (result.data.isEmpty()) {
                    FreqEmptyState(
                        message = "Nothing to show right now. Check your connection and try again later.",
                    )
                } else {
                    // Popular-mixes hero: public mixes people listen to
                    // (playlist-type catalog items) headline the pager;
                    // without any, the first section heads it as before.
                    val (heroItems, heroEyebrow) = remember(result.data) {
                        selectHeroItems(result.data, HERO_PAGE_COUNT)
                    }
                    val heroPagerState = rememberPagerState(pageCount = { heroItems.size })
                    // Auto-slide every 5s, looping back to the first page.
                    // Keyed on the items so fresh catalog data restarts it;
                    // user swipes simply offset the next tick.
                    LaunchedEffect(heroItems) {
                        if (heroItems.size <= 1) return@LaunchedEffect
                        while (true) {
                            delay(HERO_AUTOSLIDE_MS)
                            val next = (heroPagerState.currentPage + 1) % heroItems.size
                            heroPagerState.animateScrollToPage(next)
                        }
                    }
                    if (heroItems.isNotEmpty()) {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            HorizontalPager(
                                state = heroPagerState,
                                modifier = Modifier.fillMaxWidth(),
                            ) { page ->
                                val hero = heroItems[page]
                                FreqHeroCard(
                                    eyebrow = heroEyebrow,
                                    title = hero.title,
                                    subtitle = hero.subtitle,
                                    artworkUrl = hero.artworkUrl,
                                    colors = listOf(
                                        FreqTheme.colors.textSecondary,
                                        FreqTheme.colors.textMuted,
                                    ),
                                    actionContentDescription = "Open ${hero.title}",
                                    onOpen = { openCatalogItem(hero) },
                                )
                            }
                            // Design-mock page dots under the hero.
                            HeroPageDots(
                                pageCount = heroItems.size,
                                currentPage = heroPagerState.currentPage,
                                onDotClick = { page ->
                                    scope.launch { heroPagerState.animateScrollToPage(page) }
                                },
                            )
                        }
                    }

                    if (realRecentlyPlayed.isNotEmpty()) {
                        Column(verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm)) {
                            FreqSectionHeader(
                                title = "Recently Played",
                                actionText = "See All",
                                modifier = Modifier.fillMaxWidth(),
                            )
                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
                                contentPadding = PaddingValues(end = FreqSpacing.md),
                            ) {
                                items(realRecentlyPlayed, key = { it.id }) { track ->
                                    FreqMediaCard(
                                        title = track.title,
                                        subtitle = track.artist,
                                        artworkUrl = track.artworkUrl,
                                        colors = track.gradientColors,
                                        onClick = { playTrackAndOpen(track) },
                                        artSize = railArtSize,
                                        badge = true,
                                        contentDescription = "Play ${track.title} by ${track.artist}",
                                    )
                                }
                            }
                        }
                    } else {
                        Column(verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm)) {
                            FreqSectionHeader(title = "Recently Played")
                            Text(
                                text = "Tracks you play will appear here.",
                                style = Typography.bodySmall,
                                color = FreqTheme.colors.textMuted,
                            )
                        }
                    }

                    // Your Mix — Personalization based on real listening behavior (M25)
                    Column(verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm)) {
                        FreqSectionHeader(title = "Your Mix")
                        when (recommendationState) {
                            is RecommendationState.ColdStart -> {
                                Text(
                                    text = "Keep listening — FreQ is learning your taste.",
                                    style = Typography.bodySmall,
                                    color = FreqTheme.colors.textMuted,
                                )
                            }
                            is RecommendationState.Ready -> {
                                LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
                                    contentPadding = PaddingValues(end = FreqSpacing.md),
                                ) {
                                    items(recommendationState.tracks, key = { it.id }) { track ->
                                        FreqMediaCard(
                                            title = track.title,
                                            subtitle = track.artist,
                                            artworkUrl = track.artworkUrl,
                                            colors = track.gradientColors,
                                            onClick = { playTrackAndOpen(track) },
                                            artSize = railArtSize,
                                            badge = true,
                                            contentDescription = "Play ${track.title} by ${track.artist}",
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // The hero pager already showcases these items — rails
                    // drop them by id so nothing repeats anywhere.
                    val heroIds = remember(heroItems) { heroItems.map { it.id }.toSet() }
                    result.data.forEach { sec ->
                        val railItems = sec.items.filter { it.id !in heroIds }
                        if (railItems.isNotEmpty()) {
                            Column(verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm)) {
                                FreqSectionHeader(title = sec.title)
                                LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
                                    contentPadding = PaddingValues(end = FreqSpacing.md),
                                ) {
                                    items(railItems, key = { it.id }) { item ->
                                        FreqMediaCard(
                                            title = item.title,
                                            subtitle = item.subtitle,
                                            artworkUrl = item.artworkUrl,
                                            colors = listOf(
                                                FreqTheme.colors.textSecondary,
                                                FreqTheme.colors.textMuted,
                                            ),
                                            onClick = { openCatalogItem(item) },
                                            artSize = railArtSize,
                                            circular = item.type == "artist",
                                            contentDescription = when (item.type) {
                                                "album" -> "Open album ${item.title}"
                                                "playlist" -> "Open playlist ${item.title}"
                                                "artist" -> "Open artist ${item.title}"
                                                else -> "Play ${item.title}"
                                            },
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showAccountDialog) {
        GuestAccountDialog(onDismiss = { showAccountDialog = false })
    }
}

@Composable
private fun HomeBootLoading(modifier: Modifier = Modifier) {
    // Big smooth boot animation: one large spinner centered on the full
    // screen. GPU-rotated, zero recomposition — never jittery.
    Box(
        modifier = modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding(),
        contentAlignment = Alignment.Center,
    ) {
        CircularProgressIndicator(
            color = FreqTheme.colors.textPrimary,
            strokeWidth = 6.dp,
            modifier = Modifier.size(76.dp),
        )
    }
}

@Composable
private fun GuestAccountDialog(onDismiss: () -> Unit) {
    // Dummy account sheet: honest guest placeholder — no fabricated user,
    // no fake sign-in. Just confirms the local guest session.
    Dialog(onDismissRequest = onDismiss) {
        FreqDialogSurface {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
            ) {
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(FreqTheme.colors.glassStrong),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        tint = FreqTheme.colors.textPrimary,
                        modifier = Modifier.size(36.dp),
                    )
                }
                Text(
                    text = "Guest",
                    style = Typography.headlineMedium,
                    color = FreqTheme.colors.textPrimary,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = "You're listening as a guest. Your library and favorites stay on this device.",
                    style = Typography.bodyMedium,
                    color = FreqTheme.colors.textSecondary,
                    textAlign = TextAlign.Center,
                )
                Spacer(modifier = Modifier.height(FreqSpacing.xs))
                FreqGhostButton(
                    text = "Close",
                    onClick = onDismiss,
                )
            }
        }
    }
}

@Composable
private fun HomeHeader(
    greetingLabel: String,
    headline: String,
    subHeadline: String,
    username: String?,
    onAccountClick: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(FreqSpacing.xs),
    ) {
        // Branding row: FreQ wordmark + glassmorphism account entry.
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "FreQ",
                maxLines = 1,
                modifier = Modifier.semantics { heading() },
                style = Typography.displayLarge.copy(
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 34.sp,
                    lineHeight = 41.sp,
                    letterSpacing = (-0.5).sp,
                    brush = Brush.horizontalGradient(
                        listOf(
                            FreqTheme.colors.textPrimary,
                            Color(0xFFC4B5FD),
                            Color(0xFF93C5FD),
                        ),
                    ),
                ),
            )
            // Account entry: frosted-glass circle, no outline.
            FreqIconButton(
                imageVector = Icons.Default.Person,
                contentDescription = "Account",
                onClick = onAccountClick,
                iconSize = 24.dp,
            )
        }
        Spacer(modifier = Modifier.height(FreqSpacing.md))
        // Greeting label: small caps editorial with a soft white glow.
        Text(
            text = greetingLabel,
            style = Typography.labelMedium.copy(
                letterSpacing = 1.6.sp,
                shadow = Shadow(
                    color = Color.White.copy(alpha = 0.35f),
                    offset = Offset.Zero,
                    blurRadius = 12f,
                ),
            ),
            color = FreqTheme.colors.textSecondary,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
        )
        // Rotating headline: large two-line editorial with soft white glow.
        Text(
            text = headline,
            style = Typography.displayMedium.copy(
                fontWeight = FontWeight.Bold,
                fontSize = 31.sp,
                lineHeight = 36.sp,
                letterSpacing = (-0.5).sp,
                shadow = Shadow(
                    color = Color.White.copy(alpha = 0.28f),
                    offset = Offset.Zero,
                    blurRadius = 18f,
                ),
            ),
            color = FreqTheme.colors.textPrimary,
            modifier = Modifier.semantics { heading() },
        )
        Text(
            text = subHeadline,
            style = Typography.bodyMedium,
            color = FreqTheme.colors.textMuted,
            maxLines = 1,
        )
    }
}

@Composable
private fun HeroPageDots(
    pageCount: Int,
    currentPage: Int,
    onDotClick: (Int) -> Unit = {},
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        repeat(pageCount) { index ->
            val active = index == currentPage
            // 48dp-wide hit target with the tiny dot centered — taps
            // never miss even though the visual stays minimal.
            Box(
                modifier = Modifier
                    .defaultMinSize(minWidth = 48.dp, minHeight = 32.dp)
                    .clickable(
                        role = Role.Button,
                        indication = null,
                        interactionSource = remember { MutableInteractionSource() },
                        onClickLabel = "Go to page ${index + 1}",
                        onClick = { onDotClick(index) },
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Box(
                    modifier = Modifier
                        .size(if (active) 6.dp else 4.dp)
                        .clip(CircleShape)
                        .background(
                            if (active) Color.White
                            else FreqTheme.colors.textMuted.copy(alpha = 0.55f),
                        ),
                )
            }
        }
    }
}

/** Number of featured items in the slidable Home hero. */
const val HERO_PAGE_COUNT = 5

/** Auto-slide interval for the Home hero pager. */
const val HERO_AUTOSLIDE_MS = 5_000L

/**
 * Hero selection (M28o): public mixes people listen to (playlist-type
 * catalog items across all sections) headline the pager under a
 * "Popular Mixes" eyebrow. Without any mixes, the first non-empty
 * section heads it under its own title, as before. Pure and unit-tested.
 */
fun selectHeroItems(
    sections: List<HomeCatalogSection>,
    limit: Int,
): Pair<List<HomeCatalogItem>, String> {
    val mixes = sections.asSequence()
        .flatMap { it.items }
        .filter { it.type.equals("playlist", ignoreCase = true) && it.id.isNotBlank() }
        .distinctBy { it.id }
        .take(limit.coerceAtLeast(0))
        .toList()
    if (mixes.isNotEmpty()) return mixes to "Popular Mixes"
    val firstSection = sections.firstOrNull { it.items.isNotEmpty() }
    return (firstSection?.items?.take(limit.coerceAtLeast(0)) ?: emptyList()) to
        (firstSection?.title.orEmpty())
}

/**
 * Hero pick: the first item of the first non-empty catalog section, or null
 * when the catalog has no displayable content. Pure and unit-tested — the
 * hero is always genuine backend content, never a fixture.
 */
fun selectHomeHero(sections: List<HomeCatalogSection>): HomeCatalogItem? {
    return sections.firstOrNull { it.items.isNotEmpty() }?.items?.firstOrNull()
}

/**
 * Time-aware greeting for the Home header (M25). Supports local personalization.
 * Pure and unit-tested. Retained for backward compatibility; M27 production
 * header uses [greetingLine1ForHour] + display name two-line hierarchy.
 */
fun greetingForHour(hour: Int, username: String? = null): String {
    return UserPreferences.formatGreeting(hour, username)
}

/**
 * M27 line 1: "[Greeting] [emoji]" (e.g. "Good afternoon 🌤️").
 * Pure and unit-tested.
 */
fun greetingLine1ForHour(hour: Int): String {
    return UserPreferences.greetingLine1ForHour(hour)
}

/**
 * M27 line 2: sanitized display name or null. Pure and unit-tested.
 */
fun greetingDisplayNameForUser(username: String?): String? {
    return UserPreferences.greetingDisplayName(username)
}

/**
 * Design-mock greeting label: uppercase time-of-day ("GOOD MORNING").
 * Pure.
 */
fun greetingLabelForHour(hour: Int): String {
    return UserPreferences.greetingLabelForHour(hour)
}

/**
 * Design-mock rotating headline for the app-open count. Pure.
 */
fun headlineForAppOpenCount(count: Int): String {
    return UserPreferences.headlineForAppOpenCount(count)
}

/**
 * Design-mock rotating sub-headline paired with the headline. Pure.
 */
fun subHeadlineForAppOpenCount(count: Int): String {
    return UserPreferences.subHeadlineForAppOpenCount(count)
}
