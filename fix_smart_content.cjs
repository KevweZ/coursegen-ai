'use strict';
const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

let replaced = 0;

// Replace: <ReactMarkdown className={cn('prose max-w-none', ...)}>CONTENT</ReactMarkdown>
app = app.replace(
  /<ReactMarkdown className=\{(cn\('prose max-w-none'[^}]*\))\}>\{(sanitizeContent\(currentSlide\.content\)|currentSlide\.content)\}<\/ReactMarkdown>/g,
  function(match, cls, content) {
    replaced++;
    return '<SmartContent content={' + content + '} theme={theme} className={' + cls + '} />';
  }
);

// Also handle other content variables within prose className pattern
app = app.replace(
  /<ReactMarkdown className=\{(cn\('prose max-w-none'[^}]*\))\}>\{([^}]+)\}<\/ReactMarkdown>/g,
  function(match, cls, content) {
    if (content.indexOf('content') !== -1 || content.indexOf('bodyText') !== -1 || content.indexOf('narration') !== -1) {
      replaced++;
      return '<SmartContent content={' + content + '} theme={theme} className={' + cls + '} />';
    }
    return match;
  }
);

console.log('Total replacements: ' + replaced);
fs.writeFileSync('src/App.tsx', app, 'utf8');

var remaining = (app.match(/<ReactMarkdown className=\{cn\('prose/g) || []).length;
console.log('Remaining unreplaced inline ReactMarkdown: ' + remaining);
