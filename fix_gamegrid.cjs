const fs = require("fs");
let content = fs.readFileSync("src/App.tsx", "utf-8");
const lines = content.split('\n');

// Find line with getRecommendedGames in the gamification grid (not in the import)
let startLine = -1;
let endLine = -1;
for (let i = 20; i < lines.length; i++) {
  if (lines[i].includes('getRecommendedGames(pathway, preset).map') && startLine === -1) {
    // Walk back to find container div
    for (let j = i; j >= i-8; j--) {
      if (lines[j].includes('<div className=') && lines[j].includes('grid-cols')) {
        startLine = j;
        break;
      }
    }
    if (startLine === -1) startLine = i - 3;
    // Walk forward to find end of this map block
    let depth = 0;
    for (let j = i; j < lines.length; j++) {
      const l = lines[j];
      depth += (l.match(/\{/g)||[]).length - (l.match(/\}/g)||[]).length;
      if (depth === 0 && j > i + 3) {
        // Check if the next line closes a div
        for (let k = j+1; k <= j+4; k++) {
          if (lines[k] && lines[k].trim() === '</div>') {
            endLine = k;
            break;
          }
        }
        if (endLine === -1) endLine = j + 1;
        break;
      }
    }
    break;
  }
}

console.log("Gamification grid: start=", startLine+1, "end=", endLine+1);
console.log("Start line:", lines[startLine]);
console.log("End line:", lines[endLine]);

const newSection = [
  `                         <div className="p-6">`,
  `                           <p className="text-xs text-orange-400 font-bold tracking-widest uppercase mb-5">CLICK TO SELECT • EYE ICON TO PREVIEW</p>`,
  `                           <div className="grid grid-cols-2 md:grid-cols-3 gap-3">`,
  `                            {getRecommendedGames(pathway, preset).map((gt: any) => {`,
  `                              const isSelected = gameTemplateIds.includes(gt.id);`,
  `                              const NICKNAMES: Record<string, {emoji:string; aka:string}> = {`,
  `                                'jeopardy': { emoji: '📺', aka: 'aka Jeopardy!' },`,
  `                                'knowledge-board': { emoji: '📺', aka: 'aka Jeopardy!' },`,
  `                                'millionaire': { emoji: '💰', aka: "aka Who Wants to Be a Millionaire" },`,
  `                                'millionaire-challenge': { emoji: '💰', aka: "aka Who Wants to Be a Millionaire" },`,
  `                                'family-feud': { emoji: '👨‍👩‍👧', aka: 'aka Family Feud' },`,
  `                                'ranked-survey': { emoji: '👨‍👩‍👧', aka: 'aka Family Feud' },`,
  `                                'escape-room': { emoji: '🔒', aka: 'aka Digital Escape Room' },`,
  `                                'digital-escape-room': { emoji: '🔒', aka: 'aka Digital Escape Room' },`,
  `                                'spin-wheel': { emoji: '🎡', aka: 'aka Spin the Wheel' },`,
  `                                'spin-the-wheel': { emoji: '🎡', aka: 'aka Spin the Wheel' },`,
  `                                'price-is-right': { emoji: '🏷️', aka: "aka The Price is Right" },`,
  `                                'price-estimator': { emoji: '🏷️', aka: "aka The Price is Right" },`,
  `                              };`,
  `                              const nick = NICKNAMES[gt.id] || { emoji: '🎮', aka: '' };`,
  `                              return (`,
  `                                <div key={gt.id} className={\`relative flex flex-col items-center text-center gap-1.5 p-4 rounded-xl border-2 transition-all \${isSelected ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'}\`}>`,
  `                                  <div className="absolute top-2 right-2 text-slate-400 hover:text-orange-300 cursor-pointer z-20 bg-slate-900 rounded-full p-1" onClick={(e) => { e.stopPropagation(); setPreviewModalOption(gt.title); }}>`,
  `                                    <Eye className="w-4 h-4"/>`,
  `                                  </div>`,
  `                                  <button className="absolute inset-0 z-10 w-full h-full" onClick={() => {`,
  `                                    if (isSelected) setGameTemplateIds(gameTemplateIds.filter(id => id !== gt.id));`,
  `                                    else setGameTemplateIds([...gameTemplateIds, gt.id]);`,
  `                                  }} />`,
  `                                  <span className="text-2xl relative z-0">{nick.emoji}</span>`,
  `                                  <span className="font-bold text-sm relative z-0 leading-snug">{gt.title}</span>`,
  `                                  {nick.aka && <span className="text-[10px] opacity-50 relative z-0 leading-snug italic">{nick.aka}</span>}`,
  `                                </div>`,
  `                              );`,
  `                            })}`,
  `                           </div>`,
  `                         </div>`,
];

if (startLine !== -1 && endLine !== -1) {
  lines.splice(startLine, endLine - startLine + 1, ...newSection);
  fs.writeFileSync("src/App.tsx", lines.join('\n'), "utf-8");
  console.log("✅ Gamification grid replaced successfully!");
  console.log("New total lines:", lines.length);
} else {
  console.log("❌ Could not find the gamification grid range");
}
