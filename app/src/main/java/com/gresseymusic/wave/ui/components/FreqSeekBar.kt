package com.gresseymusic.wave.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.progressSemantics
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.theme.FreqSpacing
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.Typography
import java.util.Locale

/**
 * FreQ seek bar (M27). Premium neutral glass progress control: neutral
 * glass track, restrained light fill, glass/light thumb. No neon blue
 * gradient. Interaction preserves the proven Now Playing behavior.
 */
@Composable
fun FreqSeekBar(
    positionSeconds: Float,
    durationSeconds: Int,
    onSeek: (Float) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    trackHeight: Dp = 6.dp,
    touchHeight: Dp = FreqSpacing.touchTargetMin,
    showRemaining: Boolean = false,
) {
    val colors = FreqTheme.colors
    var dragging by remember { mutableStateOf(false) }
    var dragPosition by remember { mutableFloatStateOf(0f) }
    val range = 0f..durationSeconds.toFloat().coerceAtLeast(1f)
    val shownPosition = if (dragging) dragPosition else positionSeconds.coerceIn(range)
    val fraction = progressFraction(shownPosition, durationSeconds)

    // M27 neutral progress: restrained light fill (never neon blue).
    val fillColor = remember(colors) { colors.textPrimary }

    Column(modifier = modifier.fillMaxWidth()) {
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxWidth()
                .height(touchHeight)
                .semantics(mergeDescendants = true) {
                    contentDescription =
                        "Seek, ${formatSeekTime(shownPosition.toInt())} of ${formatSeekTime(durationSeconds)}"
                }
                .progressSemantics(shownPosition, range),
            contentAlignment = Alignment.CenterStart,
        ) {
            val barWidth = maxWidth
            // Track: flat neutral glass. Fill + thumb stay crisp on top.
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(trackHeight)
                    .clip(FreqShapes.pill)
                    .background(colors.glassStrong),
            )
            // Fill: restrained neutral light.
            Box(
                modifier = Modifier
                    .fillMaxWidth(fraction)
                    .height(trackHeight)
                    .clip(FreqShapes.pill)
                    .background(fillColor),
            )
            // Thumb: glass/light, never a blue LED.
            Box(
                modifier = Modifier
                    .offset(x = ((barWidth - FreqSpacing.iconSm) * fraction).coerceAtLeast(0.dp))
                    .size(FreqSpacing.iconSm)
                    .shadow(FreqSpacing.xs, FreqShapes.circle)
                    .clip(FreqShapes.circle)
                    .background(colors.textPrimary),
            )
            // Gesture layer above the visuals.
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(touchHeight)
                    .pointerInput(enabled, durationSeconds) {
                        if (!enabled) return@pointerInput
                        detectTapGestures { offset ->
                            val tapped = seekSecondsFromFraction(
                                (offset.x / size.width).toFloat(),
                                durationSeconds,
                            )
                            onSeek(tapped)
                        }
                    }
                    .pointerInput(enabled, durationSeconds) {
                        if (!enabled) return@pointerInput
                        var active = false
                        detectHorizontalDragGestures(
                            onDragStart = {
                                active = true
                                dragging = true
                                dragPosition = positionSeconds.coerceIn(range)
                            },
                            onDragCancel = {
                                active = false
                                dragging = false
                            },
                            onDragEnd = {
                                if (active) {
                                    active = false
                                    dragging = false
                                    onSeek(dragPosition)
                                }
                            },
                            onHorizontalDrag = { change, _ ->
                                change.consume()
                                dragPosition = seekSecondsFromFraction(
                                    (change.position.x / size.width).toFloat(),
                                    durationSeconds,
                                )
                            },
                        )
                    },
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                text = formatSeekTime(shownPosition.toInt()),
                style = Typography.labelSmall,
                color = colors.textMuted,
            )
            Text(
                text = if (showRemaining) {
                    if (durationSeconds > 0) {
                        "-" + formatSeekTime((durationSeconds - shownPosition.toInt()).coerceAtLeast(0))
                    } else {
                        "--:--"
                    }
                } else {
                    formatSeekTime(durationSeconds)
                },
                style = Typography.labelSmall,
                color = colors.textMuted,
            )
        }
    }
}

/**
 * Playback fraction in 0..1. Guards unknown durations, negatives, and NaN.
 * Pure and unit-tested.
 */
fun progressFraction(positionSeconds: Float, durationSeconds: Int): Float {
    if (durationSeconds <= 0 || positionSeconds.isNaN()) return 0f
    return (positionSeconds / durationSeconds).coerceIn(0f, 1f)
}

/**
 * Seek target in seconds for a 0..1 gesture fraction. Pure and unit-tested.
 */
fun seekSecondsFromFraction(fraction: Float, durationSeconds: Int): Float {
    if (durationSeconds <= 0 || fraction.isNaN()) return 0f
    return fraction.coerceIn(0f, 1f) * durationSeconds
}

/** m:ss formatting for seek labels. Pure and unit-tested. */
fun formatSeekTime(totalSeconds: Int): String {
    val coerced = totalSeconds.coerceAtLeast(0)
    return String.format(Locale.US, "%d:%02d", coerced / 60, coerced % 60)
}

/**
 * Queue duration label (M27.6). Watch-continuation metadata carries no
 * usable duration (decodes to <= 1s); showing "0:01" would fake a duration
 * the backend never provided. Unknown durations render as an honest dash
 * until the lazy detail fetch patches the real value.
 */
fun formatQueueDuration(durationSeconds: Int): String {
    if (durationSeconds <= 1) return "--:--"
    return formatSeekTime(durationSeconds)
}
