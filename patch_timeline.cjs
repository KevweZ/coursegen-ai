const fs = require('fs');
let src = fs.readFileSync('src/App.tsx', 'utf8');

// Use the exact indentation shown in the context output
const OLD = `type === 'timeline' && (\r\n                                  <div className="space-y-6 w-full">\r\n                                    <SlideHeader title={currentSlide.title} theme={theme} />\r\n                                    <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />`;

const idx = src.indexOf(OLD);
if (idx === -1) { console.error('❌'); process.exit(1); }

// Find the full block end (closing )} of the timeline section)
const blockStart = src.lastIndexOf('{currentSlide?.', idx);
const blockEnd = src.indexOf('\n                               {currentSlide?.type === \'sorting\'', idx);
const oldBlock = src.substring(blockStart, blockEnd);
console.log('Found block length:', oldBlock.length);
console.log('End chars:', JSON.stringify(oldBlock.slice(-50)));

const newBlock = `{currentSlide?.type === 'timeline' && (\r\n                                   <div className="space-y-4 w-full">\r\n                                     <SlideHeader title={currentSlide.title} theme={theme} />\r\n                                     {currentSlide.content && (\r\n                                       <SlideContent content={sanitizeContent(currentSlide.content)} theme={theme} compact />\r\n                                     )}\r\n                                     <ChevronTimeline\r\n                                       events={(currentSlide.data || currentSlide.interactions?.[0] || {}).events || []}\r\n                                       theme={theme}\r\n                                       accentColor={slideAccentColor}\r\n                                     />\r\n                                   </div>\r\n                                 )}\r\n`;

src = src.substring(0, blockStart) + newBlock + src.substring(blockEnd);
fs.writeFileSync('src/App.tsx', src, 'utf8');
console.log('✔ Timeline block replaced');
