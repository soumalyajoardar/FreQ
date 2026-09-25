package com.gresseymusic.wave.ui.components

import com.gresseymusic.wave.R
import org.junit.Assert.*
import org.junit.Test

class TimeBackgroundTest {

    @Test
    fun `morning maps to sunrise scene`() {
        assertEquals(R.drawable.app_background_morning, backgroundResForHour(5))
        assertEquals(R.drawable.app_background_morning, backgroundResForHour(11))
    }

    @Test
    fun `afternoon maps to day scene`() {
        assertEquals(R.drawable.app_background_afternoon, backgroundResForHour(12))
        assertEquals(R.drawable.app_background_afternoon, backgroundResForHour(17))
    }

    @Test
    fun `evening maps to sunset scene`() {
        assertEquals(R.drawable.app_background_evening, backgroundResForHour(18))
        assertEquals(R.drawable.app_background_evening, backgroundResForHour(22))
    }

    @Test
    fun `night wraps past midnight`() {
        assertEquals(R.drawable.app_background_night, backgroundResForHour(23))
        assertEquals(R.drawable.app_background_night, backgroundResForHour(0))
        assertEquals(R.drawable.app_background_night, backgroundResForHour(4))
    }

    @Test
    fun `out-of-range hours clamp`() {
        assertEquals(R.drawable.app_background_night, backgroundResForHour(-3))
        assertEquals(R.drawable.app_background_night, backgroundResForHour(99))
    }

    @Test
    fun `tint is a valid alpha fraction`() {
        assertTrue(BACKGROUND_TINT_ALPHA in 0f..1f)
    }
}
