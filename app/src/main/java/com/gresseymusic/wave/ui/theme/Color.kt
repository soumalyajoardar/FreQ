package com.gresseymusic.wave.ui.theme

import androidx.compose.ui.graphics.Color

// FreQ artwork palette constants (M15).
//
// These are NOT theme roles: artwork-derived gradient colors intentionally
// stay identical in dark and light themes (artwork does not re-tint with
// the theme). They back gradient fallbacks where no artwork is available
// (MediaTrack defaults, dev fixtures). All text/surface/border theming
// lives in FreqColors via FreqTheme.colors.
val WavePrimaryCyan = Color(0xFF00E5FF)
val WaveSecondaryViolet = Color(0xFF8B5CF6)
val WaveTealAccent = Color(0xFF00F5D4)
