const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx','utf8').split('\n');

// Fix the broken word count block at lines 2207-2211 (0-indexed: 2206-2210)
// Current broken content:
//   2207:           return (
//   2208:             <div ...>
//   2209:               <span>{words} words</span>
//   2210:           );
//   2211:         })()}
//
// Should be:
//   return (
//     <div ...>
//       <span>{words} words</span>
//       <span>•</span>
//       <span>~{mins > 0 ? `${mins}m ` : ''}{remainSecs}s read time @ 130 wpm</span>
//     </div>
//   );
// })()}
// </div>

const fixed = [
  `                           return (`,
  `                             <div className="flex items-center gap-4 text-xs text-slate-500">`,
  `                               <span>{words} words</span>`,
  `                               <span>•</span>`,
  `                               <span>~{mins > 0 ? \`\${mins}m \` : ''}{remainSecs}s read time @ 130 wpm</span>`,
  `                             </div>`,
  `                           );`,
  `                         })()}`,
  `                       </div>`,
];

// Replace lines 2206..2210 (0-indexed)
lines.splice(2206, 5, ...fixed);
fs.writeFileSync('src/App.tsx', lines.join('\n'), 'utf8');
console.log('Fixed. Context:');
lines.slice(2202, 2225).forEach((l,i)=>console.log(2203+i, l.substring(0,90)));
