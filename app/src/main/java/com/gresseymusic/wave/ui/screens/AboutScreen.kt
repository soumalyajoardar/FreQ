package com.gresseymusic.wave.ui.screens

import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.gresseymusic.wave.ui.components.FreqGlassSurface
import com.gresseymusic.wave.ui.components.FreqIconButton
import com.gresseymusic.wave.ui.components.FreqIcons
import com.gresseymusic.wave.ui.theme.FreqElevation
import com.gresseymusic.wave.ui.theme.FreqGlassTone
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.theme.FreqSpacing
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.Typography

/**
 * About Screen (M24).
 *
 * Dedicated FreQ identity and product story surface:
 * - Refined branded hero with large FreQ wordmark and atmospheric gradient.
 * - Real version, build, and platform metadata (no fabricated statistics).
 * - Genuine open-source architecture credits (Media3, Compose, Coil, NewPipe, OkHttp).
 * - Live device environment inspection.
 * - Restrained glass cards, accessible 44dp+ navigation, and dual-theme polish.
 */
@Composable
fun AboutScreen(
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = FreqTheme.colors
    Column(
        modifier = modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = FreqSpacing.md),
        verticalArrangement = Arrangement.spacedBy(FreqSpacing.lg),
    ) {
        // --- Top Bar ---
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            FreqIconButton(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Back to Settings",
                onClick = onBackClick,
            )
        }

        // --- Branded Hero ---
        AboutHero()

        // --- Version & Product Card ---
        AboutSection(title = "VERSION & SPECIFICATION") {
            AboutMetadataCard(
                items = listOf(
                    "App Version" to "1.0 Stable",
                    "Build" to "1 (Release)",
                    "Target SDK" to "Android 15 (API 35/37)",
                    "Min SDK" to "Android 8.0 (API 26)",
                )
            )
        }

        // --- Philosophy & Product Story ---
        AboutSection(title = "PRODUCT PHILOSOPHY") {
            FreqGlassSurface(
                modifier = Modifier.fillMaxWidth(),
                tone = FreqGlassTone.Standard,
                shape = FreqShapes.cardLarge,
                shadow = FreqElevation.none,
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(FreqSpacing.lg),
                    verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
                ) {
                    Text(
                        text = "Pure Sound. Atmospheric Discovery.",
                        style = Typography.titleMedium,
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = "FreQ is an atmospheric music streaming client engineered for pure listening. Combining hardware-accelerated Media3 audio streaming with an open on-device extraction pipeline and a luminous glassmorphism interface, FreQ delivers continuous listening, local library persistence, and responsive discovery without compromise.",
                        style = Typography.bodyMedium,
                        color = colors.textSecondary,
                        lineHeight = Typography.bodyMedium.lineHeight,
                    )
                }
            }
        }

        // --- Architecture & Technologies ---
        AboutSection(title = "OPEN-SOURCE ARCHITECTURE") {
            AboutCreditsCard(
                technologies = listOf(
                    TechCredit("AndroidX Media3", "ExoPlayer hardware audio pipeline and background playback"),
                    TechCredit("Jetpack Compose", "Declarative UI and custom FreQ glassmorphism system"),
                    TechCredit("Coil", "Asynchronous, memory-efficient image loading and thumbnail caching"),
                    TechCredit("NewPipe Extractor", "On-device YouTube Music stream resolution"),
                    TechCredit("Square OkHttp", "Resilient HTTP transport and network stream recovery"),
                    TechCredit("Jetpack DataStore", "Transactional, asynchronous persistence for preferences and library"),
                )
            )
        }

        // --- Device Environment ---
        AboutSection(title = "DEVICE ENVIRONMENT") {
            AboutMetadataCard(
                items = listOf(
                    "Android Version" to "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})",
                    "Device" to "${Build.MANUFACTURER.replaceFirstChar { it.uppercase() }} ${Build.MODEL}",
                    "Hardware" to Build.HARDWARE,
                )
            )
        }

        Spacer(modifier = Modifier.height(FreqSpacing.md))
    }
}

@Composable
private fun AboutHero() {
    val colors = FreqTheme.colors
    FreqGlassSurface(
        modifier = Modifier.fillMaxWidth(),
        tone = FreqGlassTone.Standard,
        shape = FreqShapes.cardLarge,
        shadow = FreqElevation.card,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = FreqSpacing.xl, horizontal = FreqSpacing.lg),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(FreqSpacing.xs),
        ) {
            Text(
                text = "ABOUT FREQ",
                style = Typography.labelSmall,
                color = colors.textMuted,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = "FreQ",
                style = Typography.displayMedium,
                color = colors.textPrimary,
                fontWeight = FontWeight.ExtraBold,
            )
            Box(
                modifier = Modifier
                    .size(width = 48.dp, height = 3.dp)
                    .background(colors.textSecondary, FreqShapes.pill),
            )
            Spacer(modifier = Modifier.height(FreqSpacing.xs))
            Text(
                text = "Atmospheric Android Music Player",
                style = Typography.bodyMedium,
                color = colors.textSecondary,
                fontWeight = FontWeight.Medium,
            )
        }
    }
}

@Composable
private fun AboutSection(
    title: String,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(FreqSpacing.xs),
    ) {
        Text(
            text = title,
            style = Typography.labelSmall,
            color = FreqTheme.colors.textMuted,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = FreqSpacing.xs, vertical = 2.dp),
        )
        content()
    }
}

@Composable
private fun AboutMetadataCard(items: List<Pair<String, String>>) {
    val colors = FreqTheme.colors
    FreqGlassSurface(
        modifier = Modifier.fillMaxWidth(),
        tone = FreqGlassTone.Standard,
        shape = FreqShapes.card,
        shadow = FreqElevation.none,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = FreqSpacing.md, vertical = FreqSpacing.sm),
            verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
        ) {
            items.forEachIndexed { index, (label, value) ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = label,
                        style = Typography.bodyMedium,
                        color = colors.textSecondary,
                    )
                    Text(
                        text = value,
                        style = Typography.bodyMedium,
                        color = colors.textPrimary,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
                if (index < items.size - 1) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(1.dp)
                            .background(colors.glassBorder),
                    )
                }
            }
        }
    }
}

private data class TechCredit(val name: String, val description: String)

@Composable
private fun AboutCreditsCard(technologies: List<TechCredit>) {
    val colors = FreqTheme.colors
    FreqGlassSurface(
        modifier = Modifier.fillMaxWidth(),
        tone = FreqGlassTone.Standard,
        shape = FreqShapes.card,
        shadow = FreqElevation.none,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(FreqSpacing.md),
            verticalArrangement = Arrangement.spacedBy(FreqSpacing.md),
        ) {
            technologies.forEach { tech ->
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(
                        text = tech.name,
                        style = Typography.bodyMedium,
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = tech.description,
                        style = Typography.bodySmall,
                        color = colors.textSecondary,
                    )
                }
            }
        }
    }
}