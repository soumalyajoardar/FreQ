package com.gresseymusic.wave.player

import org.junit.Assert.*
import org.junit.Test

/**
 * PlaybackState default-value regression tests (M12 Area 11).
 * A neutral initial state must not claim playback progress, playback, or
 * loading before anything has played.
 */
class PlaybackStateDefaultsTest {

    @Test
    fun `default progress is zero, not a stale position`() {
        assertEquals(0f, PlaybackState().progressSeconds, 0f)
    }

    @Test
    fun `default state is idle with no track`() {
        val state = PlaybackState()
        assertNull(state.currentTrack)
        assertFalse(state.isPlaying)
        assertFalse(state.isLoading)
        assertFalse(state.isFavorite)
        assertFalse(state.shuffleEnabled)
        assertEquals(0, state.repeatMode)
        assertTrue(state.queue.isEmpty())
        assertEquals(0, state.currentQueueIndex)
        assertNull(state.playbackError)
    }

    @Test
    fun `derived fields degrade gracefully without a track`() {
        val state = PlaybackState()
        assertEquals("", state.currentArtist)
        assertEquals("", state.currentAlbum)
        assertEquals(0, state.durationSeconds)
        assertNull(state.nextTrack)
    }

    @Test
    fun `derived fields follow current track`() {
        val track = MediaTrack(
            id = "v1",
            title = "Song",
            artist = "Singer",
            album = "Record",
            durationSeconds = 200,
        )
        val state = PlaybackState(currentTrack = track)
        assertEquals("Singer", state.currentArtist)
        assertEquals("Record", state.currentAlbum)
        assertEquals(200, state.durationSeconds)
    }

    @Test
    fun `next track wraps within queue bounds`() {
        val a = MediaTrack(id = "a", title = "A", artist = "X", album = "Y")
        val b = MediaTrack(id = "b", title = "B", artist = "X", album = "Y")
        assertEquals("b", PlaybackState(queue = listOf(a, b), currentQueueIndex = 0).nextTrack?.id)
        // Single-track queue: the only available next is the track itself.
        assertEquals("a", PlaybackState(queue = listOf(a), currentQueueIndex = 0).nextTrack?.id)
    }

    @Test
    fun `state transitions preserve unrelated fields`() {
        // Documents the copy contract the UI relies on: updating playback
        // flags must not disturb queue, shuffle, repeat, or error state.
        val track = MediaTrack(id = "v1", title = "Song", artist = "Singer", album = "Record")
        val state = PlaybackState(
            currentTrack = track,
            queue = listOf(track),
            currentQueueIndex = 0,
            shuffleEnabled = true,
            repeatMode = 1,
        )
        val playing = state.copy(isPlaying = true, isLoading = false, progressSeconds = 12.5f)
        assertEquals(track, playing.currentTrack)
        assertEquals(listOf(track), playing.queue)
        assertEquals(0, playing.currentQueueIndex)
        assertTrue(playing.shuffleEnabled)
        assertEquals(1, playing.repeatMode)
        assertNull(playing.playbackError)
        assertTrue(playing.isPlaying)
        assertEquals(12.5f, playing.progressSeconds, 0f)
    }

    @Test
    fun `error state carries message without implying playback`() {
        val state = PlaybackState(isPlaying = false, playbackError = "Streaming not available")
        assertEquals("Streaming not available", state.playbackError)
        assertFalse(state.isPlaying)
        assertFalse(state.isLoading)
    }
}
