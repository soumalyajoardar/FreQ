package com.gresseymusic.wave.data.repository

import org.junit.Assert.*
import org.junit.Test

/**
 * Tests for the search generation tracker (Milestone 11 fix pass).
 * Each new query invalidates all previous generations so a stale response
 * can never overwrite newer results.
 */
class SearchSessionTest {

    @Test
    fun `first generation is current`() {
        val session = SearchSession()
        val gen = session.newGeneration()
        assertTrue(session.isLatest(gen))
    }

    @Test
    fun `new generation invalidates previous one`() {
        val session = SearchSession()
        val stale = session.newGeneration()
        val current = session.newGeneration()
        assertFalse(session.isLatest(stale))
        assertTrue(session.isLatest(current))
    }

    @Test
    fun `only the latest of many generations is current`() {
        val session = SearchSession()
        val gens = List(10) { session.newGeneration() }
        gens.dropLast(1).forEach { assertFalse(session.isLatest(it)) }
        assertTrue(session.isLatest(gens.last()))
    }

    @Test
    fun `unknown generation is never current`() {
        val session = SearchSession()
        session.newGeneration()
        assertFalse(session.isLatest(999))
    }

    @Test
    fun `sessions are independent`() {
        val first = SearchSession()
        val second = SearchSession()
        val gen = first.newGeneration()
        assertTrue(first.isLatest(gen))
        assertFalse(second.isLatest(gen))
    }
}
