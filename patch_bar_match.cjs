const fs = require('fs');
let src = fs.readFileSync('src/App.tsx', 'utf8');
let ok = 0;

// ── 1. Add voiceOverEnabled + onToggleVoiceOver to PlayerBar call ──────────
const pb_old = `                        disablePrev={currentSlide?.type === 'mastery-exam'}\r\n                      />\r\n                     </div>{/* end PlayerBar */}`;
const pb_new = `                        disablePrev={currentSlide?.type === 'mastery-exam'}\r\n                        voiceOverEnabled={voiceOverEnabled}\r\n                        onToggleVoiceOver={() => setVoiceOverEnabled(v => !v)}\r\n                      />\r\n                     </div>{/* end PlayerBar */}`;
if (src.includes(pb_old)) { src = src.replace(pb_old, pb_new); ok++; console.log('✔ 1 PlayerBar voiceOver props'); }
else console.error('❌ 1 PlayerBar props (CRLF mismatch?)');

// ── 2. Remove interaction-dark-override from matching slide ───────────────
const match_old = `                                       <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>\r\n                                         <CustomMatchingActivity\r\n                                          items={matchingProps.items || []}\r\n                                          targets={matchingProps.targets || []}\r\n                                          correctAnswers={matchingProps.correctAnswers || {}}\r\n                                        />\r\n                                       </div>`;
const match_new = `                                       <CustomMatchingActivity\r\n                                        items={matchingProps.items || []}\r\n                                        targets={matchingProps.targets || []}\r\n                                        correctAnswers={matchingProps.correctAnswers || {}}\r\n                                       />`;
if (src.includes(match_old)) { src = src.replace(match_old, match_new); ok++; console.log('✔ 2 matching grey box removed'); }
else console.error('❌ 2 matching wrapper (trying LF version)');

// LF fallback
if (ok < 2) {
  const match_old_lf = `                                       <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>\n                                         <CustomMatchingActivity\n                                          items={matchingProps.items || []}\n                                          targets={matchingProps.targets || []}\n                                          correctAnswers={matchingProps.correctAnswers || {}}\n                                        />\n                                       </div>`;
  const match_new_lf = `                                       <CustomMatchingActivity\n                                        items={matchingProps.items || []}\n                                        targets={matchingProps.targets || []}\n                                        correctAnswers={matchingProps.correctAnswers || {}}\n                                       />`;
  if (src.includes(match_old_lf)) { src = src.replace(match_old_lf, match_new_lf); ok++; console.log('✔ 2 matching grey box removed (LF)'); }
  else console.error('❌ 2 matching wrapper: could not find in either encoding');
}

fs.writeFileSync('src/App.tsx', src, 'utf8');
console.log(`\n✅ ${ok}/2 patches applied`);
