const fs = require('fs');

// 1. App.tsx
let appStr = fs.readFileSync('src/App.tsx', 'utf8');
appStr = appStr.replace(/\{ id: 'drag-drop', label: 'Drag & Drop' \},\n\s*/, '');
appStr = appStr.replace(/\{currentSlide\?\.type === 'drag-drop-activity' && \([\s\S]*?(?=\{\/\*|currentSlide\?\.type ===)/, '');
fs.writeFileSync('src/App.tsx', appStr);

// 2. aiService.ts
let aiStr = fs.readFileSync('src/services/aiService.ts', 'utf8');
aiStr = aiStr.replace(/matching -> "drag-drop-activity"\./, 'matching -> "matching".');
aiStr = aiStr.replace(/matching, drag-drop-activity, branching/, 'matching, branching');
aiStr = aiStr.replace(/choice or drag-drop/, 'choice');
aiStr = aiStr.replace(/\|drag-drop-activity\|/, '|');
aiStr = aiStr.replace(/\n\s*- drag-drop-activity:.*?\n/, '\n');
aiStr = aiStr.replace(/\n\s*else if \(slide\.type === 'drag-drop-activity'[\s\S]*?slide\.type = 'content';/, '');
fs.writeFileSync('src/services/aiService.ts', aiStr);

// 3. presetEngine.ts
let preStr = fs.readFileSync('src/lib/presetEngine.ts', 'utf8');
preStr = preStr.replace(/'drag-drop-activity', /g, '');
preStr = preStr.replace(/, 'drag-drop-activity'/g, '');
fs.writeFileSync('src/lib/presetEngine.ts', preStr);

// 4. course.ts
let courseStr = fs.readFileSync('src/types/course.ts', 'utf8');
courseStr = courseStr.replace(/\s*\| 'drag-drop-activity'\s*/, ' ');
courseStr = courseStr.replace(/\| 'drag-drop'/, '');
fs.writeFileSync('src/types/course.ts', courseStr);

console.log("Purge complete.");
