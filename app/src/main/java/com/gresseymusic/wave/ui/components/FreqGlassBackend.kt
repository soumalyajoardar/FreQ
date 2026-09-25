package com.gresseymusic.wave.ui.components

import androidx.compose.runtime.compositionLocalOf
import com.styropyr0.prismal.PrismalBackdrop

/**
 * Glass renderer switch for the floating shell (spike).
 *
 * - [HAZE]: Chris Banes Haze Gaussian backdrop blur (default, fallback).
 * - [PRISMAL]: PrismalAGSL liquid glass (spike on mini player + navbar).
 */
enum class FreqGlassBackend {
    HAZE,
    PRISMAL,
}

/**
 * Shared Prismal backdrop layer. The full-screen content registers into it;
 * Prismal glass capsules sample it for liquid-glass rendering.
 */
val LocalPrismalBackdrop = compositionLocalOf<PrismalBackdrop?> { null }
