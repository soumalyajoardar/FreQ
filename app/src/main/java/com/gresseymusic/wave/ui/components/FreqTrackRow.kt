package com.gresseymusic.wave.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.gresseymusic.wave.player.MediaTrack
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.theme.FreqSpacing
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.Typography

/**
 * Shared calm track row (M21). Artwork, identity, duration, and a single
 * 44dp overflow holding the real secondary actions. Row tap is primary
 * play. Used by Album Detail, Artist Top Tracks, and User Playlists so
 * track presentation stays identical across the app.
 *
 * @param leadingLabel optional rank/number prefix ("01", "3").
 * @param showDuration whether the duration label renders (playlist mock
 * hides it for the clean Spotify-like row).
 * @param onMoveUp/onMoveDown reorder actions (user playlists); hidden when
 * null, disabled at the list edges via [canMoveUp]/[canMoveDown].
 * @param onRemove destructive remove with [removeText] label; hidden null.
 */
@Composable
fun FreqTrackRow(
    track: MediaTrack,
    onPlay: () -> Unit,
    modifier: Modifier = Modifier,
    leadingLabel: String? = null,
    showDuration: Boolean = true,
    onPlayNext: (() -> Unit)? = null,
    onAddToQueue: (() -> Unit)? = null,
    onMoveUp: (() -> Unit)? = null,
    onMoveDown: (() -> Unit)? = null,
    canMoveUp: Boolean = true,
    canMoveDown: Boolean = true,
    onRemove: (() -> Unit)? = null,
    removeText: String = "Remove",
) {
    var showMenu by remember { mutableStateOf(false) }
    val colors = FreqTheme.colors
    val hasMenu = onPlayNext != null || onAddToQueue != null ||
        onMoveUp != null || onMoveDown != null || onRemove != null

    Row(
        modifier = modifier
            .fillMaxWidth()
            .clickable(
                role = Role.Button,
                onClickLabel = "Play ${track.title} by ${track.artist}",
                indication = ripple(),
                interactionSource = remember { MutableInteractionSource() },
                onClick = onPlay,
            )
            .padding(horizontal = FreqSpacing.md, vertical = FreqSpacing.sm),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (leadingLabel != null) {
            Text(
                text = leadingLabel,
                style = Typography.labelMedium,
                color = colors.textMuted,
                modifier = Modifier.width(FreqSpacing.iconLg),
            )
        }

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

        if (showDuration) {
            Text(
                text = formatSeekTime(track.durationSeconds),
                style = Typography.bodySmall,
                color = colors.textMuted,
                modifier = Modifier.padding(end = FreqSpacing.xs),
            )
        }

        if (hasMenu) {
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
                    if (onMoveUp != null) {
                        DropdownMenuItem(
                            text = {
                                Text(
                                    "Move up",
                                    color = if (canMoveUp) colors.textPrimary else colors.textMuted,
                                )
                            },
                            enabled = canMoveUp,
                            onClick = {
                                showMenu = false
                                onMoveUp()
                            },
                        )
                    }
                    if (onMoveDown != null) {
                        DropdownMenuItem(
                            text = {
                                Text(
                                    "Move down",
                                    color = if (canMoveDown) colors.textPrimary else colors.textMuted,
                                )
                            },
                            enabled = canMoveDown,
                            onClick = {
                                showMenu = false
                                onMoveDown()
                            },
                        )
                    }
                    if (onPlayNext != null) {
                        DropdownMenuItem(
                            text = { Text("Play Next", color = colors.textPrimary) },
                            onClick = {
                                showMenu = false
                                onPlayNext()
                            },
                        )
                    }
                    if (onAddToQueue != null) {
                        DropdownMenuItem(
                            text = { Text("Add to Queue", color = colors.textPrimary) },
                            onClick = {
                                showMenu = false
                                onAddToQueue()
                            },
                        )
                    }
                    if (onRemove != null) {
                        DropdownMenuItem(
                            text = { Text(removeText, color = colors.error) },
                            onClick = {
                                showMenu = false
                                onRemove()
                            },
                        )
                    }
                }
            }
        } else {
            Spacer(modifier = Modifier.size(FreqSpacing.touchTargetDense))
        }
    }
}