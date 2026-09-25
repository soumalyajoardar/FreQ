package com.gresseymusic.wave

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.gresseymusic.wave.data.remote.YtMusicApiClient
import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Throwaway network probe: calls the backend the same way the app does and
 * prints what comes back. Diagnoses emulator-vs-backend search emptiness.
 */
@RunWith(AndroidJUnit4::class)
class ApiProbeTest {

    private val client = YtMusicApiClient("https://freq-api.vercel.app/")

    @Test
    fun probeSearch() = runBlocking {
        try {
            val tracks = client.searchTracks("espresso")
            println("API_PROBE search size=${tracks.size}")
            tracks.take(3).forEach {
                println("API_PROBE track id=${it.id} title=${it.title} artist=${it.artist}")
            }
        } catch (e: Exception) {
            println("API_PROBE search FAILED ${e.javaClass.simpleName}: ${e.message}")
        }
        try {
            val repo = com.gresseymusic.wave.data.repository.YtMusicRepository(client)
            when (val r = repo.getSearchResults("espresso")) {
                is com.gresseymusic.wave.data.repository.CatalogResult.Success ->
                    println("API_PROBE repo SUCCESS size=${r.data.size}")
                is com.gresseymusic.wave.data.repository.CatalogResult.Failure ->
                    println("API_PROBE repo FAILURE kind=${r.kind}")
            }
        } catch (e: Exception) {
            println("API_PROBE repo THREW ${e.javaClass.simpleName}: ${e.message}")
        }
        try {
            val home = client.getHome()
            println("API_PROBE home sections=${home.sections.size}")
        } catch (e: Exception) {
            println("API_PROBE home FAILED ${e.javaClass.simpleName}: ${e.message}")
        }
    }
}
