const fs = require('fs');
let src = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add import after BranchingScenario import line
const importAnchor = "BranchingScenario";
const importLine = src.indexOf("  BranchingScenario");
const importEnd = src.indexOf('\n', importLine);
const importSnippet = "\nimport { DialogueBranchingScenario } from './components/interactions/DialogueBranchingScenario';";
src = src.slice(0, importEnd + 1) + importSnippet + src.slice(importEnd + 1);
console.log('✔ Import added');

// 2. Replace BranchingScenario usage with DialogueBranchingScenario
const OLD_USAGE = '<BranchingScenario nodes={normNodes} startNodeId={startId} />';
const NEW_USAGE = '<DialogueBranchingScenario nodes={normNodes} startNodeId={startId} theme={theme} accentColor={slideAccentColor} />';
if (src.includes(OLD_USAGE)) {
  src = src.replace(OLD_USAGE, NEW_USAGE);
  console.log('✔ BranchingScenario replaced with DialogueBranchingScenario');
} else {
  // CRLF
  const OLD_CRLF = OLD_USAGE.replace(/\n/g, '\r\n');
  if (src.includes(OLD_CRLF)) {
    src = src.replace(OLD_CRLF, NEW_USAGE);
    console.log('✔ Replaced (CRLF)');
  } else {
    console.error('❌ Could not find usage to replace');
  }
}

fs.writeFileSync('src/App.tsx', src, 'utf8');
