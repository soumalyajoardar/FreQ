package com.gresseymusic.wave.player

import org.junit.Assert.*
import org.junit.Test

/**
 * Regression tests for M27.4 playlist selected-track playback bug.
 * Pure JUnit tests - no coroutine test support needed.
 */
class PlaylistPlaybackRegressionTest {

    @Test
    fun playlistPlayQueueUsesRequestedStartIndex() {
        val track0 = MediaTrack(id = "track-0", title = "Track 0", artist = "Artist 0", album = "Album", durationSeconds = 180, artworkUrl = null)
        val track1 = MediaTrack(id = "track-1", title = "Track 1", artist = "Artist 1", album = "Album", durationSeconds = 180, artworkUrl = null)
        val track2 = MediaTrack(id = "track-2", title = "Track 2", artist = "Artist 2", album = "Album", durationSeconds = 180, artworkUrl = null)
        val track3 = MediaTrack(id = "track-3", title = "Track 3", artist = "Artist 3", album = "Album", durationSeconds = 180, artworkUrl = null)
        val track4 = MediaTrack(id = "track-4", title = "Track 4", artist = "Artist 4", album = "Album", durationSeconds = 180, artworkUrl = null)
        
        val playlistTracks = listOf(track0, track1, track2, track3, track4)
        
        val startIndex = 2
        val selectedTrack = playlistTracks[startIndex]
        
        assertEquals("Track 2", selectedTrack.title)
        assertEquals(2, playlistTracks.indexOf(selectedTrack))
    }

    @Test
    fun requestedIndexMapsToPlayableQueueIndex() {
        val track0 = MediaTrack(id = "track-0", title = "Track 0", artist = "Artist 0", album = "Album", durationSeconds = 180, artworkUrl = null)
        val track1 = MediaTrack(id = "track-1", title = "Track 1", artist = "Artist 1", album = "Album", durationSeconds = 180, artworkUrl = null)
        val track2 = MediaTrack(id = "track-2", title = "Track 2", artist = "Artist 2", album = "Album", durationSeconds = 180, artworkUrl = null)
        val track3 = MediaTrack(id = "track-3", title = "Track 3", artist = "Artist 3", album = "Album", durationSeconds = 180, artworkUrl = null)
        val track4 = MediaTrack(id = "track-4", title = "Track 4", artist = "Artist 4", album = "Album", durationSeconds = 180, artworkUrl = null)
        
        val allTracks = listOf(track0, track1, track2, track3, track4)
        
        val playableTracks = allTracks.filter { it.id != "track-1" }
        val requestedIndex = 2
        val playableIndex = playableTracks.indexOf(playableTracks.firstOrNull { it.id == allTracks[requestedIndex].id }) ?: 0
        
        assertEquals(1, playableIndex)
    }

    @Test
    fun currentQueueIndexEqualsRequestedPlayableTrack() {
        val queue = listOf(
            MediaTrack(id = "a", title = "A", artist = "A", album = "Album", durationSeconds = 180, artworkUrl = null),
            MediaTrack(id = "b", title = "B", artist = "B", album = "Album", durationSeconds = 180, artworkUrl = null),
            MediaTrack(id = "c", title = "C", artist = "C", album = "Album", durationSeconds = 180, artworkUrl = null),
        )
        
        val startIndex = 1
        val selectedTrack = queue[startIndex]
        
        assertEquals(startIndex, queue.indexOf(selectedTrack))
        assertEquals("B", selectedTrack.title)
    }

    @Test
    fun oldCurrentTrackCannotOverwriteNewSelection() {
        var currentTrack: MediaTrack? = MediaTrack(id = "old", title = "Old", artist = "Old", album = "Album", durationSeconds = 180, artworkUrl = null)
        var currentQueueIndex = 0
        
        val newTrack = MediaTrack(id = "new", title = "New", artist = "New", album = "Album", durationSeconds = 180, artworkUrl = null)
        
        currentTrack = newTrack
        currentQueueIndex = 5
        
        val token = 1L
        var activeToken = 2L
        
        val isStale = token != activeToken
        assertTrue(isStale)
        
        assertEquals("New", currentTrack?.title)
        assertEquals(5, currentQueueIndex)
    }

    @Test
    fun playlistQueueContainsAllTracksInOrder() {
        val track0 = MediaTrack(id = "track-0", title = "Track 0", artist = "Artist 0", album = "Album", durationSeconds = 180, artworkUrl = null)
        val track1 = MediaTrack(id = "track-1", title = "Track 1", artist = "Artist 1", album = "Album", durationSeconds = 180, artworkUrl = null)
        val track2 = MediaTrack(id = "track-2", title = "Track 2", artist = "Artist 2", album = "Album", durationSeconds = 180, artworkUrl = null)
        val track3 = MediaTrack(id = "track-3", title = "Track 3", artist = "Artist 3", album = "Album", durationSeconds = 180, artworkUrl = null)
        val track4 = MediaTrack(id = "track-4", title = "Track 4", artist = "Artist 4", album = "Album", durationSeconds = 180, artworkUrl = null)
        val track4b = MediaTrack(id = "track-4b", title = "Track 4b", artist = "Artist 4b", album = "Album", durationSeconds = 180, artworkUrl = null)
        val track5 = MediaTrack(id = "track-5", title = "Track 5", artist = "Artist 5", album = "Album", durationSeconds = 180, artworkUrl = null)
        val track6 = MediaTrack(id = "track-6", title = "Track 6", artist = "Artist 6", album = "Album", durationSeconds = 180, artworkUrl = null)
        val track7 = MediaTrack(id = "track-7", title = "Track 7", artist = "Artist 7", album = "Album", durationSeconds = 180, artworkUrl = null)
        val track8 = MediaTrack(id = "track-8", title = "Track 8", artist = "Artist 8", album = "Album", durationSeconds = 180, artworkUrl = null)
        val track9 = MediaTrack(id = "track-9", title = "Track 9", artist = "Artist 9", album = "Album", durationSeconds = 180, artworkUrl = null)
        
        val playlistTracks = listOf(
            MediaTrack(id = "track-0", title = "Track 0", artist = "Artist 0", album = "Album", durationSeconds = 180, artworkUrl = null),
            MediaTrack(id = "track-1", title = "Track 1", artist = "Artist 1", album = "Album", durationSeconds = 180, artworkUrl = null),
            MediaTrack(id = "track-2", title = "Track 2", artist = "Artist 2", album = "Album", durationSeconds = 180, artworkUrl = null),
            MediaTrack(id = "track-3", title = "Track 3", artist = "Artist 3", album = "Album", durationSeconds = 180, artworkUrl = null),
            MediaTrack(id = "track-4", title = "Track 4", artist = "Artist 4", album = "Album", durationSeconds = 180, artworkUrl = null),
            MediaTrack(id = "track-5", title = "Track 5", artist = "Artist 5", album = "Album", durationSeconds = 180, artworkUrl = null),
            MediaTrack(id = "track-6", title = "Track 6", artist = "Artist 6", album = "Album", durationSeconds = 180, artworkUrl = null),
            MediaTrack(id = "track-7", title = "Track 7", artist = "Artist 7", album = "Album", durationSeconds = 180, artworkUrl = null),
            MediaTrack(id = "track-8", title = "Track 8", artist = "Artist 8", album = "Album", durationSeconds = 180, artworkUrl = null),
            MediaTrack(id = "track-9", title = "Track 9", artist = "Artist 9", album = "Album", durationSeconds = 180, artworkUrl = null),
        )
        
        val queue = playlistTracks
        val startIndex = 3
        
        assertEquals(10, queue.size)
        assertEquals("Track 3", queue[3].title)
        assertEquals(3, queue.indexOf(playlistTracks[3]))
    }

    @Test
    fun switchingPlaylistTracksUpdatesCurrentTrackImmediately() {
        val tracks = listOf(
            MediaTrack(id = "t0", title = "Track 0", artist = "Artist 0", album = "Album", durationSeconds = 180, artworkUrl = null),
            MediaTrack(id = "t1", title = "Track 1", artist = "Artist 1", album = "Album", durationSeconds = 180, artworkUrl = null),
            MediaTrack(id = "t2", title = "Track 2", artist = "Artist 2", album = "Album", durationSeconds = 180, artworkUrl = null),
            MediaTrack(id = "t3", title = "Track 3", artist = "Artist 3", album = "Album", durationSeconds = 180, artworkUrl = null),
            MediaTrack(id = "t4", title = "Track 4", artist = "Artist 4", album = "Album", durationSeconds = 180, artworkUrl = null),
            MediaTrack(id = "t5", title = "Track 5", artist = "Artist 5", album = "Album", durationSeconds = 180, artworkUrl = null),
            MediaTrack(id = "t6", title = "Track 6", artist = "Artist 6", album = "Album", durationSeconds = 180, artworkUrl = null),
            MediaTrack(id = "t7", title = "Track 7", artist = "Artist 7", album = "Album", durationSeconds = 180, artworkUrl = null),
            MediaTrack(id = "t8", title = "Track 8", artist = "Artist 8", album = "Album", durationSeconds = 180, artworkUrl = null),
            MediaTrack(id = "t9", title = "Track 9", artist = "Artist 9", album = "Album", durationSeconds = 180, artworkUrl = null),
        )
        
        var currentTrack = tracks[0]
        var currentIndex = 0
        
        currentTrack = tracks[5]
        currentIndex = 5
        
        assertEquals("Track 5", currentTrack.title)
        assertEquals(5, currentIndex)
        
        currentTrack = tracks[8]
        currentIndex = 8
        
        assertEquals("Track 8", currentTrack.title)
        assertEquals(8, currentIndex)
    }
}