const fs = require('fs');

let t = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Text substitution
t = t.replace(
  /CLICK TO SELECT • HOVER FOR PREVIEW/g,
  'CLICK TO SELECT • CLICK ON EYE ICON TO PREVIEW'
);
t = t.replace(
  /CLICK TO SELECT • EYE ICON TO PREVIEW/g,
  'CLICK TO SELECT • CLICK ON EYE ICON TO PREVIEW'
);

// 2. Add GamePreview to the preview container
// We'll plug it right before the closing div of InteractionPreviewBodyWrapper container
t = t.replace(
  /(\{previewModalOption === 'Carousel Panel' && \(\s*<CarouselPreview \/>\s*\)\})/g,
  `$1
                         {['Knowledge Board', 'Knowledge Board (Jeopardy)', 'Millionaire Challenge', 'Ranked Survey', 'Digital Escape Room', 'Spin the Wheel', 'Price Estimator'].includes(previewModalOption || '') && (
                            <GamePreview option={previewModalOption || ''} />
                         )}`
);

fs.writeFileSync('src/App.tsx', t);
console.log('App logic patched successfully.');
