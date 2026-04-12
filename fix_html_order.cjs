'use strict';
const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Move isHTML before sanitizeContent so sanitizeContent can call it
// Remove isHTML from where it is now
app = app.replace(
  `\n/** Detects whether a string is HTML (from the rich-text editor) vs plain Markdown */\nconst isHTML = (str: string) => /<[a-z][\\s\\S]*>/i.test(str?.trim() ?? '');\n`,
  '\n'
);

// Insert isHTML right before sanitizeContent
app = app.replace(
  `const sanitizeContent = (content: string) => {`,
  `/** Detects whether a string is HTML (from the rich-text editor) vs plain Markdown */\nconst isHTML = (str: string) => /<[a-z][\\s\\S]*>/i.test(str?.trim() ?? '');\n\nconst sanitizeContent = (content: string) => {`
);

// 2. Fix line 1763 — bare <ReactMarkdown> in cover slide → SmartContent
app = app.replace(
  `                                        <ReactMarkdown>{sanitizeContent(currentSlide.content)}</ReactMarkdown>`,
  `                                        <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />`
);

fs.writeFileSync('src/App.tsx', app, 'utf8');

// Verify
var htmlPos = app.indexOf('const isHTML');
var sanitizePos = app.indexOf('const sanitizeContent');
var smartFixed = app.includes('<SmartContent content={sanitizeContent(currentSlide.content)} theme={theme}');
console.log('isHTML before sanitizeContent:', htmlPos < sanitizePos ? '\u2713' : '\u2717 WRONG ORDER', '(' + htmlPos + ' < ' + sanitizePos + ')');
console.log('Cover slide uses SmartContent:', smartFixed ? '\u2713' : '\u2717');

// Check no bare ReactMarkdown wrapping content remains
var bareCount = (app.match(/<ReactMarkdown>\{.*content.*\}<\/ReactMarkdown>/g) || []).length;
console.log('Remaining bare ReactMarkdown with content:', bareCount);
