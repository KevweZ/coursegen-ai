const fs = require('fs');
let src = fs.readFileSync('src/lib/dummyCourse.ts', 'utf8');

// Remove the entire 'title' slide block from Module 1
const marker = `        // Title
        {
          id: 'slide-title',
          type: 'title',
          title: 'NexCourse player Sandbox',
          content: 'Welcome to the **Admin Preview Mode**. This course lets you test every player component without generating a real course. Use the navigation controls below to move between slides.',
          narration: 'Welcome to the Admin Preview Mode. This is a sandbox course that contains every slide type and interactive component. Use this environment to test and debug the course player.',
          voiceOverText: 'Welcome to the Admin Preview Mode. This is a sandbox course that contains every slide type.',
          imagePlaceholder: true,
          mediaPrompt: 'Professional eLearning studio with glowing screens',
        },
        // Content`;

const replacement = `        // Content`;

const idx = src.indexOf(marker);
if (idx < 0) { console.error('❌ Slide block not found'); process.exit(1); }
src = src.substring(0, idx) + replacement + src.substring(idx + marker.length);
fs.writeFileSync('src/lib/dummyCourse.ts', src, 'utf8');
console.log('✔ Removed redundant title slide (slide-title) from demo course Module 1');
