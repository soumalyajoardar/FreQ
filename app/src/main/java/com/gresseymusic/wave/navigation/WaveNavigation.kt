package com.gresseymusic.wave.navigation

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavBackStackEntry
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.gresseymusic.wave.ui.components.WaveBottomTab
import com.gresseymusic.wave.ui.theme.FreqMotion
import com.gresseymusic.wave.ui.screens.AboutScreen
import com.gresseymusic.wave.ui.screens.AlbumDetailScreen
import com.gresseymusic.wave.ui.screens.ArtistDetailScreen
import com.gresseymusic.wave.ui.screens.HomeScreen
import com.gresseymusic.wave.ui.screens.LibraryScreen
import com.gresseymusic.wave.ui.screens.NowPlayingScreen
import com.gresseymusic.wave.ui.screens.PlaylistDetailScreen
import com.gresseymusic.wave.ui.screens.SearchScreen
import com.gresseymusic.wave.ui.screens.SettingsScreen
import com.gresseymusic.wave.ui.screens.UserPlaylistDetailScreen


/**
 * Now Playing pop-in/out: gentle grow/shrink + fade so the Mini Player
 * to full-player transition reads as one surface expanding, not a cut.
 */
const val NOW_PLAYING_POP_MS = 280

/** Resting scale the player pops in from / out to. */
const val NOW_PLAYING_POP_SCALE = 0.96f

/**
 * Player pull duration: slower than standard morphs so the Mini Player
 * to Now Playing expansion reads as a deliberate pull, not a snap.
 */
const val NOW_PLAYING_PULL_MS = 360

/**
 * Tab-return duration: slightly longer than pushes so backward slides
 * glide instead of feeling caught.
 */
const val TAB_RETURN_MS = 300

@Composable
fun WaveNavGraph(
    navController: NavHostController,
    modifier: Modifier = Modifier,
) {
    NavHost(
        navController = navController,
        startDestination = WaveBottomTab.HOME.route,
        modifier = modifier,
        // Smoothness-first: every destination cross-fades with one short
        // fade (no slides, no scale). Slides + scale on each tab switch
        // were the main source of jitter.
        enterTransition = {
            fadeIn(animationSpec = tween(FreqMotion.FADE_MS))
        },
        exitTransition = {
            fadeOut(animationSpec = tween(FreqMotion.FADE_MS))
        },
        popEnterTransition = {
            fadeIn(animationSpec = tween(FreqMotion.FADE_MS))
        },
        popExitTransition = {
            fadeOut(animationSpec = tween(FreqMotion.FADE_MS))
        },
    ) {
        composable(WaveBottomTab.HOME.route) {
            HomeScreen(
                onAlbumClick = { albumId -> navController.navigate("album/$albumId") },
                onPlaylistClick = { playlistId ->
                    if (playlistId.startsWith("user_pl_")) {
                        navController.navigate("user_playlist/$playlistId")
                    } else {
                        navController.navigate("playlist/$playlistId")
                    }
                },
                onOpenNowPlaying = { openNowPlayingOnce(navController) },
            )
        }
        composable(WaveBottomTab.SETTINGS.route) {
            SettingsScreen(
                onBackClick = { navController.popBackStack() },
                onAboutClick = { navController.navigate("about") },
            )
        }
        composable("about") {
            AboutScreen(
                onBackClick = { navController.popBackStack() },
            )
        }
        composable(WaveBottomTab.SEARCH.route) {
            SearchScreen(
                onArtistClick = { artistId -> navController.navigate("artist/$artistId") },
                onAlbumClick = { albumId -> navController.navigate("album/$albumId") },
                onOpenNowPlaying = { openNowPlayingOnce(navController) },
            )
        }
        composable(WaveBottomTab.LIBRARY.route) {
            LibraryScreen(
                onAlbumClick = { albumId -> navController.navigate("album/$albumId") },
                onPlaylistClick = { playlistId -> navController.navigate("playlist/$playlistId") },
                onUserPlaylistClick = { userPlId -> navController.navigate("user_playlist/$userPlId") },
                onArtistClick = { artistId -> navController.navigate("artist/$artistId") },
                onOpenNowPlaying = { openNowPlayingOnce(navController) },
            )
        }
        // M14: profile route removed with the fake-account Profile screen.
        // Now Playing transforms to/from the Mini Player: opening rises
        // from the mini with a gentle grow + fade; minimizing (back press,
        // top-left button) settles back down toward the mini the same way.
        // Forward exits (e.g. into Queue) use the plain quick fade.
        // Emphasized easing, short travel, no bounce.
        composable(
            route = "now_playing",
            enterTransition = {
                fadeIn(animationSpec = tween(NOW_PLAYING_POP_MS, easing = FreqMotion.emphasize)) +
                    slideInVertically(
                        animationSpec = tween(NOW_PLAYING_POP_MS, easing = FreqMotion.emphasize),
                        initialOffsetY = { it / 10 },
                    ) +
                    scaleIn(
                        animationSpec = tween(NOW_PLAYING_POP_MS, easing = FreqMotion.emphasize),
                        initialScale = NOW_PLAYING_POP_SCALE,
                    )
            },
            exitTransition = {
                fadeOut(animationSpec = tween(FreqMotion.FADE_MS))
            },
            popEnterTransition = {
                fadeIn(animationSpec = tween(FreqMotion.FADE_MS))
            },
            popExitTransition = {
                fadeOut(animationSpec = tween(NOW_PLAYING_POP_MS, easing = FreqMotion.emphasize)) +
                    slideOutVertically(
                        animationSpec = tween(NOW_PLAYING_POP_MS, easing = FreqMotion.emphasize),
                        targetOffsetY = { it / 8 },
                    ) +
                    scaleOut(
                        animationSpec = tween(NOW_PLAYING_POP_MS, easing = FreqMotion.emphasize),
                        targetScale = NOW_PLAYING_POP_SCALE,
                    )
            },
        ) {
            NowPlayingScreen(
                onDismiss = { navController.popBackStack() },
                onQueueClick = {
                    navController.navigate("queue") {
                        launchSingleTop = true
                    }
                },
            )
        }
        composable("queue") {
            com.gresseymusic.wave.ui.screens.QueueScreen(
                onBackClick = { navController.popBackStack() },
                // M27.1: guarded single-shot open — never stacks duplicate
                // Now Playing destinations from repeated taps.
                onCurrentTrackClick = { openNowPlayingOnce(navController) },
            )
        }
        composable(
            route = "artist/{id}",
            arguments = listOf(navArgument("id") { type = NavType.StringType }),
        ) { backStackEntry ->
            val artistId = backStackEntry.arguments?.getString("id") ?: ""
            ArtistDetailScreen(
                artistId = artistId,
                onBackClick = { navController.popBackStack() },
                onAlbumClick = { albumId -> navController.navigate("album/$albumId") },
                onOpenNowPlaying = { openNowPlayingOnce(navController) },
            )
        }
        composable(
            route = "album/{id}",
            arguments = listOf(navArgument("id") { type = NavType.StringType }),
        ) { backStackEntry ->
            val albumId = backStackEntry.arguments?.getString("id") ?: ""
            AlbumDetailScreen(
                albumId = albumId,
                onBackClick = { navController.popBackStack() },
                onArtistClick = { artistId -> navController.navigate("artist/$artistId") },
                onOpenNowPlaying = { openNowPlayingOnce(navController) },
            )
        }
        composable(
            route = "playlist/{id}",
            arguments = listOf(navArgument("id") { type = NavType.StringType }),
        ) { backStackEntry ->
            val playlistId = backStackEntry.arguments?.getString("id") ?: ""
            PlaylistDetailScreen(
                playlistId = playlistId,
                onBackClick = { navController.popBackStack() },
                onOpenNowPlaying = { openNowPlayingOnce(navController) },
            )
        }
        composable(
            route = "user_playlist/{id}",
            arguments = listOf(navArgument("id") { type = NavType.StringType }),
        ) { backStackEntry ->
            val userPlId = backStackEntry.arguments?.getString("id") ?: ""
            UserPlaylistDetailScreen(
                playlistId = userPlId,
                onBackClick = { navController.popBackStack() },
                onDeleted = { navController.popBackStack() },
                onBrowseTracksClick = { navController.navigate(WaveBottomTab.SEARCH.route) },
                onOpenNowPlaying = { openNowPlayingOnce(navController) },
            )
        }
    }
}

/**
 * Tab order index for directional slides. Non-tab destinations (detail
 * screens, player, queue, settings) return null.
 */
fun tabSlideIndex(route: String?): Int? = when (route) {
    WaveBottomTab.HOME.route -> 0
    WaveBottomTab.SEARCH.route -> 1
    WaveBottomTab.LIBRARY.route -> 2
    WaveBottomTab.SETTINGS.route -> 3
    else -> null
}

/**
 * Slide direction between two routes. Later tabs push right-to-left
 * (forward); earlier tabs slide left-to-right (backward). Tab-to-detail
 * is a forward push; detail-to-tab is a backward return; detail-to-detail
 * stays forward. Pure and unit-tested.
 */
fun waveSlideForward(fromRoute: String?, toRoute: String?): Boolean {
    val from = tabSlideIndex(fromRoute)
    val to = tabSlideIndex(toRoute)
    return when {
        from != null && to != null -> to > from
        from != null -> true
        to != null -> false
        else -> true
    }
}

/**
 * Reads the slide direction for the transition currently running in
 * this [AnimatedContentTransitionScope]: initial state is the outgoing
 * screen, target state the incoming one — for enter, exit, pop-enter
 * and pop-exit alike.
 */
fun AnimatedContentTransitionScope<NavBackStackEntry>.waveSlideForward(): Boolean {
    return waveSlideForward(
        initialState.destination.route,
        targetState.destination.route,
    )
}

/**
 * M27 single-shot Now Playing opener. Called exactly once from an explicit
 * track-tap handler *after* PlaybackManager has accepted playback. Guarded
 * by [shouldOpenNowPlaying] so recomposition, duplicate taps on an already
 * open player, or state observers can never stack or loop destinations.
 * Back returns to the originating screen via popBackStack.
 */
fun openNowPlayingOnce(navController: NavHostController) {
    val currentRoute = navController.currentBackStackEntry?.destination?.route
    if (!shouldOpenNowPlaying(currentRoute, playbackAccepted = true)) return
    navController.navigate("now_playing") {
        launchSingleTop = true
    }
}