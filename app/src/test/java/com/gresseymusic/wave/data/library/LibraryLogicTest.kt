package com.gresseymusic.wave.data.library

import com.gresseymusic.wave.player.MediaTrack
import org.junit.Assert.*
import org.junit.Test

/**
 * Local-library regression tests (M13 Areas 4, 5, 12-pure).
 * Exercises the real list rules LocalLibraryRepositoryImpl delegates to:
 * toggles, recent ordering/dedup/cap, moves, playlist duplicate rules,
 * title/description validation, and artwork derivation.
 */
class LibraryLogicTest {

    private fun track(
        id: String,
        artworkUrl: String? = null,
        mediaUri: String? = "android.resource://pkg/raw/test_track_1",
    ) = MediaTrack(
        id = id,
        title = "Title $id",
        artist = "Artist",
        album = "Album",
        artworkUrl = artworkUrl,
        mediaUri = mediaUri,
    )

    // Liked / toggle behavior (Area 4: liked tracks)

    @Test
    fun `toggle adds to front when absent`() {
        val (updated, nowPresent) = toggleItemInList(emptyList(), track("v1"), MediaTrack::id)
        assertTrue(nowPresent)
        assertEquals(listOf("v1"), updated.map { it.id })
    }

    @Test
    fun `toggle removes when present and keeps order`() {
        val current = listOf(track("v1"), track("v2"), track("v3"))
        val (updated, nowPresent) = toggleItemInList(current, track("v2"), MediaTrack::id)
        assertFalse(nowPresent)
        assertEquals(listOf("v1", "v3"), updated.map { it.id })
    }

    @Test
    fun `toggle re-add prepends as most recent`() {
        val current = listOf(track("v1"), track("v2"))
        val (updated, nowPresent) = toggleItemInList(current, track("v3"), MediaTrack::id)
        assertTrue(nowPresent)
        assertEquals(listOf("v3", "v1", "v2"), updated.map { it.id })
    }

    @Test
    fun `toggle matches by id not instance`() {
        val current = listOf(track("v1"))
        val (updated, nowPresent) = toggleItemInList(current, track("v1"), MediaTrack::id)
        assertFalse(nowPresent)
        assertTrue(updated.isEmpty())
    }

    // Recently played (Area 4)

    @Test
    fun `recent prepends and deduplicates`() {
        val current = listOf(track("v1"), track("v2"))
        val updated = addTrackToRecent(current, track("v2"))!!
        assertEquals(listOf("v2", "v1"), updated.map { it.id })
    }

    @Test
    fun `recent keeps newest instance data`() {
        val current = listOf(track("v1"))
        val replayed = track("v1").copy(title = "Updated Title")
        val updated = addTrackToRecent(current, replayed)!!
        assertEquals("Updated Title", updated.first().title)
        assertEquals(1, updated.size)
    }

    @Test
    fun `recent caps history at fifty`() {
        val current = (1..60).map { track("v$it") }
        val updated = addTrackToRecent(current, track("fresh"))!!
        assertEquals(MAX_RECENTLY_PLAYED, updated.size)
        assertEquals("fresh", updated.first().id)
        // Oldest entries fall off the end; newest 49 survive after fresh.
        assertEquals("v49", updated.last().id)
        assertFalse(updated.any { it.id == "v60" })
    }

    @Test
    fun `recent allows exactly fifty`() {
        val current = (1..49).map { track("v$it") }
        val updated = addTrackToRecent(current, track("fresh"))!!
        assertEquals(50, updated.size)
    }

    @Test
    fun `recent records remote catalog tracks without local uri`() {
        // M27.2: the old local-uri gate blocked every YTMusic track, leaving
        // Recently Played permanently empty. Remote tracks with stable ids
        // are recorded; only blank ids are rejected.
        val current = listOf(track("v1"))
        val updated = addTrackToRecent(current, track("remote", mediaUri = null))!!
        assertEquals(listOf("remote", "v1"), updated.map { it.id })
    }

    @Test
    fun `recent ignores tracks with blank ids`() {
        val current = listOf(track("v1"))
        assertNull(addTrackToRecent(current, track("", mediaUri = null)))
        assertNull(addTrackToRecent(current, track("   ")))
    }

    @Test
    fun `recent on empty history`() {
        val updated = addTrackToRecent(emptyList(), track("v1"))!!
        assertEquals(listOf("v1"), updated.map { it.id })
    }

    // Move / reorder (Areas 4-5)

    @Test
    fun `move relocates forward and backward`() {
        val current = listOf("a", "b", "c", "d")
        assertEquals(listOf("c", "a", "b", "d"), moveItemInList(current, 2, 0))
        assertEquals(listOf("a", "c", "d", "b"), moveItemInList(current, 1, 3))
    }

    @Test
    fun `move rejects invalid indices and no-ops`() {
        val current = listOf("a", "b")
        assertNull(moveItemInList(current, -1, 0))
        assertNull(moveItemInList(current, 0, 5))
        assertNull(moveItemInList(current, 1, 1))
        assertNull(moveItemInList(emptyList<String>(), 0, 0))
    }

    // Playlist duplicate rules (Area 5)

    @Test
    fun `playlist add appends new tracks`() {
        val updated = addPlaylistTrackIfAbsent(listOf(track("v1")), track("v2"))
        assertNotNull(updated)
        assertEquals(listOf("v1", "v2"), updated!!.map { it.id })
    }

    @Test
    fun `playlist add rejects duplicates in place`() {
        val current = listOf(track("v1"), track("v2"))
        assertNull(addPlaylistTrackIfAbsent(current, track("v1")))
        assertNull(addPlaylistTrackIfAbsent(current, track("v2")))
    }

    @Test
    fun `playlist remove drops by id`() {
        val updated = removePlaylistTrack(listOf(track("v1"), track("v2")), "v1")
        assertNotNull(updated)
        assertEquals(listOf("v2"), updated!!.map { it.id })
    }

    @Test
    fun `playlist remove reports absent tracks`() {
        assertNull(removePlaylistTrack(listOf(track("v1")), "missing"))
        assertNull(removePlaylistTrack(emptyList(), "v1"))
    }

    @Test
    fun `artwork derivation picks first remaining art`() {
        val tracks = listOf(track("v1"), track("v2", artworkUrl = "http://art/2"), track("v3"))
        assertEquals("http://art/2", derivePlaylistArtworkAfterRemove(tracks))
        assertNull(derivePlaylistArtworkAfterRemove(listOf(track("v1"))))
        assertNull(derivePlaylistArtworkAfterRemove(emptyList()))
    }

    // Title / description validation (Area 5)

    @Test
    fun `blank titles are invalid`() {
        assertFalse(isValidPlaylistTitle(""))
        assertFalse(isValidPlaylistTitle("   "))
        assertTrue(isValidPlaylistTitle("Road Trip"))
        assertTrue(isValidPlaylistTitle("  Road Trip  "))
    }

    @Test
    fun `description trims and collapses blank to null`() {
        assertEquals("A mix", sanitizePlaylistDescription("  A mix  "))
        assertNull(sanitizePlaylistDescription("   "))
        assertNull(sanitizePlaylistDescription(""))
        assertNull(sanitizePlaylistDescription(null))
    }
}
