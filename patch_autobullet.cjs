// patch_autobullet.cjs — inject autoFormatAsBullets into App.tsx local SlideContent + SmartContent
const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');
let fixed = 0;

function patch(label, marker, replacement) {
  const idx = c.indexOf(marker);
  if (idx < 0) { console.error('❌', label); return; }
  c = c.substring(0, idx) + replacement + c.substring(idx + marker.length);
  console.log('✔', label);
  fixed++;
}

// 1. Inject the autoFormatAsBullets function right before the local SlideContent definition
const funcDef = `
/**
 * autoFormatAsBullets — converts multi-paragraph plain text to bullet points.
 * Skips blockquotes (>), headers (#), existing lists, HRs, and code fences.
 * Only fires when there are 2+ plain-text paragraphs.
 */
function autoFormatAsBullets(raw: string): string {
  const blocks = raw.split(/\\n{2,}/);
  const isPlain = (b: string) => {
    const t = b.trim();
    if (!t) return false;
    if (/^#{1,6}\\s/.test(t)) return false;
    if (/^[-*+]\\s|^\\d+\\.\\s/.test(t)) return false;
    if (/^>/.test(t)) return false;
    if (/^\`\`\`/.test(t)) return false;
    if (/^---/.test(t)) return false;
    return true;
  };
  if (blocks.filter(isPlain).length < 2) return raw;
  return blocks.map(b => isPlain(b) ? \`- \${b.trim()}\` : b).join('\\n\\n');
}

`;

patch('inject autoFormatAsBullets fn',
  '\r\nconst SlideContent = ({ content, theme }: { content: string, theme: string }) => {',
  funcDef + 'const SlideContent = ({ content, theme }: { content: string, theme: string }) => {'
);

// 2. Apply it inside the local SlideContent — wrap 'content' in both branches
// HTML branch: leave as-is (HTML content doesn't need bullet conversion)
// Markdown branch: apply autoFormatAsBullets
patch('SlideContent apply autobullet',
  '    <ReactMarkdown\r\n      className={cn(\'prose max-w-none text-lg lg:text-xl leading-relaxed\', theme !== \'light\' ? \'prose-invert\' : \'\')}\r\n      components={{\r\n        p: ({ node, children, ...props }) => {\r\n          const instructional = renderInstructionalText(children, theme);\r\n          if (instructional) return instructional;\r\n          return <p {...props} className={cn("text-lg mb-4", theme === \'light\' ? "text-gray-800" : "text-gray-200")}>{children}</p>;\r\n        },\r\n        li: ({ node, children, ...props }) => {\r\n          const instructional = renderInstructionalText(children, theme, true);\r\n          if (instructional) return <li {...props} className="marker:text-indigo-400">{instructional}</li>;\r\n          return <li {...props} className={cn("marker:text-indigo-400", theme === \'light\' ? "text-gray-800" : "text-gray-200")}>{children}</li>;\r\n        },\r\n        ul: ({ node, children, ...props }) => (\r\n          <ul {...props} className="pl-6 space-y-2 lg:list-disc border-l-0 border-indigo-500/20">{children}</ul>\r\n        ),\r\n        ol: ({ node, children, ...props }) => (\r\n          <ol {...props} className="pl-6 space-y-2 list-decimal pb-4">{children}</ol>\r\n        ),\r\n        strong: ({ node, children, ...props }) => (\r\n          <strong {...props} className={cn("font-extrabold", theme === \'light\' ? "text-indigo-900" : "text-white")}>{children}</strong>\r\n        ),\r\n      }}\r\n    >\r\n      {content}\r\n    </ReactMarkdown>',
  '    <ReactMarkdown\r\n      className={cn(\'prose max-w-none text-lg lg:text-xl leading-relaxed\', theme !== \'light\' ? \'prose-invert\' : \'\')}\r\n      components={{\r\n        p: ({ node, children, ...props }) => {\r\n          const instructional = renderInstructionalText(children, theme);\r\n          if (instructional) return instructional;\r\n          return <p {...props} className={cn("text-lg mb-4", theme === \'light\' ? "text-gray-800" : "text-gray-200")}>{children}</p>;\r\n        },\r\n        li: ({ node, children, ...props }) => {\r\n          const instructional = renderInstructionalText(children, theme, true);\r\n          if (instructional) return <li {...props} className="marker:text-indigo-400">{instructional}</li>;\r\n          return <li {...props} className={cn("marker:text-indigo-400", theme === \'light\' ? "text-gray-800" : "text-gray-200")}>{children}</li>;\r\n        },\r\n        ul: ({ node, children, ...props }) => (\r\n          <ul {...props} className="pl-6 space-y-2 lg:list-disc border-l-0 border-indigo-500/20">{children}</ul>\r\n        ),\r\n        ol: ({ node, children, ...props }) => (\r\n          <ol {...props} className="pl-6 space-y-2 list-decimal pb-4">{children}</ol>\r\n        ),\r\n        strong: ({ node, children, ...props }) => (\r\n          <strong {...props} className={cn("font-extrabold", theme === \'light\' ? "text-indigo-900" : "text-white")}>{children}</strong>\r\n        ),\r\n      }}\r\n    >\r\n      {autoFormatAsBullets(content)}\r\n    </ReactMarkdown>'
);

// 3. Apply in SmartContent too
patch('SmartContent apply autobullet',
  '  return (\r\n    <ReactMarkdown className={className}>\r\n      {content}\r\n    </ReactMarkdown>\r\n  );\r\n};',
  '  return (\r\n    <ReactMarkdown className={className}>\r\n      {autoFormatAsBullets(content)}\r\n    </ReactMarkdown>\r\n  );\r\n};'
);

fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log(`\n${fixed}/3 patches applied.`);
