package com.gresseymusic.wave.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.layout.ContentScale
import coil.compose.SubcomposeAsyncImage
import coil.compose.SubcomposeAsyncImageContent
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.gresseymusic.wave.ui.theme.FreqElevation
import com.gresseymusic.wave.ui.theme.FreqGlassTone
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.theme.FreqSpacing
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.Typography

/**
 * Shared media-card vocabulary (M17). One flexible card for artwork-first
 * entities (songs, albums, playlists, artists) with FreQ material, stable
 * typography, and screen-reader semantics. Artwork is decorative; the card
 * itself carries the accessible label.
 *
 * @param circular opt-in portrait treatment for artist entities only.
 */
@Composable
fun FreqMediaCard(
    title: String,
    subtitle: String?,
    artworkUrl: String?,
    colors: List<Color>,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    artSize: Dp = FreqSpacing.artworkCard,
    circular: Boolean = false,
    badge: Boolean = false,
    contentDescription: String? = null,
) {
    val artShape: Shape = if (circular) FreqShapes.circle else FreqShapes.card
    Column(
        modifier = modifier
            .width(artSize + FreqSpacing.md)
            .clip(FreqShapes.mediaCard)
            .clickable(
                role = Role.Button,
                indication = ripple(),
                interactionSource = remember { MutableInteractionSource() },
                onClickLabel = contentDescription,
                onClick = onClick,
            ),
    ) {
        Box(
            modifier = Modifier
                .size(artSize)
                .clip(artShape),
        ) {
            FreqArtwork(
                artworkUrl = artworkUrl,
                colors = colors,
                shape = artShape,
                iconSize = FreqSpacing.iconLg,
                modifier = Modifier.matchParentSize(),
            )
            if (badge) {
                FreqArtworkPlayBadge(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(FreqSpacing.xs),
                )
            }
        }
        Spacer(modifier = Modifier.height(FreqSpacing.xs))
        Text(
            text = title,
            style = Typography.titleMedium,
            color = FreqTheme.colors.textPrimary,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        if (!subtitle.isNullOrBlank()) {
            Text(
                text = subtitle,
                style = Typography.bodySmall,
                color = FreqTheme.colors.textMuted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

/**
 * Shared editorial hero (M17, full-bleed artwork treatment).
 * The featured artwork fills the whole card as its background with a
 * neutral readability scrim; eyebrow/title sit bottom-start and a single
 * white play action sits bottom-end. Used for genuine featured content
 * only; never for fabricated mixes.
 */
@Composable
fun FreqHeroCard(
    eyebrow: String,
    title: String,
    subtitle: String?,
    artworkUrl: String?,
    colors: List<Color>,
    actionContentDescription: String,
    onOpen: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val themeColors = FreqTheme.colors
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(216.dp)
            .clip(FreqShapes.cardLarge)
            .clickable(
                role = Role.Button,
                indication = ripple(),
                interactionSource = remember { MutableInteractionSource() },
                onClickLabel = actionContentDescription,
                onClick = onOpen,
            ),
        contentAlignment = Alignment.BottomStart,
    ) {
        // Full-bleed artwork background with gradient fallback.
        if (artworkUrl.isNullOrBlank()) {
            ArtPlaceholder(
                colors = colors,
                modifier = Modifier.fillMaxSize(),
                shape = FreqShapes.cardLarge,
                iconSize = FreqSpacing.iconLg,
            )
        } else {
            SubcomposeAsyncImage(
                model = artworkUrl,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                // Top-priority crop: faces/subjects usually sit at the top
                // of artwork, so anchor there instead of center-cropping
                // them away.
                alignment = Alignment.TopCenter,
                modifier = Modifier.fillMaxSize(),
                loading = {
                    ArtPlaceholder(
                        colors = colors,
                        modifier = Modifier.fillMaxSize(),
                        shape = FreqShapes.cardLarge,
                        iconSize = FreqSpacing.iconLg,
                    )
                },
                error = {
                    ArtPlaceholder(
                        colors = colors,
                        modifier = Modifier.fillMaxSize(),
                        shape = FreqShapes.cardLarge,
                        iconSize = FreqSpacing.iconLg,
                    )
                },
                success = { SubcomposeAsyncImageContent() },
            )
        }
        // Neutral bottom scrim so overlay text stays legible on any art.
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            Color.Transparent,
                            Color.Black.copy(alpha = 0.55f),
                            Color.Black.copy(alpha = 0.82f),
                        ),
                    ),
                    FreqShapes.cardLarge,
                ),
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(FreqSpacing.md),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = eyebrow.uppercase(),
                    style = Typography.labelSmall,
                    color = Color.White.copy(alpha = 0.85f),
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(modifier = Modifier.height(FreqSpacing.xxs))
                Text(
                    text = title,
                    style = Typography.headlineLarge,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                if (!subtitle.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(FreqSpacing.xxs))
                    Text(
                        text = subtitle,
                        style = Typography.bodySmall,
                        color = Color.White.copy(alpha = 0.8f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            Spacer(modifier = Modifier.width(FreqSpacing.sm))
            // Solid white play action, dark icon — matches the artwork
            // treatment and stays legible on any background.
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(Color.White)
                    .clickable(
                        role = Role.Button,
                        indication = ripple(),
                        interactionSource = remember { MutableInteractionSource() },
                        onClickLabel = actionContentDescription,
                        onClick = onOpen,
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Default.PlayArrow,
                    contentDescription = null,
                    tint = Color(0xFF141824),
                    modifier = Modifier
                        .size(30.dp), // Optical centering
                )
            }
        }
    }
}
