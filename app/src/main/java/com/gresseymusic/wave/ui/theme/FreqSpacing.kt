package com.gresseymusic.wave.ui.theme

import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * FreQ spacing scale (M15). 4dp base unit; semantic aliases describe intent
 * so future screens never scatter magic numbers.
 */
object FreqSpacing {
    // Base scale
    val xxs: Dp = 2.dp
    val xs: Dp = 4.dp
    val sm: Dp = 8.dp
    val md: Dp = 16.dp
    val lg: Dp = 24.dp
    val xl: Dp = 32.dp
    val xxl: Dp = 48.dp
    val xxxl: Dp = 64.dp

    // Semantic aliases
    val screenEdge: Dp = md
    val sectionGap: Dp = lg
    val cardPadding: Dp = md
    val listItemGap: Dp = sm
    val artworkTextGap: Dp = md
    val dialogPadding: Dp = lg

    // System clearance (mini player + bottom bar overlay content).
    // M27.6 overlay world: scrollable screens draw UNDER the floating
    // controls, so bottom content padding must exceed the stacked overlay
    // (mini ~64dp + gap + nav ~76dp + gesture inset), measured ~150dp on
    // device. 176dp leaves a comfortable margin; it only extends max
    // scroll, never the resting layout.
    val miniPlayerHeight: Dp = 64.dp
    val miniPlayerClearance: Dp = 176.dp
    val bottomBarHeight: Dp = 76.dp
    /**
     * Idle bottom clearance (M28k): no mini player showing, so content
     * runs down to the bottom bar — 176dp would leave a dead photo gap.
     * Nav (~76dp) + gesture inset + breathing room.
     */
    val bottomBarClearance: Dp = 108.dp

    // Iconography
    val iconSm: Dp = 16.dp
    val iconMd: Dp = 20.dp
    val iconLg: Dp = 24.dp
    val iconXl: Dp = 32.dp

    // Artwork ladder (dp edge for square artwork)
    val artworkThumb: Dp = 48.dp
    val artworkCard: Dp = 118.dp
    val artworkHero: Dp = 160.dp
    val artworkNowPlayingFraction: Float = 0.82f
    val artworkNowPlayingMaxHeight: Dp = 320.dp

    // Touch targets (visual may be smaller; hit area must meet minimum)
    val touchTargetMin: Dp = 48.dp
    val touchTargetDense: Dp = 44.dp
}
