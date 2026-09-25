package com.gresseymusic.wave.ui.theme

import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.dp

/**
 * FreQ geometry language (M15). Recognizably rounded, fully rounded pills
 * for controls, generous radii for cards and artwork. One source — no
 * ad-hoc corner radii in screens.
 */
object FreqShapes {
    val chip: RoundedCornerShape = RoundedCornerShape(100.dp)
    val button: RoundedCornerShape = RoundedCornerShape(100.dp)
    val buttonIcon: Shape = CircleShape
    val card: RoundedCornerShape = RoundedCornerShape(16.dp)
    val cardLarge: RoundedCornerShape = RoundedCornerShape(20.dp)
    /**
     * Rail media cards (M28h): rounded upper corners, 0px bottom corners
     * so the trailing subtitle line is never clipped by the corner curve.
     */
    val mediaCard: RoundedCornerShape = RoundedCornerShape(
        topStart = 16.dp,
        topEnd = 16.dp,
        bottomStart = 0.dp,
        bottomEnd = 0.dp,
    )
    val artwork: RoundedCornerShape = RoundedCornerShape(12.dp)
    val artworkSmall: RoundedCornerShape = RoundedCornerShape(10.dp)
    val sheet: RoundedCornerShape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)
    val dialog: RoundedCornerShape = RoundedCornerShape(24.dp)
    val floating: RoundedCornerShape = RoundedCornerShape(20.dp)
    /**
     * Mini-player card (M28f): rounded upper corners like [floating],
     * square bottom corners so the lower (artist) line is never clipped
     * by the corner curve.
     */
    val playerCard: RoundedCornerShape = RoundedCornerShape(
        topStart = 20.dp,
        topEnd = 20.dp,
        bottomStart = 0.dp,
        bottomEnd = 0.dp,
    )
    val pill: RoundedCornerShape = RoundedCornerShape(100.dp)
    val circle: Shape = CircleShape
}

/** Material3 slot mapping so stock components inherit FreQ geometry. */
val FreqMaterialShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(20.dp),
    extraLarge = RoundedCornerShape(28.dp),
)
