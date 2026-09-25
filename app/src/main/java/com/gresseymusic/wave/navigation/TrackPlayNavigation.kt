package com.gresseymusic.wave.navigation

/**
 * M27 track-tap → Now Playing guard. Pure and unit-tested.
 *
 * Rules:
 * - Never navigate before playback has been accepted by PlaybackManager
 *   ([playbackAccepted] false → no navigation).
 * - Never stack duplicate Now Playing destinations (already on
 *   "now_playing" → no navigation).
 * - Navigation is triggered exactly once from the explicit tap handler —
 *   never from playback-state observers — so recomposition cannot emit
 *   duplicate events and no navigation loop is possible.
 */
fun shouldOpenNowPlaying(
    currentRoute: String?,
    playbackAccepted: Boolean,
): Boolean {
    if (!playbackAccepted) return false
    if (currentRoute == "now_playing") return false
    return true
}
