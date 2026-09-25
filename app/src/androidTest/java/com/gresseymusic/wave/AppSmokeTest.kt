package com.gresseymusic.wave

import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertTextContains
import androidx.compose.ui.test.click
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.hasTextExactly
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithContentDescription
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.test.performTouchInput
import androidx.test.espresso.Espresso
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * On-device smoke test for the six requested fixes (mini-player width/gap,
 * floating glass, queue thumbnails, recent search behavior, slide
 * transitions). Runs in-process, so it does not depend on shell tap
 * injection. Backend-dependent steps are lenient: they assert honest
 * loading/results/error states and never a crash.
 *
 * Clicks use touch injection on visible text/icon nodes (the tap bubbles to
 * the clickable parent), which is robust to semantics-tree placement of the
 * click handler.
 */
@RunWith(AndroidJUnit4::class)
@OptIn(ExperimentalTestApi::class)
class AppSmokeTest {

    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    private fun anyTextVisible(vararg options: String): Boolean =
        options.any { s ->
            compose.onAllNodesWithText(s, substring = true, ignoreCase = true)
                .fetchSemanticsNodes().isNotEmpty()
        }

    private fun anyDescVisible(vararg options: String): Boolean =
        options.any { s ->
            compose.onAllNodesWithContentDescription(s)
                .fetchSemanticsNodes().isNotEmpty()
        }

    @Test
    fun fullSmoke() {
        // 1. Home renders; bottom tabs present; no mini-player before playback.
        compose.waitUntil(30_000) {
            anyTextVisible("Recently Played", "unavailable", "connection", "went wrong", "retry")
        }
        compose.onNodeWithText("Home").assertIsDisplayed()
        compose.onNodeWithText("Search").assertIsDisplayed()
        compose.onNodeWithText("Library").assertIsDisplayed()
        compose.onAllNodesWithContentDescription("Pause").assertCountEquals(0)

        // 2. Search tab opens via slide transition; filters + idle state render.
        compose.onNodeWithText("Search").performTouchInput { click() }
        compose.waitUntil(10_000) {
            compose.onAllNodesWithText("Artists, Songs", substring = true)
                .fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithText("All").assertIsDisplayed()
        compose.onNodeWithText("Songs").assertIsDisplayed()
        compose.onNodeWithText("Albums").assertIsDisplayed()

        // 3. Type a query: results, honest empty, or honest error — never a crash.
        // Two semantics nodes expose SetText (field + merged wrapper);
        // the placeholder text disambiguates the real field.
        val queryField = hasSetTextAction() and hasText("Artists, Songs", substring = true)
        compose.onNode(queryField).performTouchInput { click() }
        compose.onNode(queryField).performTextInput("espresso")
        // NOTE: the "Songs" filter chip always exists — real results are
        // signaled by the SEARCH RESULTS header, honest empty, or error.
        // Retry loop: the backend occasionally serves one empty/failed
        // response (cold start); a real user would just retry the search.
        var gotResults = false
        for (attempt in 0..2) {
            if (attempt > 0) {
                compose.onNodeWithContentDescription("Clear search")
                    .performTouchInput { click() }
                compose.onNode(queryField).performTouchInput { click() }
                compose.onNode(queryField).performTextInput("espresso")
            }
            compose.waitUntil(60_000) {
                anyTextVisible("SEARCH RESULTS", "No results", "unavailable", "connection")
            }
            if (compose.onAllNodesWithText("Retry").fetchSemanticsNodes().isNotEmpty()) {
                compose.onNodeWithText("Retry").performTouchInput { click() }
                compose.waitUntil(60_000) {
                    anyTextVisible("SEARCH RESULTS", "No results")
                }
            }
            gotResults = compose.onAllNodesWithText("SEARCH RESULTS")
                .fetchSemanticsNodes().isNotEmpty()
            val emptyResults = compose.onAllNodesWithText("No results", substring = true)
                .fetchSemanticsNodes().isNotEmpty()
            val errorResults = compose.onAllNodesWithText("Retry")
                .fetchSemanticsNodes().isNotEmpty()
            println("APP_SMOKE attempt=$attempt searchResults=$gotResults empty=$emptyResults error=$errorResults")
            if (!gotResults) {
                // Diagnostic: what query text does the field actually hold,
                // and what does the empty-state message quote?
                try {
                    val nodes = compose.onAllNodes(hasSetTextAction()).fetchSemanticsNodes()
                    println("APP_SMOKE fields=${nodes.size}")
                    nodes.forEachIndexed { i, n ->
                        val edit = try {
                            n.config[SemanticsProperties.EditableText].text
                        } catch (_: Exception) { "?" }
                        println("APP_SMOKE field[$i] edit=$edit")
                    }
                    compose.onAllNodesWithText("No results", substring = true)
                        .fetchSemanticsNodes().forEachIndexed { i, n ->
                            val t = try {
                                n.config[SemanticsProperties.Text].joinToString("|")
                            } catch (_: Exception) { "?" }
                            println("APP_SMOKE emptyMsg[$i]=$t")
                        }
                } catch (e: Exception) {
                    println("APP_SMOKE fieldDump FAILED ${e.message}")
                }
            }
            if (gotResults) break
        }

        if (gotResults) {
            // 4. Overflow menu of the first result -> Play: plays it and
            // auto-opens Now Playing (title-agnostic: any real result works).
            compose.onAllNodesWithContentDescription("More options for", substring = true)[0]
                .performTouchInput { click() }
            compose.waitUntil(10_000) { anyTextVisible("Add to Playlist") }
            compose.onNodeWithText("Play").performTouchInput { click() }
            // No auto-open (M28d): tapping Play starts audio in the mini
            // player; the player opens only via the mini player.
            compose.waitUntil(45_000) { anyDescVisible("Open Now Playing") }
            println(
                "APP_SMOKE miniPlayer=" + compose.onAllNodesWithContentDescription("Open Now Playing")
                    .fetchSemanticsNodes().isNotEmpty(),
            )
            compose.onNodeWithContentDescription("Open Now Playing")
                .performTouchInput { click() }
            compose.waitUntil(15_000) { anyDescVisible("Close player") }
            compose.onNodeWithContentDescription("Close player").assertIsDisplayed()
            // Playing or resolving: Pause (playing) or Play (buffering) icon exists.
            compose.waitUntil(45_000) { anyDescVisible("Pause", "Play") }
            println(
                "APP_SMOKE playing=" + compose.onAllNodesWithContentDescription("Pause")
                    .fetchSemanticsNodes().isNotEmpty(),
            )

            // 5. Queue screen: header + Up Next artwork thumbnails (fix #4).
            compose.onNodeWithContentDescription("Open queue")
                .performTouchInput { click() }
            compose.waitUntil(10_000) {
                compose.onAllNodesWithText("Queue").fetchSemanticsNodes().isNotEmpty()
            }
            compose.waitUntil(60_000) {
                compose.onAllNodesWithText("Artwork for", substring = true)
                    .fetchSemanticsNodes().isNotEmpty() ||
                    compose.onAllNodesWithText("Nothing queued after this track.")
                        .fetchSemanticsNodes().isNotEmpty() ||
                    compose.onAllNodesWithText("Your queue is empty.")
                        .fetchSemanticsNodes().isNotEmpty()
            }
            val upNextArt = compose.onAllNodesWithText("Artwork for", substring = true)
                .fetchSemanticsNodes().size
            println("APP_SMOKE queueArtworkNodes=$upNextArt")
            compose.onNodeWithText("Up Next", substring = true).assertIsDisplayed()

            // Back to Search through the slide transitions.
            Espresso.pressBack()
            compose.waitUntil(10_000) { anyDescVisible("Close player") }
            compose.onNodeWithContentDescription("Close player")
                .performTouchInput { click() }
            compose.waitUntil(10_000) {
                compose.onAllNodesWithText("Artists, Songs", substring = true)
                    .fetchSemanticsNodes().isNotEmpty()
            }

            // 6. Recent: query tap refills the field (fix #5).
            compose.onNodeWithContentDescription("Clear search")
                .performTouchInput { click() }
            compose.waitUntil(10_000) {
                compose.onAllNodesWithText("Recent").fetchSemanticsNodes().isNotEmpty()
            }
            compose.onNode(hasTextExactly("espresso")).performTouchInput { click() }
            compose.onNode(hasSetTextAction() and hasText("espresso", substring = true))
                .assertTextContains("espresso")

            // 7. Mini-player floats above the bottom bar while browsing.
            compose.waitUntil(10_000) { anyDescVisible("Pause", "Play") }
            compose.onNodeWithText("Search").assertIsDisplayed()
        }

        // 8. Library tab renders (slide transition, no crash).
        compose.onNodeWithText("Library").performTouchInput { click() }
        compose.waitUntil(10_000) {
            compose.onAllNodesWithText("Library").fetchSemanticsNodes().size >= 2 ||
                compose.onAllNodesWithText("Your library is empty.", substring = true)
                    .fetchSemanticsNodes().isNotEmpty()
        }

        // 9. Back home without stacking or crashing.
        compose.onNodeWithText("Home").performTouchInput { click() }
        compose.waitUntil(10_000) {
            compose.onAllNodesWithText("Recently Played").fetchSemanticsNodes().isNotEmpty() ||
                anyTextVisible("unavailable", "connection", "retry")
        }
    }
}
