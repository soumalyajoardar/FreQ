package com.gresseymusic.wave.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.graphics.Brush

/**
 * FreQ theme entry point (M15). Dark-only: provides [DarkFreqColors] plus
 * the supporting token locals, and maps the palette onto Material3 slots
 * so stock components (dialogs, menus, ripples) follow the FreQ identity.
 */
val LocalFreqColors = compositionLocalOf<FreqColors> { DarkFreqColors }

// M27.6: Material slots are monochrome — no cyan/blue may leak through
// stock component defaults (selection handles, ripples, indicators).
private val DarkMaterialScheme = darkColorScheme(
    primary = DarkFreqColors.textPrimary,
    onPrimary = DarkFreqColors.background,
    primaryContainer = DarkFreqColors.surfaceElevated,
    onPrimaryContainer = DarkFreqColors.textPrimary,
    secondary = DarkFreqColors.textSecondary,
    onSecondary = DarkFreqColors.background,
    secondaryContainer = DarkFreqColors.surfaceElevated,
    onSecondaryContainer = DarkFreqColors.textPrimary,
    tertiary = DarkFreqColors.textSecondary,
    onTertiary = DarkFreqColors.background,
    background = DarkFreqColors.background,
    onBackground = DarkFreqColors.textPrimary,
    surface = DarkFreqColors.surface,
    onSurface = DarkFreqColors.textPrimary,
    surfaceVariant = DarkFreqColors.surfaceElevated,
    onSurfaceVariant = DarkFreqColors.textSecondary,
    surfaceContainerLowest = DarkFreqColors.background,
    surfaceContainerLow = DarkFreqColors.backgroundElevated,
    surfaceContainer = DarkFreqColors.surface,
    surfaceContainerHigh = DarkFreqColors.surfaceElevated,
    outline = DarkFreqColors.glassBorderStrong,
    outlineVariant = DarkFreqColors.glassBorder,
    error = DarkFreqColors.error,
    onError = DarkFreqColors.textPrimary,
)

@Composable
fun FreqTheme(
    content: @Composable () -> Unit,
) {
    val colors = DarkFreqColors
    CompositionLocalProvider(
        LocalFreqColors provides colors,
        // M27.6: press ripples use neutral ink everywhere — the default
        // Material ripple would flash the cyan primary on every tap.
        androidx.compose.material3.LocalRippleConfiguration provides
            androidx.compose.material3.RippleConfiguration(
                color = colors.textPrimary,
            ),
    ) {
        MaterialTheme(
            colorScheme = DarkMaterialScheme,
            typography = FreqTypography,
            shapes = FreqMaterialShapes,
            content = content,
        )
    }
}

/** Convenient theme access: `FreqTheme.colors.textPrimary`. */
object FreqTheme {
    val colors: FreqColors
        @Composable
        @ReadOnlyComposable
        get() = LocalFreqColors.current
}

/**
 * Luminous accent gradient (cyan → violet) for primary actions, active
 * states, and glow highlights. Remembered per theme.
 */
@Composable
fun rememberFreqAccentGradient(): Brush {
    val colors = FreqTheme.colors
    return androidx.compose.runtime.remember(colors) {
        Brush.horizontalGradient(listOf(colors.accentPrimary, colors.accentSecondary))
    }
}
