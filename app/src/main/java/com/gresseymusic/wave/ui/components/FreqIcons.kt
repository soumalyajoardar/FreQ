package com.gresseymusic.wave.ui.components

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathFillType
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathBuilder
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.unit.dp

/**
 * Centralized, lightweight vector glyphs for FreQ (M24).
 *
 * Implemented with pure [ImageVector.Builder] so the application does not
 * depend on the heavy `material-icons-extended` dependency.
 */
object FreqIcons {

    private fun PathBuilder.disc(cx: Float, cy: Float, r: Float) {
        moveTo(cx + r, cy)
        arcTo(r, r, 0f, true, false, cx - r, cy)
        arcTo(r, r, 0f, true, false, cx + r, cy)
        close()
    }

    private fun PathBuilder.rayDot(cx: Float, cy: Float) {
        disc(cx, cy, 1.1f)
    }

    val Sun: ImageVector = ImageVector.Builder(
        name = "FreqSun",
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(fill = SolidColor(Color.White)) {
            disc(12f, 12f, 4f)
        }
        path(fill = SolidColor(Color.White)) {
            rayDot(12f, 3.4f)
            rayDot(12f, 20.6f)
            rayDot(3.4f, 12f)
            rayDot(20.6f, 12f)
            rayDot(5.9f, 5.9f)
            rayDot(18.1f, 18.1f)
            rayDot(18.1f, 5.9f)
            rayDot(5.9f, 18.1f)
        }
    }.build()

    val Moon: ImageVector = ImageVector.Builder(
        name = "FreqMoon",
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.White),
            pathFillType = PathFillType.EvenOdd,
        ) {
            disc(11f, 12f, 7f)
            disc(15f, 9f, 6.5f)
        }
    }.build()

    val SystemTheme: ImageVector = ImageVector.Builder(
        name = "FreqSystemTheme",
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            stroke = SolidColor(Color.White),
            strokeLineWidth = 1.8f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(7f, 3f)
            lineTo(17f, 3f)
            arcTo(2f, 2f, 0f, false, true, 19f, 5f)
            lineTo(19f, 19f)
            arcTo(2f, 2f, 0f, false, true, 17f, 21f)
            lineTo(7f, 21f)
            arcTo(2f, 2f, 0f, false, true, 5f, 19f)
            lineTo(5f, 5f)
            arcTo(2f, 2f, 0f, false, true, 7f, 3f)
            close()
        }
        path(fill = SolidColor(Color.White)) {
            disc(12f, 18f, 0.9f)
        }
    }.build()

    val Settings: ImageVector = ImageVector.Builder(
        name = "FreqSettings",
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        // Gear body with outer teeth and center hole
        path(
            stroke = SolidColor(Color.White),
            strokeLineWidth = 1.8f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(19.43f, 12.98f)
            arcTo(7.94f, 7.94f, 0f, false, false, 19.45f, 12f)
            arcTo(7.94f, 7.94f, 0f, false, false, 19.43f, 11.02f)
            lineTo(21.54f, 9.37f)
            arcTo(0.5f, 0.5f, 0f, false, false, 21.66f, 8.73f)
            lineTo(19.66f, 5.27f)
            arcTo(0.5f, 0.5f, 0f, false, false, 19.05f, 5.05f)
            lineTo(16.56f, 6.05f)
            arcTo(8.03f, 8.03f, 0f, false, false, 14.86f, 5.06f)
            lineTo(14.48f, 2.42f)
            arcTo(0.5f, 0.5f, 0f, false, false, 13.99f, 2f)
            lineTo(10.01f, 2f)
            arcTo(0.5f, 0.5f, 0f, false, false, 9.52f, 2.42f)
            lineTo(9.14f, 5.06f)
            arcTo(8.03f, 8.03f, 0f, false, false, 7.44f, 6.05f)
            lineTo(4.95f, 5.05f)
            arcTo(0.5f, 0.5f, 0f, false, false, 4.34f, 5.27f)
            lineTo(2.34f, 8.73f)
            arcTo(0.5f, 0.5f, 0f, false, false, 2.46f, 9.37f)
            lineTo(4.57f, 11.02f)
            arcTo(7.94f, 7.94f, 0f, false, false, 4.55f, 12f)
            arcTo(7.94f, 7.94f, 0f, false, false, 4.57f, 12.98f)
            lineTo(2.46f, 14.63f)
            arcTo(0.5f, 0.5f, 0f, false, false, 2.34f, 15.27f)
            lineTo(4.34f, 18.73f)
            arcTo(0.5f, 0.5f, 0f, false, false, 4.95f, 18.95f)
            lineTo(7.44f, 17.95f)
            arcTo(8.03f, 8.03f, 0f, false, false, 9.14f, 18.94f)
            lineTo(9.52f, 21.58f)
            arcTo(0.5f, 0.5f, 0f, false, false, 10.01f, 22f)
            lineTo(13.99f, 22f)
            arcTo(0.5f, 0.5f, 0f, false, false, 14.48f, 21.58f)
            lineTo(14.86f, 18.94f)
            arcTo(8.03f, 8.03f, 0f, false, false, 16.56f, 17.95f)
            lineTo(19.05f, 18.95f)
            arcTo(0.5f, 0.5f, 0f, false, false, 19.66f, 18.73f)
            lineTo(21.66f, 15.27f)
            arcTo(0.5f, 0.5f, 0f, false, false, 21.54f, 14.63f)
            close()
        }
        path(fill = SolidColor(Color.White)) {
            disc(12f, 12f, 3f)
        }
    }.build()

    val Info: ImageVector = ImageVector.Builder(
        name = "FreqInfo",
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            stroke = SolidColor(Color.White),
            strokeLineWidth = 1.8f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            disc(12f, 12f, 9f)
        }
        path(fill = SolidColor(Color.White)) {
            disc(12f, 8f, 1.2f)
        }
        path(
            stroke = SolidColor(Color.White),
            strokeLineWidth = 1.8f,
            strokeLineCap = StrokeCap.Round,
        ) {
            moveTo(12f, 11.5f)
            lineTo(12f, 16.5f)
        }
    }.build()

    val ChevronRight: ImageVector = ImageVector.Builder(
        name = "FreqChevronRight",
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            stroke = SolidColor(Color.White),
            strokeLineWidth = 2f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(9f, 6f)
            lineTo(15f, 12f)
            lineTo(9f, 18f)
        }
    }.build()

    val AudioWave: ImageVector = ImageVector.Builder(
        name = "FreqAudioWave",
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            stroke = SolidColor(Color.White),
            strokeLineWidth = 2f,
            strokeLineCap = StrokeCap.Round,
        ) {
            moveTo(4f, 10f)
            lineTo(4f, 14f)
            moveTo(8f, 7f)
            lineTo(8f, 17f)
            moveTo(12f, 4f)
            lineTo(12f, 20f)
            moveTo(16f, 8f)
            lineTo(16f, 16f)
            moveTo(20f, 11f)
            lineTo(20f, 13f)
        }
    }.build()

    val Storage: ImageVector = ImageVector.Builder(
        name = "FreqStorage",
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            stroke = SolidColor(Color.White),
            strokeLineWidth = 1.8f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            // Top disk
            moveTo(4f, 6f)
            arcTo(8f, 3f, 0f, false, true, 20f, 6f)
            arcTo(8f, 3f, 0f, false, true, 4f, 6f)
            // Middle tier
            moveTo(4f, 6f)
            lineTo(4f, 12f)
            arcTo(8f, 3f, 0f, false, false, 20f, 12f)
            lineTo(20f, 6f)
            // Bottom tier
            moveTo(4f, 12f)
            lineTo(4f, 18f)
            arcTo(8f, 3f, 0f, false, false, 20f, 18f)
            lineTo(20f, 12f)
        }
    }.build()

    val Clean: ImageVector = ImageVector.Builder(
        name = "FreqClean",
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            stroke = SolidColor(Color.White),
            strokeLineWidth = 1.8f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(15f, 4f)
            lineTo(20f, 9f)
            moveTo(18f, 6f)
            lineTo(10f, 14f)
            moveTo(7f, 17f)
            lineTo(13f, 11f)
            moveTo(3f, 21f)
            lineTo(7f, 17f)
            lineTo(9f, 19f)
            lineTo(5f, 21f)
            close()
        }
    }.build()

    val Check: ImageVector = ImageVector.Builder(
        name = "FreqCheck",
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            stroke = SolidColor(Color.White),
            strokeLineWidth = 2.2f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(4f, 12f)
            lineTo(9.5f, 17.5f)
            lineTo(20f, 7f)
        }
    }.build()

    val Mic: ImageVector = ImageVector.Builder(
        name = "FreqMic",
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        // Capsule head: stadium via two arcs.
        path(fill = SolidColor(Color.White)) {
            moveTo(9.5f, 9.5f)
            lineTo(9.5f, 5.5f)
            arcTo(2.5f, 2.5f, 0f, false, true, 14.5f, 5.5f)
            lineTo(14.5f, 9.5f)
            arcTo(2.5f, 2.5f, 0f, false, true, 9.5f, 9.5f)
            close()
        }
        // Cradle + stem + base, one stroked path.
        path(
            stroke = SolidColor(Color.White),
            strokeLineWidth = 1.8f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(7f, 11f)
            arcTo(5f, 5f, 0f, false, false, 17f, 11f)
            moveTo(12f, 16f)
            lineTo(12f, 19.5f)
            moveTo(9f, 19.5f)
            lineTo(15f, 19.5f)
        }
    }.build()

    val Speaker: ImageVector = ImageVector.Builder(
        name = "FreqSpeaker",
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        // Cone body.
        path(fill = SolidColor(Color.White)) {
            moveTo(3.5f, 9.5f)
            lineTo(7f, 9.5f)
            lineTo(12f, 4.5f)
            lineTo(12f, 19.5f)
            lineTo(7f, 14.5f)
            lineTo(3.5f, 14.5f)
            close()
        }
        // Radiating waves.
        path(
            stroke = SolidColor(Color.White),
            strokeLineWidth = 1.8f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(14.5f, 9f)
            arcTo(3.5f, 3.5f, 0f, false, true, 14.5f, 15f)
            moveTo(16.5f, 6.5f)
            arcTo(6f, 6f, 0f, false, true, 16.5f, 17.5f)
        }
    }.build()

    val Headphones: ImageVector = ImageVector.Builder(
        name = "FreqHeadphones",
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        // Headband.
        path(
            stroke = SolidColor(Color.White),
            strokeLineWidth = 1.8f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(4.5f, 16f)
            arcTo(7.5f, 7.5f, 0f, false, false, 19.5f, 16f)
        }
        // Ear pads: filled rounded rects.
        path(fill = SolidColor(Color.White)) {
            moveTo(3.5f, 18.5f)
            lineTo(3.5f, 14.5f)
            arcTo(1.2f, 1.2f, 0f, false, true, 5.9f, 14.5f)
            lineTo(5.9f, 18.5f)
            arcTo(1.2f, 1.2f, 0f, false, true, 3.5f, 18.5f)
            close()
            moveTo(18.1f, 18.5f)
            lineTo(18.1f, 14.5f)
            arcTo(1.2f, 1.2f, 0f, false, true, 20.5f, 14.5f)
            lineTo(20.5f, 18.5f)
            arcTo(1.2f, 1.2f, 0f, false, true, 18.1f, 18.5f)
            close()
        }
    }.build()

    val Bluetooth: ImageVector = ImageVector.Builder(
        name = "FreqBluetooth",
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        // Runic mark: stem + two right-pointing triangles.
        path(
            stroke = SolidColor(Color.White),
            strokeLineWidth = 1.8f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(12f, 5f)
            lineTo(12f, 19f)
            moveTo(12f, 5f)
            lineTo(18f, 8.5f)
            lineTo(12f, 12f)
            moveTo(12f, 12f)
            lineTo(18f, 15.5f)
            lineTo(12f, 19f)
        }
    }.build()

    val Shuffle: ImageVector = ImageVector.Builder(
        name = "FreqShuffle",
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(fill = SolidColor(Color.White)) {
            // Crossed-arrows shuffle glyph (Material shuffle geometry).
            moveTo(10.59f, 9.17f)
            lineTo(5.41f, 4f)
            lineTo(4f, 5.41f)
            lineTo(9.17f, 10.58f)
            lineTo(10.59f, 9.17f)
            close()
            moveTo(14.5f, 4f)
            lineTo(16.54f, 6.04f)
            lineTo(4f, 18.59f)
            lineTo(5.41f, 20f)
            lineTo(17.96f, 7.46f)
            lineTo(20f, 9.5f)
            lineTo(20f, 4f)
            lineTo(14.5f, 4f)
            close()
            moveTo(14.83f, 13.41f)
            lineTo(13.42f, 14.82f)
            lineTo(16.55f, 17.95f)
            lineTo(14.5f, 20f)
            lineTo(20f, 20f)
            lineTo(20f, 14.5f)
            lineTo(17.96f, 16.54f)
            lineTo(14.83f, 13.41f)
            close()
        }
    }.build()
}
