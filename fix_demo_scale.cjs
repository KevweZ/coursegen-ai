// fix_demo_scale.cjs
const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

// Fix 1: scaler fallback key '16:9' (was 'widescreen')
const old1 = "playerConfig?.playerResolution ?? 'widescreen'";
const new1 = "playerConfig?.playerResolution ?? '16:9'";
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('fix1: scaler key fixed'); }
else { console.error('fix1 NOT FOUND'); }

// Fix 2: demo load — add playerConfig reset before setStep('preview')
// Find the specific demo preview onClick block
const old2marker = "setExamPhase('idle'); setHighestVisitedIndex(0);\r\n                            setNavigationMode(DUMMY_COURSE.navigationMode ?? 'free'); setStep('preview');";
const new2 = "setExamPhase('idle'); setHighestVisitedIndex(0);\r\n                            setPlayerConfig(prev => ({ ...prev, playerResolution: '16:9' }));\r\n                            setNavigationMode(DUMMY_COURSE.navigationMode ?? 'free'); setStep('preview');";
if (c.includes(old2marker)) {
  c = c.replace(old2marker, new2);
  console.log('fix2: demo playerConfig reset added');
} else {
  // try LF
  const old2lf = old2marker.replace(/\r\n/g, '\n');
  const new2lf = new2.replace(/\r\n/g, '\n');
  if (c.includes(old2lf)) { c = c.replace(old2lf, new2lf); console.log('fix2 (LF): demo playerConfig reset added'); }
  else {
    console.error('fix2 NOT FOUND');
    const idx = c.indexOf("setExamPhase('idle')");
    console.log('Context:', c.substring(idx, idx + 300));
  }
}

fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log('done');
