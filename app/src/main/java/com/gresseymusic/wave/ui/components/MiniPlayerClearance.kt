package com.gresseymusic.wave.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.unit.Dp
import com.gresseymusic.wave.player.LocalPlaybackManager
import com.gresseymusic.wave.ui.theme.FreqSpacing
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map

/**
 * Bottom clearance for scroll roots (M28k, full-height screens).
 *
 * Screens stretch from the top edge down to the bottom navigation. The
 * floating overlay eats part of that height, so scrollable content pads
 * its end: the full mini-player clearance while a track exists, the
 * smaller bottom-bar clearance otherwise (no dead photo gap on idle).
 * Narrow flow — progress ticks never recompose for this.
 */
@Composable
fun rememberMiniPlayerBottomClearance(): Dp {
    val playbackManager = LocalPlaybackManager.current
    val hasMiniPlayer by remember(playbackManager) {
        playbackManager.state.map { it.currentTrack != null }.distinctUntilChanged()
    }.collectAsState(initial = playbackManager.state.value.currentTrack != null)
    return if (hasMiniPlayer) FreqSpacing.miniPlayerClearance else FreqSpacing.bottomBarClearance
}
