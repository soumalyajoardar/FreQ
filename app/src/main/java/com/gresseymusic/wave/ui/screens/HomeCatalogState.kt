package com.gresseymusic.wave.ui.screens

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleObserver
import androidx.lifecycle.lifecycleScope
import com.gresseymusic.wave.data.model.HomeCatalogSection
import com.gresseymusic.wave.data.repository.CatalogResult
import com.gresseymusic.wave.data.repository.MusicRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.SupervisorJob

/**
 * Holder for Home catalog state, hoisted to app-shell level so it survives
 * navigation away/back to Home without re-fetching.
 */
class HomeCatalogState(
    private val musicRepository: MusicRepository,
) {
    var catalogResult by mutableStateOf<CatalogResult<List<HomeCatalogSection>>?>(null)
        private set
    var retryCount by mutableStateOf(0)
        private set

    private val scope = kotlinx.coroutines.CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun load() {
        scope.launch {
            try {
                catalogResult = musicRepository.getHomeCatalog()
            } catch (e: CancellationException) {
                throw e
            }
        }
    }

    fun retry() {
        retryCount++
        load()
    }
}

val LocalHomeCatalogState = staticCompositionLocalOf<HomeCatalogState> {
    error("HomeCatalogState not provided")
}

/**
 * Loads the home catalog once at app-shell level and provides it via
 * [LocalHomeCatalogState]. Subsequent HomeScreen visits read the cached result.
 */
@Composable
fun ProvideHomeCatalogState(
    musicRepository: MusicRepository,
    content: @Composable () -> Unit,
) {
    val catalogState = remember(musicRepository) { HomeCatalogState(musicRepository) }
    val lifecycleOwner = androidx.lifecycle.compose.LocalLifecycleOwner.current
    val lifecycleObserver = object : DefaultLifecycleObserver {
        override fun onStart(owner: LifecycleOwner) {
            catalogState.load()
        }
    }
    androidx.compose.runtime.DisposableEffect(lifecycleOwner.lifecycle) {
        lifecycleOwner.lifecycle.addObserver(lifecycleObserver)
        onDispose { lifecycleOwner.lifecycle.removeObserver(lifecycleObserver) }
    }
    CompositionLocalProvider(LocalHomeCatalogState provides catalogState) {
        content()
    }
}