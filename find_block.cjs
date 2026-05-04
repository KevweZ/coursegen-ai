const fs = require('fs');
const c = fs.readFileSync('src/App.tsx', 'utf8');
const marker = "|| currentSlide?.type === 'key-takeaways'";
const idx = c.indexOf(marker);
console.log('idx:', idx);
if (idx > 0) {
  // Get 600 chars around the block
  console.log(JSON.stringify(c.substring(idx - 60, idx + 600)));
}
