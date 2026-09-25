package com.gresseymusic.wave.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
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