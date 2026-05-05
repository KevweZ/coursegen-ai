const fs = require('fs');
let src = fs.readFileSync('src/App.tsx', 'utf8');
// The patch accidentally dropped the } after the comment marker
src = src.replace(
  '{/* MODULE COVER SLIDE */\n                               {currentSlide?.type',
  '{/* MODULE COVER SLIDE */}\n                               {currentSlide?.type'
);
// Also try CRLF variant
src = src.replace(
  '{/* MODULE COVER SLIDE */\r\n                               {currentSlide?.type',
  '{/* MODULE COVER SLIDE */}\r\n                               {currentSlide?.type'
);
fs.writeFileSync('src/App.tsx', src, 'utf8');
console.log('✔ Fixed MODULE COVER comment brace');
