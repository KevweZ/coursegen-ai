// fix_scaler_wire.cjs — wires scaler.containerRef to canvas div
const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

// The canvas div currently has no ref. Add it.
const OLD_CANVAS_OPEN = `{/* Background canvas */}\r\n                  <div\r\n                    className={cn(\r\n                      "bg-cover bg-center relative",\r\n                      playerConfig.playerResolution === 'full'\r\n                        ? 'flex flex-col flex-1 overflow-hidden'\r\n                        : 'flex-1 flex items-center justify-center overflow-hidden'\r\n                    )}\r\n                    style={{\r\n                      backgroundImage: courseBg && !courseBg.startsWith('#') ? \`url('\${courseBg}')\` : undefined,\r\n                      // Canvas is always white \u2014 theme color lives on the SLIDE FRAME not the canvas\r\n                      backgroundColor: courseBg && courseBg.startsWith('#') ? courseBg : '#ffffff',\r\n                    }}\r\n                  >`;

const NEW_CANVAS_OPEN = `{/* Background canvas \u2014 scaler measures this div to compute transform scale */}\r\n                  <div\r\n                    ref={viewMode === 'desktop' && playerConfig.playerResolution !== 'full' ? scaler.containerRef : undefined}\r\n                    className={cn(\r\n                      "bg-cover bg-center relative",\r\n                      playerConfig.playerResolution === 'full'\r\n                        ? 'flex flex-col flex-1 overflow-hidden'\r\n                        : 'flex-1 flex items-center justify-center overflow-hidden'\r\n                    )}\r\n                    style={{\r\n                      backgroundImage: courseBg && !courseBg.startsWith('#') ? \`url('\${courseBg}')\` : undefined,\r\n                      backgroundColor: '#ffffff',\r\n                    }}\r\n                  >`;

// Try CRLF first, then LF
if (c.includes(OLD_CANVAS_OPEN)) {
  c = c.replace(OLD_CANVAS_OPEN, NEW_CANVAS_OPEN);
  console.log('✔ canvas ref wired (CRLF)');
} else {
  const OLD_LF = OLD_CANVAS_OPEN.replace(/\r\n/g, '\n');
  const NEW_LF = NEW_CANVAS_OPEN.replace(/\r\n/g, '\n');
  if (c.includes(OLD_LF)) {
    c = c.replace(OLD_LF, NEW_LF);
    console.log('✔ canvas ref wired (LF)');
  } else {
    console.error('❌ canvas open NOT FOUND');
    const i = c.indexOf('{/* Background canvas');
    console.log(c.substring(i, i + 600));
    process.exit(1);
  }
}

// Also verify the frame style has scaler.frameStyle
if (c.includes('scaler.frameStyle')) {
  console.log('✔ scaler.frameStyle already in frame style');
} else {
  console.error('❌ scaler.frameStyle missing from frame — check patch_player_scale output');
}

fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log('✅ done');
