package com.gresseymusic.wave.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.gresseymusic.wave.ui.components.FreqIconButton
import com.gresseymusic.wave.ui.theme.FreqSpacing
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.Typography

/**
 * About Screen (M28m): just the version. Back navigates to Settings.
 */
@Composable
fun AboutScreen(
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(horizontal = FreqSpacing.md)
            .padding(top = FreqSpacing.sm),
    ) {
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

        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(FreqSpacing.xs),
            ) {
                Text(
                    text = "Version 1.3 Stable",
                    style = Typography.displaySmall,
                    color = FreqTheme.colors.textPrimary,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = "Made with love by GRESSEY & OPENCODE",
                    style = Typography.bodySmall,
                    color = FreqTheme.colors.textSecondary,
                    fontWeight = FontWeight.Medium,
                )
                Text(
                    text = "All rights reserved.",
                    style = Typography.bodySmall,
                    color = FreqTheme.colors.textMuted,
                )
            }
        }
    }
}
