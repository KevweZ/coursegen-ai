const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

const marker = `                      <PlayerBar\r\n                        player={player}\r\n                        currentSlideIndex={currentSlideIndex}\r\n                        totalSlides={allSlides.length}\r\n                        currentSlideTitle={currentSlide?.title ?? ''}\r\n                        onPrev={handlePrev}\r\n                        onNext={handleNext}\r\n                        theme={theme}\r\n                      />`;

const replacement = `                      <PlayerBar
                        player={player}
                        currentSlideIndex={currentSlideIndex}
                        totalSlides={allSlides.length}
                        currentSlideTitle={currentSlide?.title ?? ''}
                        onPrev={handlePrev}
                        onNext={handleNext}
                        theme={theme}
                        disableNext={currentSlide?.type === 'exam-intro' || currentSlide?.type === 'mastery-exam'}
                        disablePrev={currentSlide?.type === 'mastery-exam'}
                      />`;

const idx = app.indexOf(marker);
if (idx < 0) { console.error('❌ PlayerBar marker not found'); process.exit(1); }
app = app.substring(0, idx) + replacement + app.substring(idx + marker.length);
fs.writeFileSync('src/App.tsx', app, 'utf8');
console.log('✔ disableNext/disablePrev added to PlayerBar call');
