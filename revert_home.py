with open('app/src/main/java/com/gresseymusic/wave/ui/screens/HomeScreen.kt', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('var homeEntered by androidx.compose.runtime.saveable.rememberSaveable { mutableStateOf(false) }', 'var homeEntered by remember { mutableStateOf(false) }')

old_anchor = 'val appOpenCount by userPreferences.appOpenCountFlow.collectAsState(initial = 0)'
new_addition = old_anchor + '''

    // Rotating headline: increments once per Home entry so the editorial
    // line changes every app open ("Music for your day." family).
    LaunchedEffect(Unit) {
        try {
            userPreferences.incrementAppOpenCount()
        } catch (_: Exception) {
        }
    }'''

text = text.replace(old_anchor, new_addition)

with open('app/src/main/java/com/gresseymusic/wave/ui/screens/HomeScreen.kt', 'w', encoding='utf-8') as f:
    f.write(text)
