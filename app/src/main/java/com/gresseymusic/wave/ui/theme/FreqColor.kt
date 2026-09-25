package com.gresseymusic.wave.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * FreQ semantic color roles (M15 design-system foundation).
 *
 * Every color a screen needs comes from here via `FreqTheme.colors` — never
 * from a hardcoded hex. FreQ is dark-only: one cinematic identity.
 */
data class FreqColors(
    // Foundation
    val background: Color,
    val backgroundElevated: Color,
    val surface: Color,
    val surfaceElevated: Color,
    // Glass
    val glassSubtle: Color,
    val glassStandard: Color,
    val glassStrong: Color,
    val glassFloating: Color,
    val glassBorder: Color,
    val glassBorderStrong: Color,
    val glassHighlight: Color,
    // Accents (restrained luminous cyan/violet family + supporting hues)
    val accentPrimary: Color,
    val accentSecondary: Color,
    val accentTertiary: Color,
    val accentPink: Color,
    val onAccent: Color,
    // Text
    val textPrimary: Color,
    val textSecondary: Color,
    val textMuted: Color,
    // Icons
    val iconPrimary: Color,
    val iconSecondary: Color,
    // Functional
    val success: Color,
    val warning: Color,
    val error: Color,
    val disabled: Color,
    // Atmosphere washes (translucent by design; layered under content)
    val atmospherePrimary: Color,
    val atmosphereSecondary: Color,
    val scrim: Color,
)

/**
 * Dark theme: cinematic deep blue-violet foundation, never plain black, so
 * bright artwork and luminous accents sit in a deliberate atmosphere.
 * Text roles target WCAG AA (4.5+) against [background].
 */
val DarkFreqColors = FreqColors(
    background = Color(0xFF090A0F),
    backgroundElevated = Color(0xFF0E1018),
    surface = Color(0xFF12141F),
    surfaceElevated = Color(0xFF1B1E2E),
    glassSubtle = Color(0x0AFFFFFF),
    glassStandard = Color(0x14FFFFFF),
    glassStrong = Color(0x1FFFFFFF),
    // M27.4 true floating glass: substantially more transparent so the
    // background visibly shows through. Target ~0.60 alpha for a clear
    // glass effect while maintaining readable text via border/highlight.
    glassFloating = Color(0x991B1E2E),
    glassBorder = Color(0x1FFFFFFF),
    glassBorderStrong = Color(0x33FFFFFF),
    glassHighlight = Color(0x40FFFFFF),
    accentPrimary = Color(0xFF00E5FF),
    accentSecondary = Color(0xFF8B5CF6),
    accentTertiary = Color(0xFF00F5D4),
    accentPink = Color(0xFFEC4899),
    onAccent = Color(0xFF090A0F),
    textPrimary = Color(0xFFF8FAFC),
    textSecondary = Color(0xFF94A3B8),
    textMuted = Color(0xFF75859C),
    iconPrimary = Color(0xFFF8FAFC),
    iconSecondary = Color(0xFF94A3B8),
    success = Color(0xFF10B981),
    warning = Color(0xFFF59E0B),
    error = Color(0xFFEF4444),
    disabled = Color(0xFF3A3F55),
    atmospherePrimary = Color(0x2600E5FF),
    atmosphereSecondary = Color(0x1F8B5CF6),
    scrim = Color(0x99090A0F),
)
