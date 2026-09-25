package com.gresseymusic.wave

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.isImeVisible
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.ui.Alignment
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.gresseymusic.wave.data.library.LocalLibraryRepositoryImpl
import com.gresseymusic.wave.data.library.LocalLibraryRepositoryProvider
import com.gresseymusic.wave.data.remote.YtMusicApiClient
import com.gresseymusic.wave.data.remote.YtMusicDirectClient
import com.gresseymusic.wave.data.remote.YtMusicPlaybackProvider
import com.gresseymusic.wave.data.repository.LocalMusicRepository
import com.gresseymusic.wave.data.repository.YtMusicRepository
import com.gresseymusic.wave.data.settings.LocalSearchHistory
import com.gresseymusic.wave.data.settings.LocalUserPreferences
import com.gresseymusic.wave.data.settings.SearchHistory
import com.gresseymusic.wave.data.settings.UserPreferences
import com.gresseymusic.wave.ui.screens.LocalHomeCatalogState
import com.gresseymusic.wave.ui.screens.ProvideHomeCatalogState
import com.gresseymusic.wave.navigation.WaveNavGraph
import com.gresseymusic.wave.player.LocalPlaybackManager
import com.gresseymusic.wave.player.PlaybackManager
import com.gresseymusic.wave.ui.components.FreqBackground
import com.gresseymusic.wave.ui.components.WaveBottomBar
import com.gresseymusic.wave.ui.components.WaveMiniPlayer
import com.gresseymusic.wave.ui.theme.FreqTheme
import androidx.compose.runtime.CompositionLocalProvider
import com.gresseymusic.wave.ui.components.LocalPrismalBackdrop
import com.styropyr0.prismal.sources.prismalGlassLayer
import com.styropyr0.prismal.sources.rememberPrismalGlassLayer
import dev.chrisbanes.haze.HazeState
import dev.chrisbanes.haze.haze
import com.gresseymusic.wave.ui.theme.LocalHazeState
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map












class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val appContext = applicationContext
        setContent {
            val libraryRepository = remember { LocalLibraryRepositoryImpl(appContext) }
            // Catalog search reads YouTube Music InnerTube straight from
            // the device first (Musify-style); home/artists/albums stay on
            // the Vercel backend, which is also the search fallback. For
            // local backend dev on the emulator only, use
            // "http://10.0.2.2:8000/".
            val apiClient = remember { YtMusicApiClient("https://freq-api.vercel.app/") }
            val directClient = remember { YtMusicDirectClient() }
            val playbackProvider = remember { YtMusicPlaybackProvider(apiClient) }
            val musicRepository = remember {
                YtMusicRepository(
                    apiClient = apiClient,
                    directClient = directClient,
                    lrcLibClient = com.gresseymusic.wave.data.remote.LrcLibClient(),
                )
            }
            val playbackManager = remember {
                PlaybackManager(
                    context = appContext,
                    musicRepository = musicRepository,
                    libraryRepository = libraryRepository,
                    remoteProvider = playbackProvider,
                )
            }
            val userPreferences = remember { UserPreferences(appContext) }
            val searchHistory = remember { SearchHistory(appContext) }

            CompositionLocalProvider(
                LocalMusicRepository provides musicRepository,
                LocalLibraryRepositoryProvider provides libraryRepository,
                LocalPlaybackManager provides playbackManager,
                LocalUserPreferences provides userPreferences,
                LocalSearchHistory provides searchHistory,
            ) {
                // FreQ is dark-only: no theme selection, no system follow.
                FreqTheme {
                    ProvideHomeCatalogState(musicRepository) {
                        WaveAppShell()
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun WaveAppShell() {
    val hazeState = remember { HazeState() }
    // PrismalAGSL spike backdrop: samples the full-screen content for the
    // liquid-glass mini player + bottom bar. readSamplingState() positions
    // the layer so glass redraws once sampling is ready.
    val prismalBackdrop = rememberPrismalGlassLayer()
    prismalBackdrop.readSamplingState()
    CompositionLocalProvider(
        LocalHazeState provides hazeState,
        LocalPrismalBackdrop provides prismalBackdrop,
    ) {
        val playbackManager = LocalPlaybackManager.current
    // Narrow collectors: the progress ticker emits twice per second. The
    // shell (mini player + bottom bar + nav host) must not recompose on
    // progress ticks — only track and play/pause changes reach it.
    val miniTrack by remember(playbackManager) {
        playbackManager.state.map { it.currentTrack }.distinctUntilChanged()
    }.collectAsState(initial = playbackManager.state.value.currentTrack)
    val miniPlaying by remember(playbackManager) {
        playbackManager.state.map { it.isPlaying }.distinctUntilChanged()
    }.collectAsState(initial = playbackManager.state.value.isPlaying)
    val miniLoading by remember(playbackManager) {
        playbackManager.state.map { it.isLoading }.distinctUntilChanged()
    }.collectAsState(initial = playbackManager.state.value.isLoading)
    val lifecycleOwner = LocalLifecycleOwner.current

    DisposableEffect(lifecycleOwner) {        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_STOP || event == Lifecycle.Event.ON_PAUSE) {
                playbackManager.persistCurrentSession()
            }
            if (event == Lifecycle.Event.ON_RESUME) {
                // M27.1 background recovery: the service keeps playing while
                // FreQ is backgrounded, but UI state may be stale or empty
                // (e.g. Activity recreation). Re-sync visible state from the
                // live MediaController so the Mini Player always represents
                // the MediaSession. Never stops playback.
                playbackManager.refreshFromController()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            // UI-side cleanup only: releases this composition's controller
            // binding and PlaybackManager jobs. The AudioPlaybackService keeps
            // owning the player, so background playback is unaffected.
            playbackManager.release()
        }
    }

    // First-open name prompt removed (M28): the app opens straight into
    // music. Display Name stays editable in Settings for anyone who
    // wants personalized greetings; Home degrades to the generic
    // greeting when no name is set.
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    // The bottom stack hides on full-screen destinations (player,
    // queue) and on About so that screen owns the full viewport.
    // Settings is a bottom-bar tab so the stack stays visible there.
    // Showing/hiding is instant — no slide/fade travel (jitter-free).
    val showBottomControls = currentRoute != "now_playing" && currentRoute != "queue" &&
        currentRoute != "about"

    // Player screen keeps its own artwork atmosphere; everywhere else
    // shows the bundled photo background (blurred + veiled).
    FreqBackground(showPhoto = currentRoute != "now_playing") {
        // M27.6 CORRECTION: content is FULL-SCREEN and the Mini Player +
        // Bottom Navigation are a pure OVERLAY. The previous Scaffold
        // bottomBar slot measured the controls as a reserved bottom region
        // and shrank the content viewport via innerPadding, so the page
        // visibly ended above the controls (a separate bottom "section").
        // Now: NavHost fills the whole screen and draws UNDER the floating
        // capsules; scrollable screens carry bottom content padding
        // (FreqSpacing.miniPlayerClearance) so final items scroll above the
        // overlay. No background is painted anywhere in this shell — the
        // Column below is a transparent positioning shell only.
        Box(modifier = Modifier.fillMaxSize()) {
            // FULL-SCREEN APP CONTENT / BACKGROUND. Also registered as the
            // Prismal liquid-glass sampling backdrop.
            WaveNavGraph(
                navController = navController,
                modifier = Modifier
                    .fillMaxSize()
                    .prismalGlassLayer(prismalBackdrop),
            )

            // FLOATING CONTROLS OVER THE CONTENT. Shown instantly on
            // tab destinations, hidden instantly on full-screen ones —
            // no slide/fade travel. imePadding() lifts the stack just
            // above the keyboard. While the keyboard is open (e.g. typing
            // in Search) the nav bar hides so ONLY the mini player rests
            // on top of the keyboard.
            val imeVisible = WindowInsets.isImeVisible
            if (showBottomControls) {
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .navigationBarsPadding()
                        .imePadding(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    // No fake placeholder track: the mini player only
                    // renders once real playback state exists (M14).
                    // Instant appear/disappear — no entrance travel.
                    if (miniTrack != null) {
                        Box(
                            modifier = Modifier.fillMaxWidth(),
                            contentAlignment = Alignment.Center,
                        ) {
                            WaveMiniPlayer(
                                songTitle = miniTrack?.title ?: "Atmospheric Echoes",
                                artistName = miniTrack?.artist ?: "",
                                artworkUrl = miniTrack?.artworkUrl,
                                gradientColors = miniTrack?.gradientColors ?: emptyList(),
                                isPlaying = miniPlaying,
                                isLoading = miniLoading,
                                onPlayPauseClick = { playbackManager.togglePlayPause() },
                                onPreviousClick = { playbackManager.skipToPrevious() },
                                onNextClick = { playbackManager.skipToNext() },
                                onMiniPlayerClick = {
                                    com.gresseymusic.wave.navigation.openNowPlayingOnce(navController)
                                },
                                onSwipeToStop = {
                                    playbackManager.stopPlaybackCompletely()
                                },
                                // M27.6: capsule occupies almost the full width —
                                // page background peeks only slightly on both
                                // sides (3% each side), mini sits tight above
                                // the nav capsule.
                                modifier = Modifier.fillMaxWidth(0.94f),
                            )
                        }
                    }
                    // Mini-player sits exactly 4dp above the nav capsule
                    // (the nav bar itself carries no top padding). With the
                    // keyboard open the bar is gone: 5dp breathing room
                    // between the mini player and the keyboard instead.
                    if (imeVisible) {
                        Spacer(modifier = Modifier.height(5.dp))
                    } else {
                        Spacer(modifier = Modifier.height(4.dp))
                        WaveBottomBar(
                            currentRoute = currentRoute,
                            onTabSelected = { tab ->
                                if (currentRoute != tab.route) {
                                    navController.navigate(tab.route) {
                                        popUpTo(navController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                }
                            },
                        )
                    }
                }
            }
        }
    }
    }
}