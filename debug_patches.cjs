const fs = require('fs');
const c = fs.readFileSync('src/App.tsx','utf8');

// 1. Find matching renderer
let idx = c.indexOf("// MatchingActivity expects");
console.log('MATCHING at',idx);
if(idx>0) console.log(JSON.stringify(c.substring(idx-80, idx+500)));

console.log('\n---SORTING---');
idx = c.indexOf("'sorting'");
while(idx>0) {
  if(c.substring(idx-2,idx+200).includes('type ===')) { 
    console.log(JSON.stringify(c.substring(idx-30,idx+350))); 
    break; 
  }
  idx = c.indexOf("'sorting'", idx+1);
}

console.log('\n---BRANCHING---');
idx = c.indexOf("normNodes[startId]");
if(idx>0) console.log(JSON.stringify(c.substring(idx-200,idx+300)));

console.log('\n---CLOSING BRACES---');
idx = c.indexOf("isFullBleed\n            ? \"absolute");
if(idx<0) idx = c.indexOf("isFullBleed");
console.log('isFullBleed at', idx);
// Find the AnimatePresence closing
let i2 = c.indexOf("</AnimatePresence>", idx);
console.log(JSON.stringify(c.substring(i2-100, i2+50)));
