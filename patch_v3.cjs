// patch_v3.cjs — PlayerBar fix, negative margins, matching feedback, error boundary, hotspot height
const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');
let changed = 0;

function rep(label, old, neo) {
  if (c.includes(old)) { c = c.replace(old, neo); console.log('✔', label); changed++; return true; }
  const crlf = old.replace(/\n/g, '\r\n');
  if (c.includes(crlf)) { c = c.replace(crlf, neo); console.log('✔ CRLF', label); changed++; return true; }
  console.error('❌', label); return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Add ErrorBoundary import
// ─────────────────────────────────────────────────────────────────────────────
rep(
  'ErrorBoundary import',
  `import { WheelDiagram } from './components/interactions/WheelDiagram';`,
  `import { WheelDiagram } from './components/interactions/WheelDiagram';
import { ErrorBoundary } from './components/ErrorBoundary';`
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Wrap AnimatePresence in a flex-1 content zone so PlayerBar is always bottom
// ─────────────────────────────────────────────────────────────────────────────
rep(
  'content zone wrapper open',
  `                    {/* ── Full-bleed slide frame ─────────────────────── */}
                    <AnimatePresence mode="wait">`,
  `                    {/* ── Content zone: flex-1 so PlayerBar stays at bottom ── */}
                    <div className="flex-1 relative overflow-hidden flex flex-col">
                    {/* ── Full-bleed slide frame ─────────────────────── */}
                    <AnimatePresence mode="wait">`
);

rep(
  'content zone wrapper close',
  `                         </motion.div>
                        </AnimatePresence>


                     {/* Learner Player Navigation Bar`,
  `                         </motion.div>
                        </AnimatePresence>
                    </div>{/* end content zone */}

                     {/* Learner Player Navigation Bar`
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Remove negative margins from full-bleed wrappers (title, module, closing)
// ─────────────────────────────────────────────────────────────────────────────
rep(
  'title slide negative margin',
  `                  <div className="w-full h-full -m-4 md:-m-8" style={{ margin: '-1.5rem -2.5rem' }}>
                                    <CourseTitleSlide`,
  `                  <div className="w-full h-full">
                                    <CourseTitleSlide`
);

rep(
  'module cover negative margin',
  `                                  <div className="w-full h-full" style={{ margin: '-1.5rem -2.5rem' }}>
                                    <ModuleCoverSlide`,
  `                                  <div className="w-full h-full">
                                    <ModuleCoverSlide`
);

rep(
  'closing slide negative margin',
  `                                  <div className="w-full h-full" style={{ margin: '-1.5rem -2.5rem' }}>
                                    <ClosingSlide`,
  `                                  <div className="w-full h-full">
                                    <ClosingSlide`
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Derive correctAnswers in matching renderer and pass to CustomMatchingActivity
// ─────────────────────────────────────────────────────────────────────────────
rep(
  'matching correctAnswers derivation',
  `                                   const matchingProps = (() => {
                                     if (Array.isArray(rawData.items) && rawData.items.length > 0) return rawData;
                                     if (Array.isArray(rawData.pairs) && rawData.pairs.length > 0) {
                                       return {
                                         items:   rawData.pairs.map((p: any) => ({ id: p.id + '_item',   content: p.term })),
                                         targets: rawData.pairs.map((p: any) => ({ id: p.id + '_target', content: p.definition })),
                                       };
                                     }
                                     return { items: [], targets: [] };
                                   })();`,
  `                                   const matchingProps = (() => {
                                     if (Array.isArray(rawData.pairs) && rawData.pairs.length > 0) {
                                       const items   = rawData.pairs.map((p: any) => ({ id: p.id + '_item',   content: p.term }));
                                       const targets = rawData.pairs.map((p: any) => ({ id: p.id + '_target', content: p.definition }));
                                       // Use explicit correctAnswers from data, or derive from pairs
                                       const correctAnswers: Record<string,string> = rawData.correctAnswers ||
                                         Object.fromEntries(rawData.pairs.map((p: any) => [p.id + '_item', p.id + '_target']));
                                       return { items, targets, correctAnswers };
                                     }
                                     if (Array.isArray(rawData.items) && rawData.items.length > 0) {
                                       return { items: rawData.items, targets: rawData.targets || [], correctAnswers: rawData.correctAnswers || {} };
                                     }
                                     return { items: [], targets: [], correctAnswers: {} };
                                   })();`
);

rep(
  'matching pass correctAnswers prop',
  `                                       <CustomMatchingActivity
                                         items={matchingProps.items || []}
                                         targets={matchingProps.targets || []}
                                       />`,
  `                                       <CustomMatchingActivity
                                         items={matchingProps.items || []}
                                         targets={matchingProps.targets || []}
                                         correctAnswers={matchingProps.correctAnswers || {}}
                                       />`
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. Wrap BranchingScenario in ErrorBoundary
// ─────────────────────────────────────────────────────────────────────────────
rep(
  'branching error boundary wrap',
  `                                       <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                         <BranchingScenario nodes={normNodes} startNodeId={startId} />`,
  `                                       <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                         <ErrorBoundary fallbackTitle="Branching scenario encountered an error — the node data may have a missing nextNodeId reference.">
                                           <BranchingScenario nodes={normNodes} startNodeId={startId} />
                                         </ErrorBoundary>`
);

// ─────────────────────────────────────────────────────────────────────────────
// 6. Fix hotspot renderer to give it proper height for side-by-side layout
// ─────────────────────────────────────────────────────────────────────────────
rep(
  'hotspot renderer height',
  `                                      <HotspotInteraction
                                        imageUrl={hd.imageUrl || hd.image}
                                        points={hd.points || hd.hotspots || []}
                                        theme={theme}
                                      />`,
  `                                      <div style={{ height: 'clamp(220px, 50vh, 400px)' }}>
                                        <HotspotInteraction
                                          imageUrl={hd.imageUrl || hd.image || hd.backgroundImage}
                                          points={hd.points || hd.hotspots || []}
                                          theme={theme}
                                        />
                                      </div>`
);

fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log(`\n✅ ${changed} patches applied.`);
