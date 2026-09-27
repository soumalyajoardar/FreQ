package com.gresseymusic.wave.ui.screens

import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.Icon
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.Coil
import com.gresseymusic.wave.data.library.LocalLibraryRepositoryProvider
import com.gresseymusic.wave.data.settings.LocalUserPreferences
import com.gresseymusic.wave.ui.components.FreqConfirmDialog
import com.gresseymusic.wave.ui.components.FreqGlassSurface
import com.gresseymusic.wave.ui.components.FreqIconButton
import com.gresseymusic.wave.ui.components.FreqIcons
import com.gresseymusic.wave.ui.components.FreqSettingsRow
import com.gresseymusic.wave.ui.components.FreqSettingsRowTone
import com.gresseymusic.wave.ui.theme.FreqElevation
import com.gresseymusic.wave.ui.theme.FreqGlassTone
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.theme.FreqSpacing
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.Typography
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import com.gresseymusic.wave.ui.components.rememberMiniPlayerBottomClearance

/**
 * Settings Screen (M24).
 *
 * Designed as FreQ's control room:
 * - Refined, atmospheric hierarchy with genuine FreQ glassmorphism.
 * - FreQ is dark-only: no theme selection.
 * - Strictly real settings backed by existing architecture:
 *   1. Playback & Audio Engine (Media3/ExoPlayer, NewPipe extractor, session recovery)
 *   2. Data & Storage (Local library statistics, cache management)
 *   3. About FreQ gateway
 * - Zero fake switches, zero fake accounts, zero placeholders.
 */
@Composable
fun SettingsScreen(
    onBackClick: () -> Unit,
    onAboutClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = FreqTheme.colors
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val libraryRepository = LocalLibraryRepositoryProvider.current
    val userPreferences = LocalUserPreferences.current
    val likedTracks by libraryRepository.likedTracks.collectAsState()
    val userPlaylists by libraryRepository.userPlaylists.collectAsState()
    val recentlyPlayed by libraryRepository.recentlyPlayed.collectAsState()
    val autoUpdateEnabled by userPreferences.autoUpdateEnabledFlow.collectAsState(initial = false)

    var showClearCacheDialog by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = FreqSpacing.md)
            .padding(top = FreqSpacing.sm, bottom = rememberMiniPlayerBottomClearance()),
        verticalArrangement = Arrangement.spacedBy(FreqSpacing.lg),
    ) {
        // --- Header ---
        SettingsHeader(onBackClick = onBackClick)

        // --- Data & Storage ---
        SettingsSection(title = "DATA & STORAGE") {
            FreqSettingsRow(
                title = "Local Music Library",
                description = formatLibrarySummary(
                    likedCount = likedTracks.size,
                    playlistCount = userPlaylists.size,
                    historyCount = recentlyPlayed.size,
                ),
                leadingIcon = FreqIcons.Storage,
            )
            FreqSettingsRow(
                title = "Auto-update",
                description = "Check GitHub for new versions on launch",
                leadingIcon = FreqIcons.Info,
                trailingContent = {
                    Switch(
                        checked = autoUpdateEnabled,
                        onCheckedChange = { enabled ->
                            scope.launch { userPreferences.setAutoUpdateEnabled(enabled) }
                        },
                    )
                },
                onClick = {
                    scope.launch { userPreferences.setAutoUpdateEnabled(!autoUpdateEnabled) }
                },
                contentDescriptionText = if (autoUpdateEnabled) {
                    "Auto-update on. Tap to turn off."
                } else {
                    "Auto-update off. Tap to turn on."
                },
            )
            FreqSettingsRow(
                title = "Clear Temporary Cache",
                description = "Free space by removing cached artwork and stream buffers",
                leadingIcon = FreqIcons.Clean,
                tone = FreqSettingsRowTone.Danger,
                trailingContent = {
                    Icon(
                        imageVector = FreqIcons.ChevronRight,
                        contentDescription = null,
                        tint = colors.error,
                        modifier = Modifier.size(18.dp),
                    )
                },
                onClick = { showClearCacheDialog = true },
                contentDescriptionText = "Clear temporary cache",
            )
        }

        // --- About FreQ ---
        SettingsSection(title = "ABOUT") {
            FreqSettingsRow(
                title = "About FreQ",
                description = "Version 1.3 Stable (Build 3)",
                leadingIcon = FreqIcons.Info,
                trailingContent = {
                    Icon(
                        imageVector = FreqIcons.ChevronRight,
                        contentDescription = null,
                        tint = colors.textMuted,
                        modifier = Modifier.size(18.dp),
                    )
                },
                onClick = onAboutClick,
                contentDescriptionText = "Open About FreQ",
            )
        }

        Spacer(modifier = Modifier.height(FreqSpacing.md))
    }

    // --- Clear Cache Confirmation Dialog ---
    if (showClearCacheDialog) {
        FreqConfirmDialog(
            title = "Clear Temporary Cache?",
            message = "This will remove cached image thumbnails and network buffers. Your local playlists, favorites, and playback settings will remain intact.",
            confirmText = "Clear Cache",
            dismissText = "Cancel",
            onConfirm = {
                showClearCacheDialog = false
                scope.launch {
                    withContext(Dispatchers.IO) {
                        try {
                            Coil.imageLoader(context).memoryCache?.clear()
                            context.cacheDir.deleteRecursively()
                        } catch (_: Exception) {}
                    }
                    Toast.makeText(context, "Temporary cache cleared", Toast.LENGTH_SHORT).show()
                }
            },
            onDismiss = { showClearCacheDialog = false },
        )
    }
}

@Composable
private fun SettingsHeader(onBackClick: () -> Unit) {
    val colors = FreqTheme.colors
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(FreqSpacing.xs),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
        ) {
            FreqIconButton(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Back",
                onClick = onBackClick,
            )
            Column {
                Text(
                    text = "Settings",
                    style = Typography.displaySmall,
                    color = colors.textPrimary,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
        Text(
            text = "Fine-tune your local storage.",
            style = Typography.bodySmall,
            color = colors.textSecondary,
            modifier = Modifier.padding(start = FreqSpacing.xl + FreqSpacing.sm),
        )
    }
}

@Composable
private fun SettingsSection(
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
        Column(
            verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
        ) {
            content()
        }
    }
}

/** Pure formatting helper for unit tests */
fun formatLibrarySummary(likedCount: Int, playlistCount: Int, historyCount: Int): String {    val liked = if (likedCount == 1) "1 liked song" else "$likedCount liked songs"
    val playlists = if (playlistCount == 1) "1 playlist" else "$playlistCount playlists"
    return "$liked • $playlists • $historyCount in history"
}
