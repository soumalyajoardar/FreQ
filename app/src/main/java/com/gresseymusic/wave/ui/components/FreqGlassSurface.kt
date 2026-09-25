package com.gresseymusic.wave.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import dev.chrisbanes.haze.hazeEffect
import dev.chrisbanes.haze.HazeStyle
import dev.chrisbanes.haze.HazeTint
import com.gresseymusic.wave.ui.theme.LocalHazeState

import com.gresseymusic.wave.ui.theme.FreqElevation
import com.gresseymusic.wave.ui.theme.FreqGlassTone
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.glassStyleFor

/**
 * Core FreQ glass surface (M15 / M27).
 *
 * Apple-style frosted glass: a strong Gaussian backdrop blur (Haze) melted
 * into a translucent tonal bed, plus a soft top-down light-diffusion wash
 * and a soft drop shadow. Floating shell surfaces (mini player, bottom bar,
 * buttons) read as frosted glass over any content.
 *
 * @param tone glass strength from the [FreqGlassTone] hierarchy.
 * @param shape surface geometry; defaults to the large card radius.
 * @param shadow optional override; [FreqElevation.none] disables lift.
 * @param blur Gaussian blur radius; defaults to 30.dp for Floating tone.
 * @param contentAlignment alignment of children within the surface Box; defaults to [Alignment.TopStart].
 */
@Composable
fun FreqGlassSurface(
    modifier: Modifier = Modifier,
    tone: FreqGlassTone = FreqGlassTone.Standard,
    shape: Shape = FreqShapes.cardLarge,
    shadow: Dp? = null,
    blur: Dp = if (tone == FreqGlassTone.Floating) 48.dp else 0.dp,
    glassBackend: FreqGlassBackend = FreqGlassBackend.HAZE,
    contentAlignment: Alignment = Alignment.TopStart,
    content: @Composable BoxScope.() -> Unit,
) {
    // PrismalAGSL spike: liquid glass for the floating capsules. Falls
    // back to the Haze path when no Prismal backdrop is provided.
    if (glassBackend == FreqGlassBackend.PRISMAL) {
        val prismalBackdrop = LocalPrismalBackdrop.current
        if (prismalBackdrop != null) {
            PrismalCapsuleSurface(
                modifier = modifier,
                backdrop = prismalBackdrop,
                shape = shape,
                shadow = shadow,
                contentAlignment = contentAlignment,
                content = content,
            )
            return
        }
    }
    val colors = FreqTheme.colors
    val style = remember(tone, colors) { glassStyleFor(tone, colors) }
    // Light-diffusion wash: bright at the top edge, melting into the
    // fill. Blurred so the falloff reads as diffused light, not a hard
    // gradient stop.
    val diffusion = remember(style) {
        Brush.verticalGradient(
            0.0f to Color.White.copy(alpha = 0.12f),
            0.35f to Color.White.copy(alpha = 0.03f),
            0.6f to Color.Transparent,
        )
    }
    // Gaussian frosted-glass recipe for floating capsules (mini player,
    // bottom bar): a strong Gaussian backdrop blur that dominates the
    // mix, melted into a light translucent bed with a whisper white
    // sheen — Apple frost. The bed stays translucent on purpose so the
    // blurred backdrop, not flat darkness, carries the frosted read.
    val frost = remember(style, blur) {
        HazeStyle(
            backgroundColor = Color(0xFF14161F).copy(alpha = 0.30f),
            tints = listOf(HazeTint(Color.White.copy(alpha = 0.10f))),
            blurRadius = blur,
        )
    }
    val shadowElevation = shadow ?: style.shadow
    Box(
        modifier = modifier
            .then(
                if (shadowElevation > FreqElevation.none) {
                    Modifier.shadow(
                        elevation = shadowElevation,
                        shape = shape,
                        ambientColor = Color.Black,
                        spotColor = Color.Black,
                    )
                } else {
                    Modifier
                },
            )
            .clip(shape),
        contentAlignment = contentAlignment,
    ) {
        // Frosted glass background layer (blurred for floating/frosted tone)
        val hazeState = LocalHazeState.current
        Box(
            modifier = Modifier
                .matchParentSize()
                .then(
                    if (hazeState != null && blur > 0.dp) {
                        Modifier.hazeEffect(state = hazeState, style = frost)
                    } else {
                        Modifier
                    }
                )
                .background(style.fill)
                .background(
                    brush = diffusion,
                    shape = shape,
                ),
        )

        // Crisp foreground content
        content()
    }
}

/**
 * PrismalAGSL liquid-glass strip for thin tracks (seekbar timeline).
 * Background-only lens: callers draw fill/thumb crisply on top.
 */
@Composable
internal fun PrismalTrackGlass(
    backdrop: com.styropyr0.prismal.PrismalBackdrop,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier.clip(FreqShapes.pill),
    ) {
        com.styropyr0.prismal.PrismalGlassSurface(
            backdrop = backdrop,
            shape = { com.styropyr0.prismal.shapes.PrismalCapsule() },
            blurRadius = 16.dp,
            modifier = Modifier.matchParentSize(),
        ) {
        }
    }
}

/**
 * PrismalAGSL liquid-glass surface (spike). Samples the shared Prismal
 * backdrop with a capsule/circular lens: strong Gaussian blur + edge
 * refraction + specular, no Haze involved.
 */
@Composable
private fun PrismalCapsuleSurface(
    modifier: Modifier = Modifier,
    backdrop: com.styropyr0.prismal.PrismalBackdrop,
    shape: Shape = FreqShapes.pill,
    shadow: Dp? = null,
    contentAlignment: Alignment = Alignment.TopStart,
    content: @Composable BoxScope.() -> Unit,
) {
    // Circular bounds get a capsule lens (renders circular); pills get a
    // capsule; the player card keeps its top-rounded lens; squares stay
    // perfectly square; anything else falls back to a rounded rect lens.
    val isSquare = shape == RectangleShape
    val prismalShape: () -> Shape = {
        if (shape == FreqShapes.pill || shape == FreqShapes.circle) {
            com.styropyr0.prismal.shapes.PrismalCapsule()
        } else if (shape == FreqShapes.playerCard) {
            com.styropyr0.prismal.shapes.PrismalRoundedRectangle(20.dp)
        } else if (isSquare) {
            com.styropyr0.prismal.shapes.PrismalRoundedRectangle(0.dp)
        } else {
            com.styropyr0.prismal.shapes.PrismalRoundedRectangle(20.dp)
        }
    }
    val clipShape: Shape = if (shape == FreqShapes.pill || shape == FreqShapes.circle) {
        FreqShapes.pill
    } else if (shape == FreqShapes.playerCard) {
        FreqShapes.playerCard
    } else if (isSquare) {
        RectangleShape
    } else {
        FreqShapes.cardLarge
    }
    Box(
        modifier = modifier
            .then(
                if ((shadow ?: FreqElevation.floating) > FreqElevation.none) {
                    Modifier.shadow(
                        elevation = shadow ?: FreqElevation.floating,
                        shape = clipShape,
                        ambientColor = Color.Black,
                        spotColor = Color.Black,
                    )
                } else {
                    Modifier
                },
            )
            .clip(clipShape),
        contentAlignment = contentAlignment,
    ) {
        // Liquid-glass background layer only — content stays a direct
        // sibling (like the Haze path) so capsule sizing comes from the
        // real content and controls stay crisp above the glass. The dark
        // tint veils the sampled backdrop so text behind can never show
        // through, while the blur still nuances the frost.
        com.styropyr0.prismal.PrismalGlassSurface(
            backdrop = backdrop,
            shape = prismalShape,
            blurRadius = 30.dp,
            tint = Color(0xFF101218),
            tintAlpha = 0.55f,
            modifier = Modifier.matchParentSize(),
        ) {
        }
        content()
    }
}
