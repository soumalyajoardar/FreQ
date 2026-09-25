package com.gresseymusic.wave.data.playback

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.map
import java.io.IOException

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "freq_playback_prefs")

data class PersistedPlaybackData(
    val currentTrackId: String? = null,
    val queueTrackIds: List<String> = emptyList(),
    val currentQueueIndex: Int = 0,
    val currentPositionMs: Long = 0L,
    val isPlaying: Boolean = false,
    val shuffleEnabled: Boolean = false,
    val repeatMode: Int = 0,
)

class PlaybackPersistence(context: Context) {

    private val dataStore = context.applicationContext.dataStore

    companion object {
        val KEY_TRACK_ID = stringPreferencesKey("current_track_id")
        val KEY_QUEUE_IDS = stringPreferencesKey("current_queue_ids")
        val KEY_QUEUE_INDEX = intPreferencesKey("current_queue_index")
        val KEY_POSITION_MS = longPreferencesKey("current_position_ms")
        val KEY_IS_PLAYING = booleanPreferencesKey("is_playing")
        val KEY_SHUFFLE = booleanPreferencesKey("shuffle_enabled")
        val KEY_REPEAT = intPreferencesKey("repeat_mode")
    }

    val playbackDataFlow: Flow<PersistedPlaybackData> = dataStore.data
        .catch { exception ->
            if (exception is IOException) {
                emit(emptyPreferences())
            } else {
                throw exception
            }
        }
        .map { prefs ->
            val queueIds = decodeQueueIds(prefs[KEY_QUEUE_IDS])
            PersistedPlaybackData(
                currentTrackId = prefs[KEY_TRACK_ID],
                queueTrackIds = queueIds,
                currentQueueIndex = prefs[KEY_QUEUE_INDEX] ?: 0,
                currentPositionMs = prefs[KEY_POSITION_MS] ?: 0L,
                isPlaying = prefs[KEY_IS_PLAYING] ?: false,
                shuffleEnabled = prefs[KEY_SHUFFLE] ?: false,
                repeatMode = prefs[KEY_REPEAT] ?: 0,
            )
        }

    suspend fun loadSavedPlaybackData(): PersistedPlaybackData? {
        return try {
            playbackDataFlow.firstOrNull()
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    suspend fun savePlaybackSession(
        trackId: String?,
        queueIds: List<String>,
        queueIndex: Int,
        positionMs: Long,
        isPlaying: Boolean,
        shuffleEnabled: Boolean,
        repeatMode: Int,
    ) {
        try {
            dataStore.edit { prefs ->
                if (trackId != null) {
                    prefs[KEY_TRACK_ID] = trackId
                } else {
                    prefs.remove(KEY_TRACK_ID)
                }
                prefs[KEY_QUEUE_IDS] = encodeQueueIds(queueIds)
                prefs[KEY_QUEUE_INDEX] = queueIndex
                prefs[KEY_POSITION_MS] = positionMs
                prefs[KEY_IS_PLAYING] = isPlaying
                prefs[KEY_SHUFFLE] = shuffleEnabled
                prefs[KEY_REPEAT] = repeatMode
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun savePosition(positionMs: Long) {
        try {
            dataStore.edit { prefs ->
                prefs[KEY_POSITION_MS] = positionMs
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
