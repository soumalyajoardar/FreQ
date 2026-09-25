package com.gresseymusic.wave.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.Icons
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import com.gresseymusic.wave.ui.theme.FreqSpacing
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.Typography


/**
 * FreQ state visuals (M15 Area 13). One visual language for loading,
 * empty, error, and offline — calm glass iconography, muted copy, and a
 * single retry affordance. Business behavior (when each shows) is unchanged
 * and stays owned by the screens.
 */
@Composable
fun FreqLoadingState(
    message: String,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = FreqSpacing.xl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
    ) {
        CircularProgressIndicator(
            color = FreqTheme.colors.textSecondary,
            strokeWidth = FreqSpacing.xxs,
            modifier = Modifier.size(FreqSpacing.xl),
        )
        Text(
            text = message,
            style = Typography.bodySmall,
            color = FreqTheme.colors.textMuted,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
fun FreqEmptyState(
    message: String,
    modifier: Modifier = Modifier,
    icon: ImageVector = Icons.Default.Search,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = FreqSpacing.xl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = FreqTheme.colors.textMuted,
            modifier = Modifier.size(FreqSpacing.xl),
        )
        Text(
            text = message,
            style = Typography.bodySmall,
            color = FreqTheme.colors.textMuted,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
fun FreqErrorState(
    message: String,
    onRetryClick: () -> Unit,
    modifier: Modifier = Modifier,
    retryText: String = "Retry",
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = FreqSpacing.xl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
    ) {
        Icon(
            imageVector = Icons.Default.Refresh,
            contentDescription = null,
            tint = FreqTheme.colors.textMuted,
            modifier = Modifier.size(FreqSpacing.xl),
        )
        Text(
            text = message,
            style = Typography.bodySmall,
            color = FreqTheme.colors.textMuted,
            textAlign = TextAlign.Center,
        )
        FreqGhostButton(
            text = retryText,
            onClick = onRetryClick,
        )
    }
}