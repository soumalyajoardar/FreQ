package com.gresseymusic.wave.player

import org.junit.Assert.*
import org.junit.Test

class NightcoreTest {

    @Test
    fun `normal mode is 1x 1x dry`() {
        assertEquals(1.0f, audioSpeed(AudioMode.NORMAL), 0f)
        assertEquals(1.0f, audioPitch(AudioMode.NORMAL), 0f)
        assertEquals(0f, audioReverbSend(AudioMode.NORMAL), 0f)
        assertEquals("Normal", audioLabel(AudioMode.NORMAL))
    }

    @Test
    fun `snr mode is pitched down to 0_8x with 50 percent reverb`() {
        assertEquals(0.8f, audioSpeed(AudioMode.SNR), 0f)
        assertEquals(0.8f, audioPitch(AudioMode.SNR), 0f)
        assertEquals(0.5f, audioReverbSend(AudioMode.SNR), 0f)
        assertEquals("SnR", audioLabel(AudioMode.SNR))
    }

    @Test
    fun `nightcore mode is pitched up to 1_2x dry`() {
        assertEquals(1.2f, audioSpeed(AudioMode.NIGHTCORE), 0f)
        assertEquals(1.2f, audioPitch(AudioMode.NIGHTCORE), 0f)
        assertEquals(0f, audioReverbSend(AudioMode.NIGHTCORE), 0f)
        assertEquals("Nightcore", audioLabel(AudioMode.NIGHTCORE))
    }

    @Test
    fun `playback state defaults to normal`() {
        assertEquals(AudioMode.NORMAL, PlaybackState().audioMode)
    }
}
