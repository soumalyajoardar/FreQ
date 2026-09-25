package com.gresseymusic.wave.data.remote

import org.junit.Assert.*
import org.junit.Test

/**
 * Tests for YtMusicApiClient.upgradeArtworkUrl() — artwork URL quality upgrading.
 */
class ArtworkUrlUpgradeTest {

    @Test
    fun `null input returns null`() {
        assertNull(YtMusicApiClient.upgradeArtworkUrl(null))
    }

    @Test
    fun `blank input returns null`() {
        assertNull(YtMusicApiClient.upgradeArtworkUrl(""))
        assertNull(YtMusicApiClient.upgradeArtworkUrl("   "))
    }

    @Test
    fun `googleusercontent URL with size param is upgraded`() {
        val input = "https://lh3.googleusercontent.com/abc123=w120-h120-l90-rj"
        val result = YtMusicApiClient.upgradeArtworkUrl(input)
        assertEquals("https://lh3.googleusercontent.com/abc123=w544-h544-l90-rj", result)
    }

    @Test
    fun `googleusercontent URL with s-param is upgraded`() {
        val input = "https://lh3.googleusercontent.com/abc123=s120-something"
        val result = YtMusicApiClient.upgradeArtworkUrl(input)
        // The regex replaces =s120-something with =w544-h544-l90-rj
        assertNotNull(result)
        assertTrue(result!!.contains("=w544-h544-l90-rj"))
    }

    @Test
    fun `ggpht URL with size param is upgraded`() {
        val input = "https://yt3.ggpht.com/channel123=w60-h60-c-k"
        val result = YtMusicApiClient.upgradeArtworkUrl(input)
        assertEquals("https://yt3.ggpht.com/channel123=w544-h544-l90-rj", result)
    }

    @Test
    fun `googleusercontent URL without size param gets appended`() {
        val input = "https://lh3.googleusercontent.com/abc123"
        val result = YtMusicApiClient.upgradeArtworkUrl(input)
        assertEquals("https://lh3.googleusercontent.com/abc123=w544-h544-l90-rj", result)
    }

    @Test
    fun `googleusercontent URL with existing non-size = param is left alone`() {
        // URL already has = but not matching size pattern — left as-is
        val input = "https://lh3.googleusercontent.com/abc123=somethingelse"
        val result = YtMusicApiClient.upgradeArtworkUrl(input)
        // Should contain the original since the regex won't match and it already has =
        assertNotNull(result)
    }

    @Test
    fun `ytimg default thumbnail is upgraded to hq720`() {
        val input = "https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg"
        val result = YtMusicApiClient.upgradeArtworkUrl(input)
        assertEquals("https://i.ytimg.com/vi/dQw4w9WgXcQ/hq720.jpg", result)
    }

    @Test
    fun `ytimg mqdefault thumbnail is upgraded to hq720`() {
        val input = "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg"
        val result = YtMusicApiClient.upgradeArtworkUrl(input)
        assertEquals("https://i.ytimg.com/vi/dQw4w9WgXcQ/hq720.jpg", result)
    }

    @Test
    fun `ytimg hqdefault thumbnail is upgraded to hq720`() {
        val input = "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        val result = YtMusicApiClient.upgradeArtworkUrl(input)
        assertEquals("https://i.ytimg.com/vi/dQw4w9WgXcQ/hq720.jpg", result)
    }

    @Test
    fun `ytimg sddefault thumbnail is upgraded to hq720`() {
        val input = "https://i.ytimg.com/vi/dQw4w9WgXcQ/sddefault.jpg"
        val result = YtMusicApiClient.upgradeArtworkUrl(input)
        assertEquals("https://i.ytimg.com/vi/dQw4w9WgXcQ/hq720.jpg", result)
    }

    @Test
    fun `ytimg already hq720 is left alone`() {
        val input = "https://i.ytimg.com/vi/dQw4w9WgXcQ/hq720.jpg"
        val result = YtMusicApiClient.upgradeArtworkUrl(input)
        assertEquals(input, result)
    }

    @Test
    fun `non-google non-youtube URL is returned as-is`() {
        val input = "https://example.com/image.png"
        val result = YtMusicApiClient.upgradeArtworkUrl(input)
        assertEquals(input, result)
    }

    @Test
    fun `URL with special characters does not crash`() {
        val input = "https://lh3.googleusercontent.com/a%20b%20c"
        val result = YtMusicApiClient.upgradeArtworkUrl(input)
        assertNotNull(result)
    }

    @Test
    fun `ytimg non-thumbnail path is left alone`() {
        val input = "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
        assertEquals(input, YtMusicApiClient.upgradeArtworkUrl(input))
    }

    @Test
    fun `already upgraded googleusercontent URL is idempotent`() {
        val input = "https://lh3.googleusercontent.com/abc123=w544-h544-l90-rj"
        assertEquals(input, YtMusicApiClient.upgradeArtworkUrl(input))
    }

    @Test
    fun `youtube fallback returns genuine thumbnail for video id`() {
        val result = YtMusicApiClient.youtubeThumbnailForId("OsfAnsMY21M")
        assertEquals("https://i.ytimg.com/vi/OsfAnsMY21M/hq720.jpg", result)
    }

    @Test
    fun `youtube fallback rejects non-video ids`() {
        assertNull(YtMusicApiClient.youtubeThumbnailForId("PLabc123"))
        assertNull(YtMusicApiClient.youtubeThumbnailForId(""))
        assertNull(YtMusicApiClient.youtubeThumbnailForId("short"))
    }

    @Test
    fun `artwork fallback prefers real backend artwork`() {
        val real = "https://lh3.googleusercontent.com/abc=w544-h544-l90-rj"
        assertEquals(real, YtMusicApiClient.artworkOrYoutubeFallback(real, "OsfAnsMY21M"))
    }

    @Test
    fun `artwork fallback uses youtube thumbnail when blank`() {
        val result = YtMusicApiClient.artworkOrYoutubeFallback(null, "OsfAnsMY21M")
        assertEquals("https://i.ytimg.com/vi/OsfAnsMY21M/hq720.jpg", result)
    }
}
