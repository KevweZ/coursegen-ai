const fs = require("fs");
let content = fs.readFileSync("src/App.tsx", "utf-8");
const lines = content.split('\n');

// Fix line 1631 (0-indexed: 1630) — the Knowledge Board points line with garbled template literal
console.log("Line 1631:", lines[1630].trim());

lines[1630] = `                                  <div key={String(cat)+pts} className="bg-indigo-700 hover:bg-indigo-600 border border-indigo-600 text-yellow-300 font-black text-xl text-center p-4 rounded-lg cursor-pointer transition-all">{'$' + pts}</div>`;

content = lines.join('\n');
fs.writeFileSync("src/App.tsx", content, "utf-8");
console.log("Fixed line 1631");
console.log("New content:", lines[1630].trim());
