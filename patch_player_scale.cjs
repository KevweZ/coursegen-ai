// patch_player_scale.cjs — applies scale-to-fit layout to the player frame
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(file, 'utf8');

// Helper: replace first occurrence using exact CRLF matching
function replace(old, neo) {
  const oldCRLF = old.replace(/\n/g, '\r\n');
  const idx = content.indexOf(oldCRLF);
  if (idx < 0) {
    // Try LF
    const idxLF = content.indexOf(old);
    if (idxLF < 0) { console.error('NOT FOUND:\n', old.substring(0, 100)); process.exit(1); }
    content = content.substring(0, idxLF) + neo + content.substring(idxLF + old.length);
  } else {
    content = content.substring(0, idx) + neo + content.substring(idx + oldCRLF.length);
  }
  console.log('✔ replaced:', old.substring(0, 60).replace(/\s+/g, ' '));
}

// 1) Replace the slide frame className — remove old fixed-size classes, leave empty for scaled mode
replace(
  `"transition-all duration-500 flex flex-col relative z-10",
                    viewMode === 'desktop'
                      ? playerConfig.playerResolution === '4:3'
                        ? 'shadow-2xl overflow-hidden mx-auto my-4 md:rounded-2xl border border-white/20'
                        : playerConfig.playerResolution === 'full'
                        ? 'flex-1 overflow-hidden w-full'  /* fills flex-col parent; PlayerBar stays visible */
                        : 'shadow-2xl overflow-hidden w-full max-w-5xl mx-auto my-4 h-[calc(100vh-260px)] md:rounded-2xl border border-white/20'
                      : 'shadow-2xl overflow-hidden w-[375px] h-[667px] my-4 rounded-[3rem] border-[8px] border-gray-800',`,
  `"transition-all duration-500 flex flex-col relative z-10",
                    viewMode === 'desktop'
                      ? playerConfig.playerResolution === 'full'
                        ? 'flex-1 overflow-hidden w-full'
                        : '' /* sizing applied via scaler.frameStyle */
                      : 'shadow-2xl overflow-hidden w-[375px] h-[667px] my-4 rounded-[3rem] border-[8px] border-gray-800',`
);

// 2) Replace the style prop on the frame — add scaler.frameStyle for desktop non-full
replace(
  `style={viewMode === 'desktop' && playerConfig.playerResolution === '4:3'
                    ? { aspectRatio: '4/3', maxWidth: '900px', width: '100%' }
                    : undefined
                  }>`,
  `style={viewMode === 'desktop'
                    ? playerConfig.playerResolution === 'full'
                      ? undefined
                      : {
                          // Articulate-style: fixed design size + CSS scale to fill viewport
                          ...scaler.frameStyle,
                          borderRadius: '1rem',
                          overflow: 'hidden',
                          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.12)',
                        }
                    : undefined
                  }>`
);

// 3) The inner scroll div: for scaled mode, overflow-y-auto on a fixed-size frame
//    means content scrolls within the frame — keep as-is, it works correctly.
//    Just update padding to use consistent values.
replace(
  `playerConfig.playerResolution === 'full' ? 'p-6 md:p-12 pb-4 text-lg' : 'p-4 md:p-8 pb-4',`,
  `playerConfig.playerResolution === 'full' ? 'p-8 md:p-12 pb-4 text-lg' : 'p-6 md:p-10 pb-4',`
);

fs.writeFileSync(file, content, 'utf8');
console.log('✅ Scale-to-fit patch applied successfully');
