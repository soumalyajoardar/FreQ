with open('app/src/main/java/com/gresseymusic/wave/MainActivity.kt', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('''            WaveNavGraph(
                navController = navController,
                modifier = Modifier
                    .fillMaxSize()
            )''', '''            WaveNavGraph(
                navController = navController,
                modifier = Modifier
                    .fillMaxSize()
                    .then(if (hazeState != null) Modifier.haze(hazeState) else Modifier),
            )''')

with open('app/src/main/java/com/gresseymusic/wave/MainActivity.kt', 'w', encoding='utf-8') as f:
    f.write(text)
