package com.gresseymusic.wave.data.library

import android.app.DownloadManager
import android.content.Context
import android.util.Log
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.gresseymusic.wave.player.MediaTrack
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

private val Context.downloadsDataStore: DataStore<Preferences> by preferencesDataStore(name = "freq_downloads")

private val DOWNLOADS_KEY = stringPreferencesKey("freq_download_records")

/**
 * One completed FreQ download: the DownloadManager id plus the track
 * metadata needed to replay it offline. Pure data, JSON-serialized.
 */
data class DownloadRecord(
    val downloadId: Long,
    val trackId: String,
    val title: String,
    val artist: String,
    val artworkUrl: String?,
    val durationSeconds: Int,
)

/**
 * Serializes download records for DataStore. Pure and unit-tested.
 */
fun serializeDownloadRecords(records: List<DownloadRecord>): String {
    val array = JSONArray()
    for (record in records) {
        array.put(
            JSONObject()
                .put("downloadId", record.downloadId)
                .put("trackId", record.trackId)
                .put("title", record.title)
                .put("artist", record.artist)
                .put("artworkUrl", record.artworkUrl)
                .put("durationSeconds", record.durationSeconds),
        )
    }
    return array.toString()
}

/**
 * Parses download records, skipping malformed entries. Pure and
 * unit-tested.
 */
fun parseDownloadRecords(json: String): List<DownloadRecord> {
    if (json.isBlank()) return emptyList()
    return try {
        val array = JSONArray(json)
        val out = ArrayList<DownloadRecord>(array.length())
        for (i in 0 until array.length()) {
            val obj = array.optJSONObject(i) ?: continue
            val downloadId = obj.optLong("downloadId", -1L)
            val trackId = obj.optString("trackId", "")
            val title = obj.optString("title", "")
            if (downloadId < 0 || trackId.isBlank() || title.isBlank()) continue
            out.add(
                DownloadRecord(
                    downloadId = downloadId,
                    trackId = trackId,
                    title = title,
                    artist = obj.optString("artist", "Unknown Artist"),
                    artworkUrl = obj.optString("artworkUrl", "").takeIf { it.isNotBlank() },
                    durationSeconds = obj.optInt("durationSeconds", 0),
                ),
            )
        }
        out
    } catch (_: Exception) {
        emptyList()
    }
}

/**
 * Stable queue id for a download (unique per download, never collides
 * with catalog ids). Pure.
 */
fun downloadedTrackId(downloadId: Long): String {
    return "download:$downloadId"
}

/**
 * Downloads collection (M28t): tracks the user saved via the player
 * Download action, replayable offline through their local file URIs.
 *
 * Permission-free by design: records are written at enqueue time and
 * resolved through DownloadManager queries for our own ids — no storage
 * permission, no media-store scan. Failed/cleared downloads drop out on
 * the next refresh. Thread-safe.
 */
class DownloadedTracksRepository(context: Context) {

    private val applicationContext = context.applicationContext
    private val dataStore = applicationContext.downloadsDataStore
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private val _downloaded = MutableStateFlow<List<MediaTrack>>(emptyList())
    val downloaded: StateFlow<List<MediaTrack>> = _downloaded.asStateFlow()

    init {
        scope.launch { refresh() }
    }

    /** Records an enqueued download (fire-and-forget from playback). */
    fun recordDownload(downloadId: Long, track: MediaTrack) {
        scope.launch {
            try {
                val current = loadRecords().toMutableList()
                current.removeAll { it.downloadId == downloadId || it.trackId == track.id }
                current.add(
                    0,
                    DownloadRecord(
                        downloadId = downloadId,
                        trackId = track.id,
                        title = track.title,
                        artist = track.artist,
                        artworkUrl = track.artworkUrl,
                        durationSeconds = track.durationSeconds,
                    ),
                )
                saveRecords(current)
                refresh()
            } catch (e: Exception) {
                Log.w(TAG, "[Downloads] record failed: ${e.message}")
            }
        }
    }

    /** Re-resolves records against DownloadManager (call on entering Library). */
    suspend fun refresh() {
        try {
            val records = loadRecords()
            if (records.isEmpty()) {
                _downloaded.value = emptyList()
                return
            }
            val manager = applicationContext.getSystemService(DownloadManager::class.java)
            if (manager == null) {
                _downloaded.value = emptyList()
                return
            }
            val resolved = ArrayList<MediaTrack>(records.size)
            val stale = ArrayList<DownloadRecord>()
            for (record in records) {
                val track = resolveRecord(manager, record)
                if (track != null) resolved.add(track) else stale.add(record)
            }
            if (stale.isNotEmpty()) {
                saveRecords(records - stale.toSet())
            }
            _downloaded.value = resolved
        } catch (e: Exception) {
            Log.w(TAG, "[Downloads] refresh failed: ${e.message}")
        }
    }

    private fun resolveRecord(manager: DownloadManager, record: DownloadRecord): MediaTrack? {
        return try {
            val cursor = manager.query(
                DownloadManager.Query().setFilterById(record.downloadId),
            ) ?: return null
            cursor.use {
                if (!it.moveToFirst()) return null
                val status = it.getInt(it.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
                if (status != DownloadManager.STATUS_SUCCESSFUL) return null
                // LOCAL_URI is unreliable on newer Android; the
                // MediaProvider content URI is the documented fallback
                // for completed downloads.
                val uri = columnString(it, DownloadManager.COLUMN_LOCAL_URI)
                    ?: columnString(it, DownloadManager.COLUMN_MEDIAPROVIDER_URI)
                    ?: return null
                MediaTrack(
                    id = downloadedTrackId(record.downloadId),
                    title = record.title,
                    artist = record.artist,
                    album = "Downloads",
                    durationSeconds = record.durationSeconds,
                    artworkUrl = record.artworkUrl,
                    mediaUri = uri,
                )
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun columnString(cursor: android.database.Cursor, column: String): String? {
        return try {
            val index = cursor.getColumnIndex(column)
            if (index < 0) return null
            cursor.getString(index)?.takeIf { it.isNotBlank() }
        } catch (_: Exception) {
            null
        }
    }

    private suspend fun loadRecords(): List<DownloadRecord> {
        return try {
            val prefs = dataStore.data.firstOrNull() ?: return emptyList()
            parseDownloadRecords(prefs[DOWNLOADS_KEY].orEmpty())
        } catch (_: Exception) {
            emptyList()
        }
    }

    private suspend fun saveRecords(records: List<DownloadRecord>) {
        try {
            dataStore.edit { prefs ->
                prefs[DOWNLOADS_KEY] = serializeDownloadRecords(records)
            }
        } catch (_: Exception) {
        }
    }

    companion object {
        private const val TAG = "Downloads"
    }
}

val LocalDownloadedTracks = staticCompositionLocalOf<DownloadedTracksRepository> {
    error("DownloadedTracksRepository not provided")
}
