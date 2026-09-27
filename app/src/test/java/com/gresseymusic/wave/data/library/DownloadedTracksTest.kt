package com.gresseymusic.wave.data.library

import org.junit.Assert.*
import org.junit.Test

class DownloadedTracksTest {

    private fun record(id: Long) = DownloadRecord(
        downloadId = id,
        trackId = "track-$id",
        title = "Song $id",
        artist = "Artist",
        artworkUrl = null,
        durationSeconds = 180,
    )

    @Test
    fun `records round-trip through json`() {
        val records = listOf(record(11), record(22))
        val parsed = parseDownloadRecords(serializeDownloadRecords(records))
        assertEquals(records, parsed)
    }

    @Test
    fun `malformed entries are skipped`() {
        assertTrue(parseDownloadRecords("").isEmpty())
        assertTrue(parseDownloadRecords("not json").isEmpty())
        assertTrue(
            parseDownloadRecords(
                """[{"downloadId":-1,"trackId":"a","title":"b"},{"downloadId":1,"trackId":"","title":"b"}]""",
            ).isEmpty(),
        )
    }

    @Test
    fun `download ids are namespaced`() {
        assertEquals("download:42", downloadedTrackId(42))
    }
}
