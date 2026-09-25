package com.gresseymusic.wave.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.material3.ripple
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.Dp
import com.gresseymusic.wave.ui.theme.FreqElevation
import com.gresseymusic.wave.ui.theme.FreqGlassTone
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.theme.FreqSpacing
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.Typography














/**
 * FreQ buttons (M15). Two honest variants:
 *
 * - [FreqPrimaryButton]: luminous accent gradient for the single primary
 *   action (play, confirm). Dark text on the gradient for contrast.
 * - [FreqGhostButton]: glass row for secondary actions.
 * - [FreqIconButton]: 48dp hit target with a smaller visual, glass optional.
 */
@Composable
fun FreqPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    leadingIcon: ImageVector? = null,
) {
    val colors = FreqTheme.colors
    // M27.6: primary action is blurred floating glass with neutral ink —
    // no cyan anywhere. The surface supplies fill + border; backdrop blur
    // keeps it premium over any content.
    FreqGlassSurface(
        modifier = modifier
            .defaultMinSize(minHeight = FreqSpacing.touchTargetMin)
            .clip(FreqShapes.button)
            .clickable(
                enabled = enabled,
                role = Role.Button,
                indication = ripple(),
                interactionSource = remember { MutableInteractionSource() },
                onClick = onClick,
            ),
        tone = if (enabled) FreqGlassTone.Floating else FreqGlassTone.Standard,
        shape = FreqShapes.button,
        shadow = FreqElevation.none,
        contentAlignment = Alignment.Center,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = FreqSpacing.lg, vertical = FreqSpacing.sm),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (leadingIcon != null) {
                Icon(
                    imageVector = leadingIcon,
                    contentDescription = null,
                    tint = if (enabled) colors.textPrimary else colors.textMuted,
                    modifier = Modifier.size(FreqSpacing.iconMd),
                )
            }
            Text(
                text = text,
                style = Typography.labelLarge,
                color = if (enabled) colors.textPrimary else colors.textMuted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(start = if (leadingIcon != null) FreqSpacing.xs else FreqSpacing.xxs),
            )
        }
    }
}

@Composable
fun FreqGhostButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    leadingIcon: ImageVector? = null,
) {
    val colors = FreqTheme.colors
    FreqGlassSurface(
        modifier = modifier
            .defaultMinSize(minHeight = FreqSpacing.touchTargetDense)
            .clip(FreqShapes.button)
            .clickable(
                enabled = enabled,
                role = Role.Button,
                indication = ripple(),
                interactionSource = remember { MutableInteractionSource() },
                onClick = onClick,
            ),
        tone = FreqGlassTone.Standard,
        shape = FreqShapes.button,
        shadow = FreqElevation.none,
        contentAlignment = Alignment.Center,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = FreqSpacing.md, vertical = FreqSpacing.xs),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (leadingIcon != null) {
                Icon(
                    imageVector = leadingIcon,
                    contentDescription = null,
                    tint = if (enabled) colors.textPrimary else colors.textMuted,
                    modifier = Modifier.size(FreqSpacing.iconMd),
                )
            }
            Text(
                text = text,
                style = Typography.labelLarge,
                color = if (enabled) colors.textPrimary else colors.textMuted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(start = if (leadingIcon != null) FreqSpacing.xs else FreqSpacing.xxs),
            )
        }
    }
}

/**
 * Solid white play action (M28l): the single high-contrast action on
 * detail screens — opaque white pill, dark icon + label. Same language
 * as the player disc; frosted glass washes out over bright artwork.
 */
@Composable
fun FreqPlayButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    leadingIcon: ImageVector? = Icons.Default.PlayArrow,
) {
    val interaction = remember { MutableInteractionSource() }
    Box(
        modifier = modifier
            .defaultMinSize(minHeight = FreqSpacing.touchTargetMin)
            .clip(FreqShapes.pill)
            .background(
                if (enabled) Color.White else Color.White.copy(alpha = 0.35f),
                FreqShapes.pill,
            )
            .clickable(
                enabled = enabled,
                role = Role.Button,
                indication = ripple(),
                interactionSource = interaction,
                onClickLabel = text,
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(FreqSpacing.xs),
            modifier = Modifier.padding(horizontal = FreqSpacing.md),
        ) {
            if (leadingIcon != null) {
                Icon(
                    imageVector = leadingIcon,
                    contentDescription = null,
                    tint = PlayButtonInk,
                    modifier = Modifier.size(FreqSpacing.iconMd),
                )
            }
            Text(
                text = text,
                style = Typography.labelLarge,
                color = PlayButtonInk,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

/** Dark ink for content on the solid white play action. */
private val PlayButtonInk: Color = Color(0xFF101218)

@Composable
fun FreqIconButton(    imageVector: ImageVector,
    contentDescription: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    glass: Boolean = true,
    tint: Color? = null,
    iconSize: Dp = FreqSpacing.iconLg,
) {
    val colors = FreqTheme.colors
    val interaction = remember { MutableInteractionSource() }
    val iconContent = @Composable {
        Icon(
            imageVector = imageVector,
            contentDescription = contentDescription,
            tint = tint ?: if (enabled) colors.iconPrimary else colors.textMuted,
            modifier = Modifier.size(iconSize),
        )
    }
    if (glass) {
        // Glass icon button — symbol sits inside a tangible button.
        FreqGlassSurface(
            modifier = Modifier
                .size(FreqSpacing.touchTargetDense)
                .then(modifier)
                .clip(FreqShapes.circle)
                .clickable(
                    enabled = enabled,
                    role = Role.Button,
                    indication = ripple(),
                    interactionSource = interaction,
                    onClick = onClick,
                ),
            tone = FreqGlassTone.Floating,
            shape = FreqShapes.circle,
            shadow = FreqElevation.none,
            contentAlignment = Alignment.Center,
        ) {
            iconContent()
        }
    } else {
        Box(
            modifier = Modifier
                .size(FreqSpacing.touchTargetMin)
                .then(modifier)
                .clip(FreqShapes.circle)
                .clickable(
                    enabled = enabled,
                    role = Role.Button,
                    indication = ripple(),
                    interactionSource = interaction,
                    onClick = onClick,
                ),
            contentAlignment = Alignment.Center,
        ) {
            iconContent()
        }
    }
}

/**
 * M27 filter chip: neutral glass in both states, never blue-filled.
 * Selected uses a stronger glass fill + restrained accent edge; text stays
 * semantic. Small accent edge is the only color signal.
 */
@Composable
fun FreqChip(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = FreqTheme.colors
    Box(
        modifier = modifier
            .clip(FreqShapes.chip)
            .background(
                if (selected) colors.glassStrong else colors.glassStandard,
                FreqShapes.chip,
            )
            .clickable(
                role = Role.Button,
                indication = ripple(),
                interactionSource = remember { MutableInteractionSource() },
                onClick = onClick,
            )
            .padding(horizontal = FreqSpacing.md, vertical = FreqSpacing.xs),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            style = Typography.labelMedium,
            color = if (selected) colors.textPrimary else colors.textSecondary,
        )
    }
}

@Composable
private fun Modifier.borderGlassSubtle(): Modifier {
    return this
}

/**
 * Play/pause icon: swaps instantly with no morph animation. [pauseIcon] is
 * the local pause glyph (mini / small / large variants); play always uses
 * the shared PlayArrow.
 */
@Composable
fun FreqPlayPauseIcon(
    isPlaying: Boolean,
    pauseIcon: ImageVector,
    modifier: Modifier = Modifier,
    tint: Color? = null,
    iconSize: Dp = FreqSpacing.iconLg,
    contentDescription: String? = null,
) {
    val colors = FreqTheme.colors
    Icon(
        imageVector = if (isPlaying) pauseIcon else Icons.Default.PlayArrow,
        contentDescription = contentDescription,
        tint = tint ?: colors.iconPrimary,
        modifier = modifier.size(iconSize),
    )
}

/** Section header: title left, optional action right. */
@Composable
fun FreqSectionHeader(
    title: String,
    modifier: Modifier = Modifier,
    actionText: String? = null,
    onActionClick: () -> Unit = {},
) {
    Row(
        modifier = modifier.semantics(mergeDescendants = true) { heading() },
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = title,
            style = Typography.headlineMedium,
            color = FreqTheme.colors.textPrimary,
        )
        if (actionText != null) {
            Text(
                text = actionText,
                style = Typography.labelMedium,
                color = FreqTheme.colors.textPrimary,
                modifier = Modifier
                    .clip(FreqShapes.chip)
                    .clickable(
                        role = Role.Button,
                        indication = ripple(),
                        interactionSource = remember { MutableInteractionSource() },
                        onClick = onActionClick,
                    )
                    .padding(horizontal = FreqSpacing.md, vertical = FreqSpacing.sm),
            )
        }
    }
}