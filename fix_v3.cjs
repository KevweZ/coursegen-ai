const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');
let changed = 0;

function fix(label, old, neo) {
  if (c.includes(old)) { c = c.replace(old, neo); console.log('✔', label); changed++; }
  else { console.error('❌', label); }
}

// 1. Content zone close — CRLF pattern
fix('content zone close',
  '</AnimatePresence>\r\n\r\n\r\n                    {/* Learner Player Navigation Bar',
  '</AnimatePresence>\r\n                    </div>{/* end content zone */}\r\n\r\n                     {/* Learner Player Navigation Bar'
);

// 2. Title slide negative margin — LF pattern (mixed file)
fix('title slide margin',
  '&& (\n                                 <div className="w-full h-full -m-4 md:-m-8" style={{ margin: \'-1.5rem -2.5rem\' }}>\n                                   <CourseTitleSlide',
  '&& (\n                                 <div className="w-full h-full">\n                                   <CourseTitleSlide'
);

// 3. Module cover margin
const modOld = c.indexOf('<div className="w-full h-full" style={{ margin: \'-1.5rem -2.5rem\' }}>');
if (modOld > 0) {
  c = c.substring(0, modOld) + '<div className="w-full h-full">' + c.substring(modOld + '<div className="w-full h-full" style={{ margin: \'-1.5rem -2.5rem\' }}>'.length);
  console.log('✔ module/closing margin (1st occurrence)'); changed++;
  // There might be a second one for closing
  const next = c.indexOf('<div className="w-full h-full" style={{ margin: \'-1.5rem -2.5rem\' }}>');
  if (next > 0) {
    c = c.substring(0, next) + '<div className="w-full h-full">' + c.substring(next + '<div className="w-full h-full" style={{ margin: \'-1.5rem -2.5rem\' }}>'.length);
    console.log('✔ closing margin (2nd occurrence)'); changed++;
  }
} else {
  console.error('❌ module/closing margin not found');
}

// 4. Matching correctAnswers derivation — CRLF
const matchOld = `matchingProps = (() => {\r\n                                    if (Array.isArray(rawData.items) && rawData.items.length > 0) return rawData;\r\n                                    if (Array.isArray(rawData.pairs) && rawData.pairs.length > 0) {\r\n                                      return {\r\n                                        items:   rawData.pairs.map((p: any) => ({ id: p.id + '_item',   content: p.term })),\r\n                                        targets: rawData.pairs.map((p: any) => ({ id: p.id + '_target', content: p.definition })),\r\n                                      };\r\n                                    }\r\n                                    return { items: [], targets: [] };\r\n                                  })();`;
const matchNew = `matchingProps = (() => {
                                    if (Array.isArray(rawData.pairs) && rawData.pairs.length > 0) {
                                      const items   = rawData.pairs.map((p) => ({ id: p.id + '_item',   content: p.term }));
                                      const targets = rawData.pairs.map((p) => ({ id: p.id + '_target', content: p.definition }));
                                      const correctAnswers = rawData.correctAnswers ||
                                        Object.fromEntries(rawData.pairs.map((p) => [p.id + '_item', p.id + '_target']));
                                      return { items, targets, correctAnswers };
                                    }
                                    if (Array.isArray(rawData.items) && rawData.items.length > 0) {
                                      return { items: rawData.items, targets: rawData.targets || [], correctAnswers: rawData.correctAnswers || {} };
                                    }
                                    return { items: [], targets: [], correctAnswers: {} };
                                  })();`;
fix('matching derivation', matchOld, matchNew);

// 5. Branching error boundary — LF pattern
fix('branching error boundary',
  `<div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                        <BranchingScenario nodes={normNodes} startNodeId={startId} />`,
  `<div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                         <ErrorBoundary fallbackTitle="Branching scenario error — a node may have an invalid nextNodeId reference.">
                                           <BranchingScenario nodes={normNodes} startNodeId={startId} />
                                         </ErrorBoundary>`
);

fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log(`\n✅ ${changed} fixes applied.`);
