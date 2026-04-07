const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'public', 'eLearning Template Backgrounds');
const backgroundThemes = {};

if (fs.existsSync(baseDir)) {
  const themes = fs.readdirSync(baseDir);
  for (const theme of themes) {
    const themeDir = path.join(baseDir, theme);
    if (fs.statSync(themeDir).isDirectory()) {
      const files = fs.readdirSync(themeDir);
      backgroundThemes[theme] = files.map(f => `/eLearning Template Backgrounds/${theme}/${f}`);
    }
  }
}

fs.writeFileSync(
  path.join(__dirname, 'src', 'lib', 'backgroundData.json'),
  JSON.stringify(backgroundThemes, null, 2)
);
console.log('Successfully generated backgroundData.json');
