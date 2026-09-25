package com.gresseymusic.wave.data.settings

import android.content.Context
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

private val Context.searchHistoryDataStore: DataStore<Preferences> by preferencesDataStore(name = "freq_search_history")

/**
 * Unified recent-search activity entry (M27.6): either a submitted text
 * query or a song the user actually tapped from Search results.
 */
sealed interface RecentSearchItem {
    val key: String

    data class Query(val query: String) : RecentSearchItem {
        override val key: String get() = "q:${query.lowercase()}"
    }

    data class Track(
        val trackId: String,
        val title: String,
        val artist: String,
        val artworkUrl: String?,
    ) : RecentSearchItem {
        override val key: String get() = "t:$trackId"
    }
}

/**
 * Local search-history persistence (M27.4 queries, M27.6 + tracks).
 *
 * Stores unified recent activity locally using DataStore:
 * - submitted text queries AND songs tapped from Search results
 * - most recent first, max 20 entries
 * - query dedupe is case-insensitive; track dedupe is by track id
 * - re-occurrence moves the entry to the front (no duplicates)
 * - blank/short queries rejected; blank track ids rejected
 * - survives app restart, force-stop, Activity recreation
 *
 * Storage is a JSON array of objects `{t:"q"|"s",...}`. The legacy M27.4
 * format (plain string array) is read back as [RecentSearchItem.Query].
 */
class SearchHistory(private val context: Context) {

    private val historyKey = stringPreferencesKey(SEARCH_HISTORY_KEY)

    val historyFlow: Flow<List<RecentSearchItem>> = context.searchHistoryDataStore.data.map { preferences ->
        decodeHistory(preferences[historyKey] ?: "[]")
    }

    /** Legacy M27.4 view: query strings only, most recent first. */
    val queryHistoryFlow: Flow<List<String>> = historyFlow.map { items ->
        items.filterIsInstance<RecentSearchItem.Query>().map { it.query }
    }

    /**
     * Saves a submitted search query to history.
     * Normalizes whitespace, rejects blank/short, deduplicates
     * case-insensitively, moves to front.
     */
    suspend fun saveQuery(query: String): Boolean {
        val trimmed = query.trim()
        if (trimmed.isBlank()) return false
        if (trimmed.length < 2) return false
        return upsert(RecentSearchItem.Query(trimmed))
    }

    /**
     * Records a song the user tapped from Search results.
     * Never fabricates entries: call only with the actually tapped track.
     */
    suspend fun recordTrack(
        trackId: String,
        title: String,
        artist: String,
        artworkUrl: String?,
    ): Boolean {
        if (trackId.isBlank()) return false
        return upsert(
            RecentSearchItem.Track(
                trackId = trackId,
                title = title.ifBlank { "Unknown Title" },
                artist = artist.ifBlank { "Unknown Artist" },
                artworkUrl = artworkUrl?.takeIf { it.isNotBlank() },
            ),
        )
    }

    /** Removes the single entry identified by [RecentSearchItem.key]. */
    suspend fun removeItem(key: String) {
        val current = historyFlow.first()
        val updated = current.filter { it.key != key }
        persist(updated)
    }

    /** Legacy name: removes one query entry. */
    suspend fun removeQuery(query: String) {
        removeItem(RecentSearchItem.Query(query.trim()).key)
    }

    /**
     * Clears all search history.
     */
    suspend fun clearAll() {
        context.searchHistoryDataStore.edit { preferences ->
            preferences.remove(historyKey)
        }
    }

    private suspend fun upsert(item: RecentSearchItem): Boolean {
        val current = historyFlow.first()
        val updated = listOf(item) + current.filter { it.key != item.key }
        persist(updated.take(MAX_HISTORY_SIZE))
        return true
    }

    private suspend fun persist(items: List<RecentSearchItem>) {
        val array = JSONArray()
        for (item in items) {
            when (item) {
                is RecentSearchItem.Query -> array.put(
                    JSONObject()
                        .put("t", "q")
                        .put("q", item.query),
                )
                is RecentSearchItem.Track -> array.put(
                    JSONObject()
                        .put("t", "s")
                        .put("id", item.trackId)
                        .put("title", item.title)
                        .put("artist", item.artist)
                        .put("art", item.artworkUrl),
                )
            }
        }
        val json = array.toString()
        context.searchHistoryDataStore.edit { preferences ->
            preferences[historyKey] = json
        }
    }

    companion object {
        private const val MAX_HISTORY_SIZE = 20
        private const val SEARCH_HISTORY_KEY = "freq_search_history"

        /**
         * Pure decode, host-testable: object format + legacy string arrays.
         *
         * Hand-rolled for the constrained history schema because org.json is
         * an Android-framework class unavailable to host unit tests.
         */
        fun decodeHistory(json: String): List<RecentSearchItem> {
            try {
                val parser = HistoryJsonParser(json)
                val values = parser.parseArray()
                val list = mutableListOf<RecentSearchItem>()
                for (el in values) {
                    when (el) {
                        // Legacy M27.4 plain-string entries.
                        is String -> if (el.isNotBlank()) {
                            list.add(RecentSearchItem.Query(el))
                        }
                        is Map<*, *> -> {
                            @Suppress("UNCHECKED_CAST")
                            val obj = el as Map<String, String>
                            when (obj["t"]) {
                                "q" -> {
                                    val q = (obj["q"] ?: "").trim()
                                    if (q.isNotBlank()) list.add(RecentSearchItem.Query(q))
                                }
                                "s" -> {
                                    val id = obj["id"] ?: ""
                                    if (id.isNotBlank()) {
                                        list.add(
                                            RecentSearchItem.Track(
                                                trackId = id,
                                                title = obj["title"]?.takeIf { it.isNotBlank() }
                                                    ?: "Unknown Title",
                                                artist = obj["artist"]?.takeIf { it.isNotBlank() }
                                                    ?: "Unknown Artist",
                                                artworkUrl = obj["art"]?.takeIf { it.isNotBlank() },
                                            ),
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
                return list
            } catch (e: Exception) {
                return emptyList()
            }
        }

        /** Pure encode, host-testable. */
        fun encodeHistory(items: List<RecentSearchItem>): String {
            val sb = StringBuilder("[")
            items.forEachIndexed { index, item ->
                if (index > 0) sb.append(',')
                when (item) {
                    is RecentSearchItem.Query -> sb.append(
                        """{"t":"q","q":"${esc(item.query)}"}""",
                    )
                    is RecentSearchItem.Track -> {
                        sb.append("""{"t":"s","id":"${esc(item.trackId)}","title":"${esc(item.title)}","artist":"${esc(item.artist)}"""")
                        if (item.artworkUrl != null) {
                            sb.append(""","art":"${esc(item.artworkUrl)}"""")
                        }
                        sb.append('}')
                    }
                }
            }
            return sb.append(']').toString()
        }

        private fun esc(raw: String): String {
            val sb = StringBuilder(raw.length + 8)
            for (c in raw) {
                when (c) {
                    '\\' -> sb.append("\\\\")
                    '"' -> sb.append("\\\"")
                    '\n' -> sb.append("\\n")
                    '\r' -> sb.append("\\r")
                    '\t' -> sb.append("\\t")
                    else -> sb.append(c)
                }
            }
            return sb.toString()
        }

        /** Minimal JSON reader for arrays of strings/objects with string values. */
        private class HistoryJsonParser(private val src: String) {
            private var pos = 0

            fun parseArray(): List<Any> {
                skipWs()
                if (!consume('[')) throw IllegalArgumentException("not an array")
                val out = mutableListOf<Any>()
                skipWs()
                if (consume(']')) return out
                while (true) {
                    skipWs()
                    out.add(parseValue())
                    skipWs()
                    when {
                        consume(',') -> continue
                        consume(']') -> return out
                        else -> throw IllegalArgumentException("expected , or ]")
                    }
                }
            }

            private fun parseValue(): Any {
                skipWs()
                return when (peek()) {
                    '"' -> parseString()
                    '{' -> parseObject()
                    '[' -> parseArray()
                    else -> throw IllegalArgumentException("unexpected value")
                }
            }

            private fun parseObject(): Map<String, String> {
                consume('{')
                val map = LinkedHashMap<String, String>()
                skipWs()
                if (consume('}')) return map
                while (true) {
                    skipWs()
                    val key = parseString()
                    skipWs()
                    if (!consume(':')) throw IllegalArgumentException("expected :")
                    skipWs()
                    val value = if (peek() == '"') parseString() else {
                        // Skip non-string scalars (numbers/bools/null).
                        while (pos < src.length && src[pos] !in ",}") pos++
                        ""
                    }
                    map[key] = value
                    skipWs()
                    when {
                        consume(',') -> continue
                        consume('}') -> return map
                        else -> throw IllegalArgumentException("expected , or }")
                    }
                }
            }

            private fun parseString(): String {
                if (!consume('"')) throw IllegalArgumentException("expected string")
                val sb = StringBuilder()
                while (pos < src.length) {
                    val c = src[pos++]
                    when (c) {
                        '"' -> return sb.toString()
                        '\\' -> {
                            if (pos >= src.length) throw IllegalArgumentException("bad escape")
                            when (val e = src[pos++]) {
                                '"', '\\', '/' -> sb.append(e)
                                'n' -> sb.append('\n')
                                'r' -> sb.append('\r')
                                't' -> sb.append('\t')
                                'u' -> {
                                    if (pos + 4 > src.length) throw IllegalArgumentException("bad unicode")
                                    sb.append(src.substring(pos, pos + 4).toInt(16).toChar())
                                    pos += 4
                                }
                                else -> throw IllegalArgumentException("bad escape")
                            }
                        }
                        else -> sb.append(c)
                    }
                }
                throw IllegalArgumentException("unterminated string")
            }

            private fun skipWs() {
                while (pos < src.length && src[pos].isWhitespace()) pos++
            }

            private fun peek(): Char {
                if (pos >= src.length) throw IllegalArgumentException("unexpected end")
                return src[pos]
            }

            private fun consume(c: Char): Boolean {
                if (pos < src.length && src[pos] == c) {
                    pos++
                    return true
                }
                return false
            }
        }

        /** Pure ordering helper, host-testable. */
        fun upsertItem(
            current: List<RecentSearchItem>,
            item: RecentSearchItem,
            maxSize: Int = MAX_HISTORY_SIZE,
        ): List<RecentSearchItem> {
            return (listOf(item) + current.filter { it.key != item.key }).take(maxSize)
        }
    }
}

val LocalSearchHistory = staticCompositionLocalOf<SearchHistory> {
    error("SearchHistory not provided")
}
