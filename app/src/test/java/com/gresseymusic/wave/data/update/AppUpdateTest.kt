package com.gresseymusic.wave.data.update

import org.junit.Assert.*
import org.junit.Test

class AppUpdateTest {

    @Test
    fun `tags normalize v prefix`() {
        assertEquals("1.2", UpdateChecker.normalizeTag("v1.2"))
        assertEquals("1.2", UpdateChecker.normalizeTag("V1.2"))
        assertEquals("1.2", UpdateChecker.normalizeTag("1.2"))
        assertEquals("1.2", UpdateChecker.normalizeTag("  v1.2  "))
    }

    @Test
    fun `newer versions detected numerically`() {
        assertTrue(UpdateChecker.isNewerVersion("1.2", "v1.3"))
        assertTrue(UpdateChecker.isNewerVersion("1.2", "2.0"))
        assertTrue(UpdateChecker.isNewerVersion("1.9", "1.10"))
        assertTrue(UpdateChecker.isNewerVersion("1.2", "1.2.1"))
    }

    @Test
    fun `same or older versions rejected`() {
        assertFalse(UpdateChecker.isNewerVersion("1.2", "v1.2"))
        assertFalse(UpdateChecker.isNewerVersion("1.3", "v1.2"))
        assertFalse(UpdateChecker.isNewerVersion("2.0", "1.9"))
        assertFalse(UpdateChecker.isNewerVersion("", ""))
    }

    @Test
    fun `release body parses tag and apk`() {
        val body = """
            {"tag_name":"v1.3","name":"FreQ 1.3",
             "assets":[
               {"name":"notes.txt","browser_download_url":"https://x/notes.txt"},
               {"name":"app-release.apk","browser_download_url":"https://x/app-release.apk"}
             ]}
        """.trimIndent()
        val release = UpdateChecker.parseLatestRelease(body)
        assertEquals("v1.3", release?.tag)
        assertEquals("https://x/app-release.apk", release?.apkUrl)
        assertEquals("FreQ 1.3", release?.name)
    }

    @Test
    fun `release without apk still reports tag`() {
        val body = """{"tag_name":"v1.3","assets":[]}"""
        val release = UpdateChecker.parseLatestRelease(body)
        assertEquals("v1.3", release?.tag)
        assertNull(release?.apkUrl)
    }

    @Test
    fun `malformed bodies yield null`() {
        assertNull(UpdateChecker.parseLatestRelease(""))
        assertNull(UpdateChecker.parseLatestRelease("{}"))
        assertNull(UpdateChecker.parseLatestRelease("not json"))
    }
}
