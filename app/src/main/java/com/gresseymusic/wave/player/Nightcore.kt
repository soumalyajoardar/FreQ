package com.gresseymusic.wave.player

/**
 * Playback flavors (M28): a three-state switch replacing the old
 * playback-speed control.
 *
 * - Normal: 1.0x speed, 1.0x pitch, no reverb.
 * - SnR (slowed + reverb): 0.8x speed, 0.8x pitch (pitched down),
 *   50% reverb send.
 * - Nightcore (sped up): 1.2x speed, 1.2x pitch, no reverb.
 *
 * Speed + pitch are applied to the Media3 player via
 * `setPlaybackParameters` (pitch follows tempo, not time-stretched).
 * Reverb is applied best-effort as an auxiliary-effect send level
 * (0.5 = 50%) for SnR only; devices without aux-effect routing still get
 * the exact pitched audio and the honest state flag. Pure helpers below
 * are unit-testable.
 */

/** Playback flavor. Defaults to [NORMAL]. */
enum class AudioMode {
    NORMAL,
    SNR,
    NIGHTCORE,
}

/** Playback speed for normal listening. */
const val NORMAL_SPEED = 1.0f

/** Playback speed for SnR (pitched-down flavor). */
const val SNR_SPEED = 0.8f

/** Playback speed for Nightcore (sped-up flavor). */
const val NIGHTCORE_SPEED = 1.2f

/** Playback pitch for normal listening. */
const val NORMAL_PITCH = 1.0f

/** Playback pitch for SnR (pitched down with the tempo). */
const val SNR_PITCH = 0.8f

/** Playback pitch for Nightcore (pitched up with the tempo). */
const val NIGHTCORE_PITCH = 1.2f

/** Reverb send level for SnR (50%). */
const val SNR_REVERB_SEND = 0.5f

/** Reverb send level for dry modes (Normal, Nightcore). */
const val NO_REVERB_SEND = 0f

/** Effective player speed for [mode]. Pure. */
fun audioSpeed(mode: AudioMode): Float {
    return when (mode) {
        AudioMode.NORMAL -> NORMAL_SPEED
        AudioMode.SNR -> SNR_SPEED
        AudioMode.NIGHTCORE -> NIGHTCORE_SPEED
    }
}

/** Effective player pitch for [mode]. Pure. */
fun audioPitch(mode: AudioMode): Float {
    return when (mode) {
        AudioMode.NORMAL -> NORMAL_PITCH
        AudioMode.SNR -> SNR_PITCH
        AudioMode.NIGHTCORE -> NIGHTCORE_PITCH
    }
}

/** Effective reverb send (0..1) for [mode]. Pure. */
fun audioReverbSend(mode: AudioMode): Float {
    return when (mode) {
        AudioMode.NORMAL -> NO_REVERB_SEND
        AudioMode.SNR -> SNR_REVERB_SEND
        AudioMode.NIGHTCORE -> NO_REVERB_SEND
    }
}

/** UI label for [mode]. Pure. */
fun audioLabel(mode: AudioMode): String {
    return when (mode) {
        AudioMode.NORMAL -> "Normal"
        AudioMode.SNR -> "SnR"
        AudioMode.NIGHTCORE -> "Nightcore"
    }
}
