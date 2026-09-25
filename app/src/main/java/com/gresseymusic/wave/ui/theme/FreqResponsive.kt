package com.gresseymusic.wave.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Responsive foundation (M15). Phones only — foldables are out of scope.
 * Helpers keep content comfortable on small, normal, large, and tall
 * screens without assuming one size.
 */
object FreqResponsive {
    /** Comfortable reading width; wider screens center content within it. */
    val contentMaxWidth: Dp = 720.dp

    /** Compact phones (narrow width): tighten edge padding slightly. */
    const val COMPACT_WIDTH_DP = 360

    /** Short screens: reduce hero artwork so controls stay reachable. */
    const val SHORT_HEIGHT_DP = 640

    fun edgePaddingFor(widthDp: Int): Dp {
        return if (widthDp < COMPACT_WIDTH_DP) 12.dp else FreqSpacing.screenEdge
    }

    fun heroArtworkSizeFor(heightDp: Int): Dp {
        return if (heightDp < SHORT_HEIGHT_DP) 120.dp else FreqSpacing.artworkHero
    }

    /** Rails show fewer, larger cards on narrow screens. */
    fun railCardWidthFor(widthDp: Int): Dp {
        return if (widthDp < COMPACT_WIDTH_DP) 104.dp else FreqSpacing.artworkCard
    }
}

/** Current screen width/height in dp, recomputed on configuration change. */
@Composable
fun rememberScreenSize(): Pair<Dp, Dp> {
    val configuration = LocalConfiguration.current
    val density = LocalDensity.current
    return remember(configuration) {
        with(density) {
            Pair(configuration.screenWidthDp.dp, configuration.screenHeightDp.dp)
        }
    }
}
