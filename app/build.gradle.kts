plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

import java.util.Properties

android {
    namespace = "com.gresseymusic.wave"
    compileSdk {
        version = release(37)
    }

    // First universal APK (M28): release is signed so it installs. By
    // default it uses the local debug keystore; drop a production
    // keystore in via local.properties (wave.storeFile, wave.storePassword,
    // wave.keyAlias, wave.keyPassword) to ship outside this machine.
    // local.properties is gitignored, so secrets never enter the repo.
    val waveProps = Properties().also { props ->
        rootProject.file("local.properties").takeIf { it.exists() }?.inputStream()?.use { props.load(it) }
    }
    signingConfigs {
        create("release") {
            val fallbackStore = "${System.getProperty("user.home")}/.android/debug.keystore"
            storeFile = file(waveProps.getProperty("wave.storeFile", fallbackStore))
            storePassword = waveProps.getProperty("wave.storePassword", "android")
            keyAlias = waveProps.getProperty("wave.keyAlias", "androiddebugkey")
            keyPassword = waveProps.getProperty("wave.keyPassword", "android")
        }
    }

    defaultConfig {
        applicationId = "com.gresseymusic.wave"
        minSdk = 26
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            optimization {
                enable = false
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.core)
    implementation(libs.androidx.compose.foundation)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.media3.exoplayer)
    implementation(libs.androidx.media3.session)
    implementation(libs.androidx.media3.ui)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.com.squareup.okhttp3.okhttp)
    implementation(libs.newpipe.extractor)
    implementation(libs.io.coil.kt.compose)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    testImplementation(libs.junit)
    // Real org.json for JVM unit tests: the android.jar stub throws
    // "not mocked" for JSONObject/JSONArray. Scoped to tests only —
    // production keeps the framework implementation.
    testImplementation(libs.org.json)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.junit)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
    debugImplementation(libs.androidx.compose.ui.tooling)
    implementation(libs.dev.chrisbanes.haze)
    implementation(libs.prismal.agsl)
}
