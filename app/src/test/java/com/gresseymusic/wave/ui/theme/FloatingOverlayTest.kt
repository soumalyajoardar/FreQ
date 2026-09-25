package com.gresseymusic.wave.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.unit.dp
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Floating-controls overlay contract (M27.6 CORRECTION).
 *
 * The Mini Player + Bottom Navigation are a pure overlay above full-screen
 * content — Scaffold must NOT reserve a bottom content region for them.
 * Scrollable screens therefore carry bottom CONTENT padding
 * ([FreqSpacing.miniPlayerClearance]) so final items scroll above the
 * overlay. That padding must exceed the stacked overlay height (mini +
 * nav + gesture inset, measured ~150dp on device) with margin, or the
 * last content row would tuck under the Mini Player at max scroll.
 */
class FloatingOverlayTest {

    @Test
    fun `bottom content padding exceeds stacked overlay plus margin`() {
        val stackedOverlay = FreqSpacing.miniPlayerHeight + FreqSpacing.bottomBarHeight
        assertTrue(
            "miniPlayerClearance must clear mini + nav + margin",
            FreqSpacing.miniPlayerClearance >= stackedOverlay + 24.dp,
        )
    }

    @Test
    fun `overlay component heights stay within clearance budget`() {
        // Sanity bounds so a future height change forces a clearance review.
        assertTrue(FreqSpacing.miniPlayerHeight <= 96.dp)
        assertTrue(FreqSpacing.bottomBarHeight <= 112.dp)
        assertTrue(FreqSpacing.miniPlayerClearance <= 240.dp)
    }

    @Test
    fun `mini player is a slightly rounded rectangle not a pill`() {
        // M27.6: rectangular card geometry — visibly rounded but far from pill.
        assertEquals(RoundedCornerShape(20.dp), FreqShapes.floating)
        assertNotEquals(RoundedCornerShape(100.dp), FreqShapes.floating)
    }
}
