package com.gresseymusic.wave.data.repository

/**
 * Generation tracker that prevents stale search responses from overwriting
 * newer results (Milestone 11 fix pass).
 *
 * Each new query takes a generation via [newGeneration]; when its response
 * arrives it may only be applied if [isLatest] still holds. Combined with
 * `collectLatest` cancellation in the UI, this guarantees the visible
 * results always belong to the latest issued query. Thread-safe so late
 * responses from any dispatcher are handled correctly.
 */
class SearchSession {
    private val lock = Any()
    private var generation: Int = 0

    fun newGeneration(): Int {
        synchronized(lock) {
            generation += 1
            return generation
        }
    }

    fun isLatest(generation: Int): Boolean {
        synchronized(lock) {
            return generation == this.generation
        }
    }
}
