const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');
let fixed = 0;

function patch(label, marker, replacement) {
  const idx = c.indexOf(marker);
  if (idx < 0) { console.error('❌', label); return; }
  c = c.substring(0, idx) + replacement + c.substring(idx + marker.length);
  console.log('✔', label);
  fixed++;
}

// 1. Canvas className — use flex-col for all desktop modes
patch('canvas flex-col',
  '"bg-cover bg-center relative",\r\n                      playerConfig.playerResolution === \'full\'\r\n                        ? \'flex flex-col flex-1 overflow-hidden\'\r\n                        : \'flex-1 flex items-center justify-center overflow-hidden\'',
  '"bg-cover bg-center relative flex flex-col flex-1 overflow-hidden"'
);

// 2. Frame className — use flex-1 w-full for all desktop modes (not just full)
patch('frame className flex-fill',
  "? playerConfig.playerResolution === 'full'\r\n                        ? 'flex-1 overflow-hidden w-full'\r\n                        : '' /* sizing applied via scaler.frameStyle */",
  "? 'flex-1 overflow-hidden w-full'"
);

// 3. Frame style — keep visual styling, drop scaler.frameStyle 
patch('frame style remove scaler',
  "=== 'full'\r\n                      ? undefined\r\n                      : {\r\n                          // Articulate-style: fixed design size + CSS scale to fill viewport\r\n                          ...scaler.frameStyle,\r\n                          borderRadius: '1rem',\r\n                          overflow: 'hidden',\r\n                          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',\r\n                          border: '1px solid rgba(255,255,255,0.12)',\r\n                        }",
  "!== 'full'\r\n                      ? {\r\n                          borderRadius: '1rem',\r\n                          overflow: 'hidden',\r\n                          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',\r\n                          border: '1px solid rgba(255,255,255,0.12)',\r\n                          margin: '0.75rem',\r\n                        }\r\n                      : undefined"
);

fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log(`\n${fixed}/3 patches applied.`);
