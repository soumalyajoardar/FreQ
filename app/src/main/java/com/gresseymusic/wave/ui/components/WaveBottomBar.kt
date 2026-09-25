package com.gresseymusic.wave.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.gresseymusic.wave.ui.theme.FreqGlassTone
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.theme.FreqSpacing
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.Typography

enum class WaveBottomTab(
    val title: String,
    val icon: ImageVector,
    val route: String,
) {
    HOME("Home", Icons.Default.Home, "home"),
    SEARCH("Search", Icons.Default.Search, "search"),
    LIBRARY("Library", Icons.Default.Favorite, "library"),
    SETTINGS("Settings", FreqIcons.Settings, "settings"),
}

/** Floating capsule curvature — shared with the mini player so both
 *  floating capsules read as one family. Pill shape (fully rounded) for
 *  Apple-style floating capsules. */
private val BottomBarCapsuleShape = FreqShapes.pill

/**
 * Maximum width of the floating navigation capsule (M27.1). The capsule
 * stays centered so it reads as floating above the background — never a
 * full-width solid bar. Phones narrower than this simply show the capsule
 * minus the outer gutter.
 */
val BottomNavCapsuleMaxWidth = 460.dp

/**
 * FreQ bottom navigation (M25).
 * Floating translucent glass capsule / pill with Apple-grade subtle motion
 * and clean semantic glass aesthetics (zero button gradients).
 *
 * M27.1: the capsule wraps content and centers within the outer gutter
 * (no full-width slab), so the Mini Player and the navigation read as two
 * separate floating glass elements. The Scaffold bottom-bar slot itself
 * carries no background — the area around the capsule stays the actual
 * screen/background, and the system navigation area below remains visible.
 */
@Composable
fun WaveBottomBar(
    currentRoute: String?,
    onTabSelected: (WaveBottomTab) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = FreqTheme.colors

    Box(
        modifier = modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            // Bottom-only inset: the shell spacer above owns the exact
            // mini-player gap, so no top padding here.
            .padding(bottom = 4.dp),
        contentAlignment = Alignment.Center,
    ) {
        FreqGlassSurface(
            // Same fractional width as the Mini Player (0.94) so both
            // capsules align edge-to-edge. widthIn keeps tablets bounded.
            modifier = Modifier
                .fillMaxWidth(0.94f)
                .widthIn(max = BottomNavCapsuleMaxWidth),
            tone = FreqGlassTone.Floating,
            shape = BottomBarCapsuleShape,
            glassBackend = FreqGlassBackend.PRISMAL,
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp, horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                WaveBottomTab.entries.forEach { tab ->
                    val isSelected = currentRoute == tab.route

                    // Static selection state — no per-frame animation.
                    // Selected tabs render white with a soft halo; the rest
                    // stay calm gray. Instant and jitter-free.
                    val contentColor: Color =
                        if (isSelected) Color.White else colors.iconSecondary

                    val tabInteraction = remember { MutableInteractionSource() }

                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                        modifier = Modifier
                            // Equal weights — Home/Search/Library/Settings
                            // are perfectly justified, never drifting.
                            .weight(1f)
                            .defaultMinSize(minWidth = 56.dp, minHeight = 44.dp)
                            .clip(FreqShapes.pill)
                            .clickable(
                                role = Role.Button,
                                indication = ripple(),
                                interactionSource = tabInteraction,
                                onClick = { onTabSelected(tab) },
                            )
                            .padding(horizontal = FreqSpacing.sm, vertical = 4.dp),
                    ) {
                        // Selected tab glows white: soft white radial halo +
                        // white elevation glow + white icon. Unselected stays
                        // calm gray. Static — no animated glow.
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .then(
                                    if (isSelected) {
                                        Modifier
                                            .background(
                                                brush = androidx.compose.ui.graphics.Brush.radialGradient(
                                                    0f to Color.White.copy(alpha = 0.45f),
                                                    0.6f to Color.White.copy(alpha = 0.16f),
                                                    1f to Color.Transparent,
                                                ),
                                                shape = CircleShape,
                                            )
                                            .shadow(
                                                elevation = 18.dp,
                                                shape = CircleShape,
                                                ambientColor = Color.White.copy(alpha = 0.65f),
                                                spotColor = Color.White.copy(alpha = 0.65f),
                                            )
                                    } else {
                                        Modifier
                                    },
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = tab.icon,
                                contentDescription = tab.title,
                                tint = contentColor,
                                modifier = Modifier.size(24.dp),
                            )
                        }
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = tab.title,
                            color = contentColor,
                            style = Typography.labelSmall,
                        )
                    }
                }
            }
        }
    }
}
