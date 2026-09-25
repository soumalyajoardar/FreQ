with open('gradle/libs.versions.toml', 'r', encoding='utf-8') as f:
    text = f.read()
text = text.replace('haze = "1.1.1"', 'haze = "1.7.3"')
with open('gradle/libs.versions.toml', 'w', encoding='utf-8') as f:
    f.write(text)
