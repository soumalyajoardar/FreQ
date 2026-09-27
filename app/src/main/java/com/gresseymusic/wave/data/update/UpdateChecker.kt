package com.gresseymusic.wave.data.update

import android.content.Context
import android.util.Log
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import okhttp3.Call
import okhttp3.Callback
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * GitHub release behind the auto-update check (M28r).
 *
 * @param tag release tag as published ("v1.2" or "1.2").
 * @param apkUrl direct download URL of the attached universal APK, or
 * null when the release carries no APK.
 */
data class GithubRelease(
    val tag: String,
    val apkUrl: String?,
    val name: String?,
)

/**
 * Update source: the public FreQ releases feed. No auth, no backend.
 */
open class UpdateChecker(
    var baseUrl: String = "https://api.github.com/repos/soumalyajoardar/FreQ",
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .callTimeout(20, TimeUnit.SECONDS)
        .build(),
) {

    /**
     * Latest published release, or null when unreachable / unpublished /
     * unparseable. Never throws except on genuine cancellation.
     */
    open suspend fun fetchLatestRelease(): GithubRelease? {
        return try {
            withContext(Dispatchers.IO) {
                val request = Request.Builder()
                    .url("${baseUrl.trimEnd('/')}/releases/latest")
                    .header("Accept", "application/vnd.github+json")
                    .build()
                executeCancellable(request).use { response ->
                    if (response.code == 404) return@withContext null
                    if (!response.isSuccessful) return@withContext null
                    val body = response.body?.string() ?: return@withContext null
                    parseLatestRelease(body)
                }
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Log.w(TAG, "[Update] release check failed: ${e.message}")
            null
        }
    }

    private suspend fun executeCancellable(request: Request): Response {
        val call = client.newCall(request)
        return suspendCancellableCoroutine { cont ->
            cont.invokeOnCancellation { call.cancel() }
            call.enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    if (!cont.isCompleted) cont.resumeWithException(e)
                }

                override fun onResponse(call: Call, response: Response) {
                    if (!cont.isCompleted) cont.resume(response)
                    else response.close()
                }
            })
        }
    }

    companion object {
        private const val TAG = "Update"

        /**
         * Parses a GitHub `releases/latest` body. Picks the first attached
         * `.apk` as the download; a release without APKs still reports its
         * tag (update prompt explains manual download). Null when the tag
         * is missing. Pure.
         */
        fun parseLatestRelease(body: String): GithubRelease? {
            return try {
                val json = JSONObject(body)
                val tag = json.optString("tag_name", "").trim()
                if (tag.isBlank()) return null
                val name = json.optString("name", "").trim().takeIf { it.isNotBlank() }
                var apkUrl: String? = null
                val assets = json.optJSONArray("assets")
                if (assets != null) {
                    for (i in 0 until assets.length()) {
                        val asset = assets.optJSONObject(i) ?: continue
                        val url = asset.optString("browser_download_url", "")
                        val assetName = asset.optString("name", "")
                        if (url.isBlank()) continue
                        if (assetName.endsWith(".apk", ignoreCase = true) ||
                            url.endsWith(".apk", ignoreCase = true)
                        ) {
                            apkUrl = url
                            break
                        }
                    }
                }
                GithubRelease(tag = tag, apkUrl = apkUrl, name = name)
            } catch (_: Exception) {
                null
            }
        }

        /**
         * Normalizes a version tag ("v1.2" → "1.2"). Pure.
         */
        fun normalizeTag(tag: String): String {
            return tag.trim().removePrefix("v").removePrefix("V")
        }

        /**
         * True when [latestTag] is strictly newer than [current] by
         * numeric dotted comparison ("1.10" > "1.2"; "v" prefixes and
         * missing parts tolerated). Pure.
         */
        fun isNewerVersion(current: String, latestTag: String): Boolean {
            fun parts(version: String): List<Int> {
                return normalizeTag(version).split(".").map { part ->
                    part.takeWhile { it.isDigit() }.toIntOrNull() ?: 0
                }
            }
            val left = parts(current)
            val right = parts(latestTag)
            val width = maxOf(left.size, right.size).coerceAtLeast(1)
            for (i in 0 until width) {
                val a = left.getOrElse(i) { 0 }
                val b = right.getOrElse(i) { 0 }
                if (b != a) return b > a
            }
            return false
        }

        /**
         * Installed version name, or "0" when unreadable (forces update
         * prompts only against real tags, never crashes). Pure-ish.
         */
        @Suppress("DEPRECATION")
        fun installedVersionName(context: Context): String {
            return try {
                context.packageManager.getPackageInfo(context.packageName, 0)?.versionName ?: "0"
            } catch (_: Exception) {
                "0"
            }
        }
    }
}
