package com.gresseymusic.wave.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.gresseymusic.wave.ui.theme.FreqElevation
import com.gresseymusic.wave.ui.theme.FreqGlassTone
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.theme.FreqSpacing
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.Typography

/**
 * Visual prominence tone for [FreqSettingsRow].
 */
enum class FreqSettingsRowTone {
    Standard,
    Accent,
    Danger,
}

/**
 * Reusable FreQ Settings row (M24).
 *
 * Adheres to FreQ glassmorphic hierarchy:
 * - Subtle/Standard glass container with rounded card geometry.
 * - Icon badge with tonal glass fill.
 * - Bold primary title with clear hierarchy and optional supporting text.
 * - Trailing slot for value chip, chevron, or status indicator.
 * - Accessible 44dp+ touch target with explicit semantic roles.
 */
@Composable
fun FreqSettingsRow(
    title: String,
    modifier: Modifier = Modifier,
    description: String? = null,
    leadingIcon: ImageVector? = null,
    tone: FreqSettingsRowTone = FreqSettingsRowTone.Standard,
    trailingContent: @Composable (() -> Unit)? = null,
    onClick: (() -> Unit)? = null,
    contentDescriptionText: String? = null,
) {
    val colors = FreqTheme.colors
    // M27 neutral icons: decorative rows never flood with blue. Accent is
    // reserved for true active states owned by the screens themselves.
    val iconTint = when (tone) {
        FreqSettingsRowTone.Standard -> colors.iconPrimary
        FreqSettingsRowTone.Accent -> colors.textPrimary
        FreqSettingsRowTone.Danger -> colors.error
    }
    val titleColor = when (tone) {
        FreqSettingsRowTone.Danger -> colors.error
        else -> colors.textPrimary
    }

    val interactiveModifier = if (onClick != null) {
        Modifier
            .semantics {
                role = Role.Button
                contentDescription = contentDescriptionText ?: title
            }
            .clickable(onClick = onClick)
    } else {
        Modifier
    }

    FreqGlassSurface(
        modifier = modifier
            .fillMaxWidth()
            .defaultMinSize(minHeight = 56.dp)
            .then(interactiveModifier),
        tone = when (tone) {
            FreqSettingsRowTone.Accent -> FreqGlassTone.Strong
            FreqSettingsRowTone.Standard -> FreqGlassTone.Standard
            FreqSettingsRowTone.Danger -> FreqGlassTone.Subtle
        },
        shape = FreqShapes.card,
        shadow = FreqElevation.none,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = FreqSpacing.md, vertical = FreqSpacing.sm + 2.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(FreqSpacing.md),
        ) {
            if (leadingIcon != null) {
                FreqGlassSurface(
                    modifier = Modifier.size(40.dp),
                    tone = FreqGlassTone.Subtle,
                    shape = FreqShapes.circle,
                    shadow = FreqElevation.none,
                    contentAlignment = Alignment.Center,
                ) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            imageVector = leadingIcon,
                            contentDescription = null,
                            tint = iconTint,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                }
            }

            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(
                    text = title,
                    style = Typography.bodyLarge,
                    color = titleColor,
                    fontWeight = FontWeight.SemiBold,
                )
                if (!description.isNullOrBlank()) {
                    Text(
                        text = description,
                        style = Typography.bodySmall,
                        color = colors.textSecondary,
                    )
                }
            }

            if (trailingContent != null) {
                trailingContent()
            }
        }
    }
}
