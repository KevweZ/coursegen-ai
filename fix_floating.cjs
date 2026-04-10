const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

// Find the AnimatePresence closing and the FloatingImageCanvas block that comes after it
// We want to move FloatingImageCanvas INSIDE the motion.div (before its closing tag)
// The motion.div content ends with </motion.div> then </AnimatePresence> then the canvas block

const oldBlock = `

                         </motion.div>
                        </AnimatePresence>

                        {/* Floating images on this slide */}
                        <FloatingImageCanvas
                          images={floatingImagesMap[currentSlide?.id] || []}
                          isAuthoring={true}
                          onChange={(imgs) => setFloatingImagesMap(prev => ({ ...prev, [currentSlide?.id]: imgs }))}
                          onRemove={(id) => setFloatingImagesMap(prev => ({
                            ...prev,
                            [currentSlide?.id]: (prev[currentSlide?.id] || []).filter(i => i.id !== id)
                          }))}
                        />
                     </div>{/* end slide content scroll area */}`;

const newBlock = `

                        {/* Floating images — inside scroll area so they scroll with content */}
                        <FloatingImageCanvas
                          images={floatingImagesMap[currentSlide?.id] || []}
                          isAuthoring={true}
                          onChange={(imgs) => setFloatingImagesMap(prev => ({ ...prev, [currentSlide?.id]: imgs }))}
                          onRemove={(id) => setFloatingImagesMap(prev => ({
                            ...prev,
                            [currentSlide?.id]: (prev[currentSlide?.id] || []).filter(i => i.id !== id)
                          }))}
                        />
                         </motion.div>
                        </AnimatePresence>
                     </div>{/* end slide content scroll area */}`;

if (c.includes(oldBlock)) {
  c = c.replace(oldBlock, newBlock);
  fs.writeFileSync('src/App.tsx', c, 'utf8');
  console.log('Task 1 DONE: FloatingImageCanvas moved inside scroll area');
} else {
  // Try to find the pattern line by line
  const lines = c.split('\n');
  const motionCloseIdx = lines.findIndex((l, i) => l.includes('</motion.div>') && lines[i+1] && lines[i+1].includes('</AnimatePresence>') && lines[i+2] && lines[i+2].trim() === '' && lines[i+3] && lines[i+3].includes('Floating images on this slide'));
  if (motionCloseIdx === -1) {
    console.log('NOT FOUND - searching for FloatingImageCanvas block...');
    const fcIdx = lines.findIndex(l => l.includes('{/* Floating images on this slide */}'));
    if (fcIdx !== -1) {
      console.log('FloatingImageCanvas comment at line:', fcIdx+1);
      console.log('Lines around it:');
      lines.slice(Math.max(0,fcIdx-5), fcIdx+5).forEach((l,i) => console.log(fcIdx-4+i, JSON.stringify(l)));
    }
  } else {
    console.log('Found via line scan at', motionCloseIdx+1);
  }
}
