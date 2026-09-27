package com.gresseymusic.wave.ui.components

import android.os.Build
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.window.DialogWindowProvider
import com.gresseymusic.wave.ui.theme.FreqGlassTone
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.theme.FreqSpacing


/**
 * FreQ dialog surface (M15). Floating glass with the dialog radius and
 * modal shadow; wraps dialog content without dictating layout.
 */
@Composable
fun FreqDialogSurface(
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit,
) {
    FreqGlassSurface(
        modifier = modifier,
        tone = FreqGlassTone.Floating,
        shape = FreqShapes.dialog,
    ) {
        Box(modifier = Modifier.padding(FreqSpacing.dialogPadding)) {
            content()
        }
    }
}

/**
 * Blurs everything behind a dialog window (M28x). Uses the platform
 * background-blur API (Android 12+); older releases keep the standard
 * dim with no blur. Must be called inside the dialog's content so
 * [LocalView] resolves to the dialog window — outside it is a harmless
 * no-op. Never throws.
 */
@Composable
fun ApplyDialogBackgroundBlur(radiusPx: Int = 80) {
    val view = LocalView.current
    LaunchedEffect(view) {
        try {
            val window = (view.parent as? DialogWindowProvider)?.window ?: return@LaunchedEffect
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                window.setBackgroundBlurRadius(radiusPx)
            }
        } catch (_: Exception) {
        }
    }
}