const fs = require('fs');

let c = fs.readFileSync('src/components/interactions/ExtraPreviews.tsx', 'utf8');

const hotspotReplacement = `export function HotspotPreview() {
  const [openN, setOpenN] = useState<number | null>(null);
  const dots = [
    { x: '18%', y: '40%', n: 1, label: 'California' },
    { x: '45%', y: '65%', n: 2, label: 'Texas' },
    { x: '78%', y: '75%', n: 3, label: 'Florida' },
    { x: '82%', y: '30%', n: 4, label: 'New York' }
  ];
  return (
    <div className="w-full max-w-xl select-none">
      <p className="text-white font-bold text-lg mb-4">Click hotspots to view state specific data:</p>
      <div className="relative w-full aspect-[4/3] bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden flex items-center justify-center p-4">
        {/* Simplified high-quality outline of the contiguous US */}
        <svg viewBox="0 0 1000 650" className="w-full h-full opacity-30 text-indigo-400 absolute inset-0 m-auto pointer-events-none" fill="currentColor">
          <path d="M150 150 Q 250 80 400 100 T 700 100 T 880 180 Q 950 250 900 350 T 800 450 T 750 630 Q 700 650 650 550 T 500 500 T 350 550 T 250 480 Q 150 450 100 350 T 150 150 Z" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" fill="rgba(99, 102, 241, 0.1)"/>
        </svg>
        <div className="absolute inset-0">
          {dots.map((dot) => (
            <div key={dot.n} className="absolute z-10" style={{ left: dot.x, top: dot.y }}>
              <button
                onClick={() => setOpenN(openN === dot.n ? null : dot.n)}
                className={\`relative z-20 w-8 h-8 rounded-full flex items-center justify-center text-white font-extrabold text-sm shadow-xl transition-all \${openN === dot.n ? 'bg-pink-500 scale-125 ring-4 ring-pink-500/30' : 'bg-indigo-600 hover:bg-pink-500 hover:scale-110 animate-pulse'}\`}
              >
                {dot.n}
              </button>
              <AnimatePresence>
                {openN === dot.n && (
                  <motion.div initial={{ opacity: 0, scale: 0.8, x: 20 }} animate={{ opacity: 1, scale: 1, x: 40 }} exit={{ opacity: 0, scale: 0.8, x: 20 }} className="absolute -top-1 left-0 bg-slate-900 border-2 border-pink-500 text-white text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap shadow-2xl z-30">
                    {dot.label}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}`;

c = c.replace(/export function HotspotPreview\(\) \{[\s\S]*?\}\n\nexport function BranchingPreview/, hotspotReplacement + '\n\nexport function BranchingPreview');


const branchingReplacement = `export function BranchingPreview() {
  const [step, setStep] = useState(0);
  return (
    <div className="w-full max-w-2xl select-none">
      <AnimatePresence mode="wait">
        {step === 0 ? (
          <motion.div key="intro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 mb-4 shadow-xl">
              <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest mb-2">📖 Scenario Start</p>
              <p className="text-white font-bold text-lg leading-snug">You receive an urgent email from your CEO requesting an immediate $50,000 wire transfer. What do you do?</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div onClick={() => setStep(1)} className="p-4 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-slate-500 rounded-xl cursor-pointer transition-all text-center">
                <p className="text-white font-bold">⚠️ Wire the funds immediately</p>
              </div>
              <div onClick={() => setStep(2)} className="p-4 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-slate-500 rounded-xl cursor-pointer transition-all text-center">
                <p className="text-white font-bold">✅ Verify via phone call first</p>
              </div>
            </div>
          </motion.div>
        ) : step === 1 ? (
          <motion.div key="fail1" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-red-900/40 border border-red-500/50 p-8 rounded-2xl text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-white font-bold text-xl mb-2">Costly Mistake!</p>
            <p className="text-red-200 text-sm mb-6">You fell for a Business Email Compromise (BEC) scam. The company lost $50,000.</p>
            <button onClick={() => setStep(0)} className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors">Retry Scenario</button>
          </motion.div>
        ) : step === 2 ? (
          <motion.div key="step2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 mb-4 shadow-xl">
              <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest mb-2">📖 Continued Scenario</p>
              <p className="text-white font-bold text-lg leading-snug">The CEO confirms he never sent the email. However, the attacker realizes you paused and sends a threatening follow-up email from a "vendor". What now?</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div onClick={() => setStep(3)} className="p-4 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-slate-500 rounded-xl cursor-pointer transition-all text-center">
                <p className="text-white font-bold">✅ Isolate and Forward to IT Sec</p>
              </div>
              <div onClick={() => setStep(4)} className="p-4 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-slate-500 rounded-xl cursor-pointer transition-all text-center">
                <p className="text-white font-bold">⚠️ Reply demanding verification</p>
              </div>
            </div>
          </motion.div>
        ) : step === 3 ? (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-emerald-900/40 border border-emerald-500/50 p-8 rounded-2xl text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <p className="text-white font-bold text-xl mb-2">Disaster Averted!</p>
            <p className="text-emerald-200 text-sm mb-6">By reporting immediately, IT locked the compromised vendor channel and thwarted the attack entirely.</p>
            <button onClick={() => setStep(0)} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors">Restart Scenario</button>
          </motion.div>
        ) : (
          <motion.div key="fail2" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-red-900/40 border border-red-500/50 p-8 rounded-2xl text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-white font-bold text-xl mb-2">Dangerous Engagement</p>
            <p className="text-red-200 text-sm mb-6">Replying to the attacker verified your email is active and opened a vector for a payload deployment.</p>
            <button onClick={() => setStep(0)} className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors">Retry Scenario</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}`;

c = c.replace(/export function BranchingPreview\(\) \{[\s\S]*?\}\n\nexport function MultipleChoicePreview/, branchingReplacement + '\n\nexport function MultipleChoicePreview');

const dropTargetsReplacement = `export function DropTargetsPreview({ isQuiz = false }: { isQuiz?: boolean }) {
  const [items, setItems] = useState<{id: string, text: string, dropped: string | null}>([
    {id: '1', text: 'HIPAA', dropped: null}, {id: '2', text: 'GDPR', dropped: null},
    {id: '3', text: 'SOX', dropped: null}, {id: '4', text: 'PCI-DSS', dropped: null},
    {id: '5', text: 'FERPA', dropped: null}
  ]);
  const correctMap: Record<string, string> = { 'HIPAA': 'Healthcare', 'GDPR': 'Financial', 'SOX': 'Financial', 'PCI-DSS': 'Financial', 'FERPA': 'Education' };
  
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDrop = (e: React.DragEvent, zone: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if (!isQuiz) {
       if (correctMap[item.text] !== zone) {
          setWrongFlash(zone);
          setTimeout(() => setWrongFlash(null), 500);
          return;
       }
    }
    setItems(items.map(i => i.id === itemId ? { ...i, dropped: zone } : i));
  };

  // Click-based fallback setup for accessibility
  const moveTo = (itemText: string, target: string) => {
    const item = items.find(i => i.text === itemText);
    if (!item) return;
    if (!isQuiz && correctMap[item.text] !== target) {
      setWrongFlash(target);
      setTimeout(() => setWrongFlash(null), 500);
      return;
    }
    setItems(items.map(i => i.text === itemText ? { ...i, dropped: target } : i));
  };

  const zones: Record<string, any[]> = { Healthcare: [], Financial: [], Education: [] };
  items.filter(i => i.dropped).forEach(i => zones[i.dropped!].push(i));
  const bank = items.filter(i => !i.dropped);

  return (
    <div className="w-full max-w-2xl select-none">
      <p className="text-white font-bold text-lg mb-4">Drag \`&\` Drop regulations to the correct category:</p>
      <div className="flex flex-wrap gap-2 p-4 bg-slate-800/50 rounded-xl border border-slate-700 mb-4 min-h-[70px]">
        {bank.map(item => (
          <div key={item.id} draggable onDragStart={(e) => handleDragStart(e, item.id)} className="group relative px-6 py-2 bg-indigo-600 rounded-lg text-white text-sm font-bold shadow-md pr-20 overflow-hidden cursor-grab active:cursor-grabbing hover:bg-indigo-500 transition-colors">
            {item.text}
            <div className="absolute right-0 top-0 bottom-0 flex opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
               <button onClick={() => moveTo(item.text, 'Healthcare')}  className="w-6 bg-red-500 hover:bg-red-400 text-xs px-1">🏥</button>
               <button onClick={() => moveTo(item.text, 'Financial')}   className="w-6 bg-yellow-600 hover:bg-yellow-500 text-xs px-1">💰</button>
               <button onClick={() => moveTo(item.text, 'Education')}   className="w-6 bg-green-600 hover:bg-green-500 text-xs px-1">🎓</button>
            </div>
          </div>
        ))}
        {bank.length === 0 && <p className="text-emerald-400 font-bold m-auto animate-pulse">All sorted properly!</p>}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {(['Healthcare', 'Financial', 'Education'] as const).map((zone) => (
          <div key={zone} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, zone)} className={\`p-4 rounded-xl border-2 border-dashed bg-slate-800/50 min-h-[140px] flex flex-col items-center gap-2 transition-all \${wrongFlash === zone ? 'border-red-500 bg-red-500/20' : 'border-slate-600 hover:border-indigo-500'}\`}>
            {wrongFlash === zone && <AlertCircle className="w-8 h-8 text-red-500 absolute" />}
            <span className="text-2xl">{zone === 'Healthcare' ? '🏥' : zone === 'Financial' ? '💰' : '🎓'}</span>
            <span className="text-xs font-bold uppercase text-slate-400">{zone}</span>
            <div className="w-full mt-2 space-y-1">
              {zones[zone].map(i => <div key={i.id} className="text-xs font-bold bg-indigo-600 text-white p-1.5 text-center rounded w-full line-clamp-1">{i.text}</div>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}`;

c = c.replace(/export function DropTargetsPreview\(\) \{[\s\S]*?\}\n\nexport function TimelinePreview/, dropTargetsReplacement + '\n\nexport function TimelinePreview');


const timelineReplacement = `export function TimelinePreview({ isPreview = true }: { isPreview?: boolean }) {
  const [openStep, setOpenStep] = useState<number | null>(null);
  const [layout, setLayout] = useState<'vertical' | 'horizontal'>('horizontal');
  const steps = [
    { n: 1, title: 'Preparation', content: 'Establish IR policies, train teams.', color: 'bg-blue-500', border: 'border-blue-500' },
    { n: 2, title: 'Identification', content: 'Detect security incidents using alerts.', color: 'bg-yellow-500', border: 'border-yellow-500' },
    { n: 3, title: 'Containment', content: 'Limit the damage and prevent spread.', color: 'bg-orange-500', border: 'border-orange-500' },
    { n: 4, title: 'Eradication', content: 'Remove root cause — patch systems.', color: 'bg-red-500', border: 'border-red-500' },
    { n: 5, title: 'Recovery', content: 'Restore systems to normal operations.', color: 'bg-green-500', border: 'border-green-500' },
  ];

  return (
    <div className="w-full max-w-3xl select-none">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white font-bold text-lg">Incident Timeline</p>
          <p className="text-slate-400 text-xs font-medium">Click steps to reveal details</p>
        </div>
        {isPreview && (
          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button onClick={() => setLayout('vertical')} className={\`px-3 py-1 text-xs font-bold rounded-md transition-colors \${layout === 'vertical' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}\`}><LayoutList className="w-4 h-4" /></button>
            <button onClick={() => setLayout('horizontal')} className={\`px-3 py-1 text-xs font-bold rounded-md transition-colors \${layout === 'horizontal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}\`}><GripVertical className="w-4 h-4 rotate-90" /></button>
          </div>
        )}
      </div>

      <div className={\`relative \${layout === 'horizontal' ? 'flex items-start justify-between min-h-[160px] pt-4' : ''}\`}>
        {layout === 'vertical' && (
          <div className="absolute left-[22px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-blue-500 via-orange-500 to-green-500 opacity-40" />
        )}
        {layout === 'horizontal' && (
          <div className="absolute top-[32px] left-8 right-8 h-0.5 bg-gradient-to-r from-blue-500 via-orange-500 to-green-500 opacity-40 z-0" />
        )}

        <div className={layout === 'vertical' ? 'space-y-3' : 'w-full flex justify-between relative z-10'}>
          {steps.map((step, i) => {
            const isOpen = openStep === i;
            if (layout === 'horizontal') {
              return (
                <div key={i} className="flex flex-col items-center flex-1 cursor-pointer relative" onClick={() => setOpenStep(isOpen ? null : i)}>
                  <motion.div layoutId={\`tl-dot-\${i}\`} className={\`w-8 h-8 rounded-full \${step.color} flex items-center justify-center text-white font-bold text-sm shadow-lg z-10 mb-2 transition-transform \${isOpen ? 'scale-125 ring-4 ring-white/20' : 'hover:scale-110'}\`}>{step.n}</motion.div>
                  <span className="font-bold text-xs text-center text-slate-200 mb-2 h-8">{step.title}</span>
                  <AnimatePresence>
                     {isOpen && (
                       <motion.div layoutId={\`tl-box-\${i}\`} initial={{ opacity: 0, scale: 0.8, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: -20, transition:{duration:0.15} }} className={\`absolute top-16 left-1/2 -translate-x-1/2 w-48 bg-slate-900 border-2 \${step.border} rounded-xl p-4 text-sm text-white shadow-2xl z-20 pointer-events-none\`}>
                         <span className="font-bold border-b border-slate-600 pb-1 mb-2 block w-full">{step.title}</span>
                         {step.content}
                       </motion.div>
                     )}
                  </AnimatePresence>
                </div>
              );
            }

            return (
              <div key={i}>
                <button onClick={() => setOpenStep(isOpen ? null : i)} className={\`w-full relative flex items-center gap-4 pl-14 pr-4 py-3 rounded-xl border transition-all text-left group \${isOpen ? '\${step.border} bg-slate-800 text-white' : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800'}\`}>
                  <div className={\`absolute left-3 w-8 h-8 rounded-full \${step.color} flex items-center justify-center text-white font-bold text-sm shadow-lg shrink-0\`}>{step.n}</div>
                  <span className="font-bold text-sm flex-1">{step.title}</span>
                  <span className="text-slate-500 text-xs group-hover:text-slate-300 transition-colors">{isOpen ? '▲ Close' : '▼ Details'}</span>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                       <div className={\`mt-2 ml-14 mb-1 p-4 rounded-xl bg-slate-900 border \${step.border} text-slate-300 text-sm leading-relaxed shadow-inner\`}>{step.content}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}`;

c = c.replace(/export function TimelinePreview\(\) \{[\s\S]*?\}\n\nexport function GamePreview/, timelineReplacement + '\n\nexport function GamePreview');

fs.writeFileSync('src/components/interactions/ExtraPreviews.tsx', c);
console.log('ExtraPreviews components successfully patched.');

// Patch FlashcardGrid.tsx
let fStr = fs.readFileSync('src/components/FlashcardGrid.tsx', 'utf8');
const oldSpring = /transition=\{\{ type: 'spring', stiffness: 300, damping: 20 \}\}/g;
const newSpring = `transition={{ type: 'spring', stiffness: 220, damping: 25, mass: 0.8 }}`;
fStr = fStr.replace(oldSpring, newSpring);

const oldVariants = /const variants = \{\s*enter: \{ opacity: 0, y: 20 \},\s*center: \{ opacity: 1, y: 0 \},\s*exit: \{ opacity: 0, y: -20 \}\s*\};/;
const newVariants = `const variants = {
    enter: { opacity: 0, y: 30, scale: 0.95, rotateX: 15 },
    center: { opacity: 1, y: 0, scale: 1, rotateX: 0 },
    exit: { opacity: 0, y: -30, scale: 0.95, rotateX: -15 }
  };`;
fStr = fStr.replace(oldVariants, newVariants);
fs.writeFileSync('src/components/FlashcardGrid.tsx', fStr);
console.log('FlashcardGrid patched.');
