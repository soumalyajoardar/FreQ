with open('app/src/main/java/com/gresseymusic/wave/MainActivity.kt', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('''    LaunchedEffect(hasCompletedOnboarding) {
        if (!hasCompletedOnboarding) {
            showOnboardingModal = true
        }
    }
    LaunchedEffect(Unit) {
        try {
            userPreferences.incrementAppOpenCount()
        } catch (_: Exception) {}
    }''', '''    LaunchedEffect(hasCompletedOnboarding) {
        if (!hasCompletedOnboarding) {
            showOnboardingModal = true
        }
    }''')

with open('app/src/main/java/com/gresseymusic/wave/MainActivity.kt', 'w', encoding='utf-8') as f:
    f.write(text)
