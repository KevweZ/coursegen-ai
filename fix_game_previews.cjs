const fs = require('fs');
let c = fs.readFileSync('src/components/interactions/ExtraPreviews.tsx', 'utf8');

if (!c.includes('import { GameContainer }')) {
  c = "import { GameContainer } from '../game-templates/core/GameContainer';\n" + c;
}

c = c.replace(/'Ranked Survey': 'survey-says',/g, "'Ranked Survey': 'survey-says',\n    'Ranked Survey (Family Feud)': 'survey-says',");

fs.writeFileSync('src/components/interactions/ExtraPreviews.tsx', c);
console.log('Fixed ExtraPreviews imports and template strings');
