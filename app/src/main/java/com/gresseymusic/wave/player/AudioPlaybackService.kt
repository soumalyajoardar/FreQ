package com.gresseymusic.wave.player

import android.media.audiofx.PresetReverb
import android.util.Log
import androidx.media3.common.AudioAttributes
import androidx.media3.common.AuxEffectInfo
import androidx.media3.common.C
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

@UnstableApi
class AudioPlaybackService : MediaSessionService() {

    private var mediaSession: MediaSession? = null
    private var player: ExoPlayer? = null
    private var nightcoreReverb: PresetReverb? = null

    override fun onCreate() {
        super.onCreate()

        val audioAttributes = AudioAttributes.Builder()
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .setUsage(C.USAGE_MEDIA)
            .build()

        val exoPlayer = ExoPlayer.Builder(this)
            .setAudioAttributes(audioAttributes, true)
            .setHandleAudioBecomingNoisy(true)
            // Audio-only fast start: small buffers so audible playback
            // begins sooner on slow networks instead of prefilling 50s.
            .setLoadControl(
                DefaultLoadControl.Builder()
                    .setBufferDurationsMs(
                        /* minBufferMs= */ 15_000,
                        /* maxBufferMs= */ 30_000,
                        /* bufferForPlaybackMs= */ 1_000,
                        /* bufferForPlaybackAfterRebufferMs= */ 2_000,
                    )
                    .build(),
            )
            .build()

        player = exoPlayer
        activeService = this
        applyNightcoreToPlayer()

        val sessionActivityPendingIntent = packageManager?.getLaunchIntentForPackage(packageName)?.let { sessionIntent ->
            android.app.PendingIntent.getActivity(
                this,
                0,
                sessionIntent,
                android.app.PendingIntent.FLAG_IMMUTABLE or android.app.PendingIntent.FLAG_UPDATE_CURRENT,
            )
        }

        val sessionBuilder = MediaSession.Builder(this, exoPlayer)
        if (sessionActivityPendingIntent != null) {
            sessionBuilder.setSessionActivity(sessionActivityPendingIntent)
        }
        mediaSession = sessionBuilder.build()
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }

    override fun onDestroy() {
        if (activeService === this) activeService = null
        try {
            nightcoreReverb?.release()
        } catch (_: Exception) {
        }
        nightcoreReverb = null
        mediaSession?.run {
            player.release()
            release()
        }
        mediaSession = null
        player = null
        super.onDestroy()
    }

    /**
     * Applies the current audio flavor to the owned ExoPlayer as a
     * best-effort aux reverb send (50% wet for SnR, dry otherwise).
     * Never throws; devices without aux routing simply stay dry while the
     * UI state + speed/pitch (applied via the controller) stay exact.
     */
    private fun applyNightcoreToPlayer() {
        val exo = player ?: return
        val wantReverb = audioMode == AudioMode.SNR
        try {
            if (!wantReverb) {
                try {
                    exo.setAuxEffectInfo(AuxEffectInfo(AuxEffectInfo.NO_AUX_EFFECT_ID, NO_REVERB_SEND))
                } catch (_: Exception) {
                }
                try {
                    nightcoreReverb?.setEnabled(false)
                } catch (_: Exception) {
                }
                return
            }
            var reverb = nightcoreReverb
            if (reverb == null) {
                reverb = try {
                    PresetReverb(0, 0).apply {
                        setPreset(PresetReverb.PRESET_LARGEHALL)
                        setEnabled(true)
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "[Nightcore] PresetReverb create failed", e)
                    null
                }
                nightcoreReverb = reverb
            } else {
                try {
                    reverb.setEnabled(true)
                } catch (_: Exception) {
                }
            }
            val effectId = try {
                reverb?.id ?: AuxEffectInfo.NO_AUX_EFFECT_ID
            } catch (_: Exception) {
                AuxEffectInfo.NO_AUX_EFFECT_ID
            }
            if (effectId != AuxEffectInfo.NO_AUX_EFFECT_ID) {
                exo.setAuxEffectInfo(AuxEffectInfo(effectId, SNR_REVERB_SEND))
            }
        } catch (e: Exception) {
            Log.w(TAG, "[Nightcore] aux routing failed", e)
        }
    }

    companion object {
        private const val TAG = "AudioPlaybackService"

        /**
         * Latest audio flavor. Written by PlaybackManager (UI process side
         * of the same app); read by the service when applying DSP. Volatile
         * so controller callbacks and service creation never see a stale
         * value. Defaults to Normal.
         */
        @Volatile
        var audioMode: AudioMode = AudioMode.NORMAL
            private set

        @Volatile
        private var activeService: AudioPlaybackService? = null

        /**
         * Records the flavor and applies it to the live player when the
         * service instance exists. Safe to call before onCreate (applies on
         * creation) and from any thread. Never throws.
         */
        fun setAudioMode(mode: AudioMode) {
            audioMode = mode
            try {
                activeService?.applyNightcoreToPlayer()
            } catch (_: Exception) {
            }
        }
    }
}
