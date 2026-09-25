package com.gresseymusic.wave.player

import android.media.AudioDeviceInfo
import org.junit.Assert.*
import org.junit.Test

class AudioRouteTest {

    @Test
    fun `empty and speaker default to speaker`() {
        assertEquals(AudioRoute.SPEAKER, audioRouteForTypes(emptySet()))
        assertEquals(
            AudioRoute.SPEAKER,
            audioRouteForTypes(setOf(AudioDeviceInfo.TYPE_BUILTIN_SPEAKER)),
        )
    }

    @Test
    fun `wired devices map to headphones`() {
        assertEquals(
            AudioRoute.WIRED,
            audioRouteForTypes(setOf(AudioDeviceInfo.TYPE_WIRED_HEADSET)),
        )
        assertEquals(
            AudioRoute.WIRED,
            audioRouteForTypes(setOf(AudioDeviceInfo.TYPE_WIRED_HEADPHONES)),
        )
        assertEquals(
            AudioRoute.WIRED,
            audioRouteForTypes(setOf(AudioDeviceInfo.TYPE_USB_HEADSET)),
        )
    }

    @Test
    fun `bluetooth devices map to bluetooth`() {
        assertEquals(
            AudioRoute.BLUETOOTH,
            audioRouteForTypes(setOf(AudioDeviceInfo.TYPE_BLUETOOTH_A2DP)),
        )
        assertEquals(
            AudioRoute.BLUETOOTH,
            audioRouteForTypes(setOf(AudioDeviceInfo.TYPE_BLE_HEADSET)),
        )
    }

    @Test
    fun `bluetooth wins over wired and speaker`() {
        assertEquals(
            AudioRoute.BLUETOOTH,
            audioRouteForTypes(
                setOf(
                    AudioDeviceInfo.TYPE_BUILTIN_SPEAKER,
                    AudioDeviceInfo.TYPE_WIRED_HEADSET,
                    AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
                ),
            ),
        )
    }

    @Test
    fun `labels read correctly`() {
        assertEquals("Speaker", audioRouteLabel(AudioRoute.SPEAKER))
        assertEquals("Headphones", audioRouteLabel(AudioRoute.WIRED))
        assertEquals("Bluetooth", audioRouteLabel(AudioRoute.BLUETOOTH))
    }
}
