package com.gresseymusic.wave.player

import android.media.AudioDeviceInfo

/**
 * Audio output route (M28g): where the user is currently listening —
 * phone speaker, wired headphones, or Bluetooth. Shown as a live chip in
 * Now Playing; unplug auto-pause was already handled by ExoPlayer's
 * noisy-audio handling.
 *
 * [audioRouteForTypes] is pure over device-type ints (compile-time
 * constants, JVM-test safe) and unit-tested.
 */
enum class AudioRoute {
    SPEAKER,
    WIRED,
    BLUETOOTH,
}

/**
 * Maps active output device types to a route. Bluetooth wins over wired
 * (an A2DP device present means audio goes there), wired wins over the
 * built-in speaker. Unknown/empty sets read as speaker. Pure.
 */
fun audioRouteForTypes(deviceTypes: Set<Int>): AudioRoute {
    if (deviceTypes.any {
            it == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
                it == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
                it == AudioDeviceInfo.TYPE_BLE_HEADSET ||
                it == AudioDeviceInfo.TYPE_BLE_SPEAKER ||
                it == AudioDeviceInfo.TYPE_HEARING_AID
        }
    ) {
        return AudioRoute.BLUETOOTH
    }
    if (deviceTypes.any {
            it == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
                it == AudioDeviceInfo.TYPE_WIRED_HEADPHONES ||
                it == AudioDeviceInfo.TYPE_USB_HEADSET
        }
    ) {
        return AudioRoute.WIRED
    }
    return AudioRoute.SPEAKER
}

/** UI label for [route]. Pure. */
fun audioRouteLabel(route: AudioRoute): String {
    return when (route) {
        AudioRoute.SPEAKER -> "Speaker"
        AudioRoute.WIRED -> "Headphones"
        AudioRoute.BLUETOOTH -> "Bluetooth"
    }
}
