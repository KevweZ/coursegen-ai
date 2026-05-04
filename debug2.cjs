const fs = require('fs');
const c = fs.readFileSync('src/App.tsx', 'utf8');

// Check what's around the AnimatePresence closing
let idx = c.indexOf('</AnimatePresence>');
while (idx > 0) {
  const ctx = c.substring(idx, idx+120);
  if (ctx.includes('Learner') || !c.substring(idx+20, idx+200).includes('</AnimatePresence>')) {
    console.log('ANIM CLOSE:', JSON.stringify(ctx));
    break;
  }
  idx = c.indexOf('</AnimatePresence>', idx+1);
}

// Check title slide wrapper
idx = c.indexOf('-1.5rem -2.5rem');
if (idx<0) idx = c.indexOf('margin: ');
console.log('MARGIN IDX:', idx);
if (idx>0) console.log(JSON.stringify(c.substring(idx-100, idx+100)));

// Check matching
idx = c.indexOf('matchingProps = (()');
if (idx>0) console.log('MATCHING:', JSON.stringify(c.substring(idx, idx+400)));

// Check branching - what wraps BranchingScenario
idx = c.indexOf('BranchingScenario nodes=');
if (idx>0) console.log('BRANCHING:', JSON.stringify(c.substring(idx-200, idx+60)));
