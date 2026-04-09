import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, LayoutList, GripVertical } from 'lucide-react';
import { GameContainer } from '../game-templates/core/GameContainer';

export function AccordionPreview() {
  const [openIdx, setOpenIdx] = useState<number>(0);
  const items = [
    { title: '🔒 Confidentiality', content: 'Ensuring only authorized parties can access sensitive information. Implemented through encryption, access controls, and need-to-know policies.' },
    { title: '✅ Integrity', content: 'Safeguarding the accuracy and completeness of data. Prevents unauthorized modification.' },
    { title: '⚡ Availability', content: 'Ensuring systems and data are accessible when needed by authorized users.' }
  ];
  return (
    <div className="w-full max-w-2xl space-y-2 select-none">
      <p className="text-white font-bold text-lg mb-4">Security Principles — click to expand:</p>
      {items.map((item, i) => (
        <div key={i} className="rounded-xl overflow-hidden border border-slate-700 cursor-pointer" onClick={() => setOpenIdx(openIdx === i ? -1 : i)}>
          <div className={openIdx === i ? 'bg-indigo-600 text-white p-4 font-bold flex items-center justify-between transition-colors' : 'bg-slate-800 text-slate-300 p-4 font-bold flex items-center justify-between hover:bg-slate-750 transition-colors'}>
            <span>{item.title}</span><span className="text-lg">{openIdx === i ? '−' : '+'}</span>
          </div>
          <AnimatePresence>
            {openIdx === i && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-slate-800/50 text-slate-300 text-sm leading-relaxed overflow-hidden">
                <div className="p-4">{item.content}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export function HotspotPreview() {
  const [openN, setOpenN] = useState<number | null>(null);
  const dots = [
    { x: '12%', y: '45%', n: 1, label: 'California' },
    { x: '46%', y: '75%', n: 2, label: 'Texas' },
    { x: '78%', y: '85%', n: 3, label: 'Florida' },
    { x: '82%', y: '28%', n: 4, label: 'New York' }
  ];
  return (
    <div className="w-full max-w-xl select-none">
      <p className="text-white font-bold text-lg mb-4">Click hotspots to view state specific data:</p>
      <div className="relative w-full aspect-[4/3] bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden flex items-center justify-center p-4">
        {/* Simplified high-quality outline of the contiguous US */}
        <img src="https://upload.wikimedia.org/wikipedia/commons/1/1a/Blank_US_Map_(states_only).svg" alt="USA Map" className="absolute inset-0 w-full h-full object-contain opacity-50 p-2 pointer-events-none" style={{ filter: "invert(0.5) sepia(1) hue-rotate(180deg) saturate(300%)" }} />
        <div className="absolute inset-0">
          {dots.map((dot) => (
            <div key={dot.n} className="absolute z-10" style={{ left: dot.x, top: dot.y }}>
              <button
                onClick={() => setOpenN(openN === dot.n ? null : dot.n)}
                className={`relative z-20 w-8 h-8 rounded-full flex items-center justify-center text-white font-extrabold text-sm shadow-xl transition-all ${openN === dot.n ? 'bg-pink-500 scale-125 ring-4 ring-pink-500/30' : 'bg-indigo-600 hover:bg-pink-500 hover:scale-110 animate-pulse'}`}
              >
                {dot.n}
              </button>
              <AnimatePresence>
                {openN === dot.n && (() => {
                  const isRight = parseInt(dot.x) > 60;
                  return (
                    <motion.div 
                      key="tooltip"
                      initial={{ opacity: 0, scale: 0.8, x: isRight ? -20 : 20 }} 
                      animate={{ opacity: 1, scale: 1, x: isRight ? -40 : 40 }} 
                      exit={{ opacity: 0, scale: 0.8, x: isRight ? -20 : 20 }} 
                      className={`absolute -top-1 ${isRight ? 'right-0' : 'left-0'} bg-slate-900 border-2 border-pink-500 text-white text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap shadow-2xl z-30`}
                    >
                      {dot.label}
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BranchingPreview() {
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
}

export function MultipleChoicePreview() {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const opts = [
    { id: 'a', text: 'Higher cognitive load per session' },
    { id: 'b', text: 'Focused, bite-sized content targeting one concept at a time', correct: true },
    { id: 'c', text: 'Replaces all formal training programs entirely' },
    { id: 'd', text: 'Requires no assessment or feedback loops' }
  ];
  return (
    <div className="w-full max-w-lg select-none">
      <div className="space-y-4 w-full">
        <p className="font-bold text-lg text-white mb-2">Which of the following is a primary benefit of microlearning?</p>
        {opts.map((opt) => {
          let cls = 'border-slate-700 bg-slate-800 text-slate-200 hover:border-indigo-500 cursor-pointer';
          if (selected === opt.id) cls = 'border-indigo-500 bg-indigo-500/15 text-indigo-100 cursor-pointer';
          if (submitted) {
            if (opt.correct) cls = 'border-emerald-500 bg-emerald-500/20 text-white';
            else if (selected === opt.id) cls = 'border-red-500 bg-red-500/20 text-white opacity-80';
            else cls = 'border-slate-800 bg-slate-900 text-slate-500 opacity-50';
          }
          return (
            <button disabled={submitted} key={opt.id} onClick={() => setSelected(opt.id)} className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${cls}`}>
              <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${selected === opt.id || (submitted && opt.correct) ? (submitted && opt.correct ? 'border-emerald-500 bg-emerald-500' : 'border-indigo-500 bg-indigo-500') : 'border-slate-500 bg-transparent'}`}>
                {(selected === opt.id || (submitted && opt.correct)) && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
              <span className="font-medium text-sm">{opt.text}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        {!submitted ? (
          <button disabled={!selected} onClick={() => setSubmitted(true)} className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm w-full transition-colors">Submit Answer</button>
        ) : (
          <button onClick={() => { setSelected(null); setSubmitted(false); }} className="px-5 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm w-full transition-colors">Reset</button>
        )}
      </div>
    </div>
  );
}

export function SortingPreview() {
  const initialItems = ['Analyze', 'Create', 'Remember', 'Evaluate', 'Apply', 'Understand'];
  const [items, setItems] = useState(initialItems);
  
  const moveItem = (from: number, to: number) => {
    const newItems = [...items];
    const [moved] = newItems.splice(from, 1);
    newItems.splice(to, 0, moved);
    setItems(newItems);
  };
  
  return (
    <div className="w-full max-w-md select-none">
      <p className="text-white font-bold text-lg mb-4">Click arrows to organize items (Bloom's Taxonomy):</p>
      <div className="space-y-2">
        <AnimatePresence>
          {items.map((level, i) => (
            <motion.div layout key={level} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-xl transition-colors shadow-sm">
              <div className="flex flex-col gap-1 pr-2 border-r border-slate-600">
                <button disabled={i === 0} onClick={() => moveItem(i, i - 1)} className="text-slate-400 hover:text-white disabled:opacity-30">▲</button>
                <button disabled={i === items.length - 1} onClick={() => moveItem(i, i + 1)} className="text-slate-400 hover:text-white disabled:opacity-30">▼</button>
              </div>
              <span className="text-white font-medium text-sm flex-1">{level}</span>
              <span className="text-xs text-indigo-400 font-bold shrink-0">Level {i + 1}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function MatchingPreview() {
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const terms = ['Phishing', 'Malware', 'Ransomware'];
  const defs = ['Deceptive messages', 'Malicious code', 'File encryption ransom'];

  const handleDefClick = (def: string) => {
    if (!selectedTerm) return;
    setMatches(prev => ({ ...prev, [selectedTerm]: def }));
    setSelectedTerm(null);
  };

  return (
    <div className="w-full max-w-2xl select-none">
      <p className="text-white font-bold text-lg mb-4 text-center">Match each term to its definition:</p>
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-3">
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2 text-center">Terms (Click One)</p>
          {terms.map(term => {
            const isMatched = !!matches[term];
            const isSelected = selectedTerm === term;
            let cls = 'bg-slate-800 border-slate-600 text-slate-300';
            if (isSelected) cls = 'bg-indigo-600 border-indigo-400 text-white ring-4 ring-indigo-500/20';
            else if (isMatched) cls = 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400 opacity-50';
            return (
              <div key={term} onClick={() => !isMatched && setSelectedTerm(isSelected ? null : term)} className={`p-4 border-2 rounded-xl font-bold text-sm text-center cursor-pointer transition-all shadow-md ${cls}`}>
                {term} {isMatched && '✅'}
              </div>
            );
          })}
        </div>
        <div className="space-y-3">
          <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2 text-center">Definitions</p>
          {defs.map(def => {
            const matchedBy = Object.keys(matches).find(k => matches[k] === def);
            let cls = 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500';
            if (matchedBy) cls = 'bg-emerald-900/30 border-emerald-500 text-emerald-300 pointer-events-none cursor-default';
            else if (selectedTerm) cls = 'bg-purple-900/40 border-purple-500 text-white cursor-pointer ring-2 ring-purple-500 hover:bg-purple-800/80';
            return (
              <div key={def} onClick={() => handleDefClick(def)} className={`p-4 border border-dashed rounded-xl text-sm transition-all shadow-sm ${cls}`}>
                {matchedBy ? <span className="font-bold text-xs uppercase tracking-wider block mb-1 text-emerald-400">Match: {matchedBy}</span> : null}
                {def}
              </div>
            );
          })}
        </div>
      </div>
      {Object.keys(matches).length === terms.length && (
         <div className="mt-6 text-center animate-bounce">
            <p className="text-emerald-400 font-bold">All Matchings Complete! 🎉</p>
            <button onClick={() => setMatches({})} className="mt-2 text-xs opacity-60 hover:opacity-100 text-white">Reset</button>
         </div>
      )}
    </div>
  );
}

export function DropTargetsPreview() {
  const [items, setItems] = useState<{id: string, text: string, dropped: string | null}[]>([
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

    if (correctMap[item.text] !== zone) {
          setWrongFlash(zone);
          setTimeout(() => setWrongFlash(null), 500);
          return;
       }
    setItems(items.map(i => i.id === itemId ? { ...i, dropped: zone } : i));
  };

  // Click-based fallback setup for accessibility
  const moveTo = (itemText: string, target: string) => {
    const item = items.find(i => i.text === itemText);
    if (!item) return;
    if (correctMap[item.text] !== target) {
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
      <p className="text-white font-bold text-lg mb-4">Drag `&` Drop regulations to the correct category:</p>
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
          <div key={zone} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, zone)} className={`p-4 rounded-xl border-2 border-dashed bg-slate-800/50 min-h-[140px] flex flex-col items-center gap-2 transition-all ${wrongFlash === zone ? 'border-red-500 bg-red-500/20' : 'border-slate-600 hover:border-indigo-500'}`}>
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
}

export function TimelinePreview({ isPreview = true }: { isPreview?: boolean }) {
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
            <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setLayout("vertical"); }} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${layout === 'vertical' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}><LayoutList className="w-4 h-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setLayout("horizontal"); }} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${layout === 'horizontal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}><GripVertical className="w-4 h-4 rotate-90" /></button>
          </div>
        )}
      </div>

      <div className={`relative ${layout === 'horizontal' ? 'flex items-start justify-between min-h-[160px] pt-4' : ''}`}>
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
                <div key={i} className="flex flex-col items-center flex-1 cursor-pointer relative" onClick={(e) => { e.stopPropagation(); setOpenStep(isOpen ? null : i); }}>
                  <motion.div className={`w-8 h-8 rounded-full ${step.color} flex items-center justify-center text-white font-bold text-sm shadow-lg z-10 mb-2 transition-transform ${isOpen ? 'scale-125 ring-4 ring-white/20' : 'hover:scale-110'}`}>{step.n}</motion.div>
                  <span className="font-bold text-xs text-center text-slate-200 mb-2 h-8">{step.title}</span>
                  <AnimatePresence>
                     {isOpen && (
                       <motion.div initial={{ opacity: 0, scale: 0.5, y: -30, originY: 0 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.5, y: -30, originY: 0, transition:{duration:0.15} }} className={`absolute top-16 left-1/2 -translate-x-1/2 w-48 bg-slate-900 border-2 ${step.border} rounded-xl p-4 text-sm text-white shadow-2xl z-20 pointer-events-none`}>
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
                <button onClick={(e) => { e.stopPropagation(); setOpenStep(isOpen ? null : i); }} className={`w-full relative flex items-center gap-4 pl-14 pr-4 py-3 rounded-xl border transition-all text-left group ${isOpen ? '${step.border} bg-slate-800 text-white' : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800'}`}>
                  <div className={`absolute left-3 w-8 h-8 rounded-full ${step.color} flex items-center justify-center text-white font-bold text-sm shadow-lg shrink-0`}>{step.n}</div>
                  <span className="font-bold text-sm flex-1">{step.title}</span>
                  <span className="text-slate-500 text-xs group-hover:text-slate-300 transition-colors">{isOpen ? '▲ Close' : '▼ Details'}</span>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                       <div className={`mt-2 ml-14 mb-1 p-4 rounded-xl bg-slate-900 border ${step.border} text-slate-300 text-sm leading-relaxed shadow-inner`}>{step.content}</div>
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
}

export function GamePreview({ option }: { option: string }) {
  const templateMap: Record<string, string> = {
    'Knowledge Board (Jeopardy)': 'jeopardy',
    'Millionaire Challenge': 'millionaire',
    'Ranked Survey (Family Feud)': 'family-feud',
    'Digital Escape Room': 'escape-room',
    'Spin the Wheel': 'spin-wheel',
    'Price Estimator': 'price-is-right',
  };
  const templateId = templateMap[option];
  if (!templateId) return (
    <div className="flex items-center gap-3 p-6 text-amber-400 bg-amber-900/20 rounded-xl border border-amber-500/30 w-full">
      <span className="font-bold">No preview available for "{option}"</span>
    </div>
  );

  const base = {
    audienceType: 'corporate' as const,
    difficultyLevel: 'standard' as const,
    instructions: 'This is a demo preview.',
    scoringEnabled: true,
    timerEnabled: false,
  };

  let payload: any;

  if (templateId === 'jeopardy') {
    payload = {
      ...base, templateType: 'jeopardy', title: 'Security Knowledge Board',
      gamePayload: {
        deductPointsOnWrong: false,
        categories: [
          {
            id: 'c1', name: 'Phishing',
            questions: [
              { id: 'q1', value: 100, prompt: 'What is phishing?', correctAnswer: 'A social engineering attack using fake messages to steal credentials.', options: ['A social engineering attack using fake messages to steal credentials.', 'A type of firewall bypass technique', 'An encrypted data transfer protocol', 'A physical security vulnerability'], hint: 'It involves deception via email or messages.' },
              { id: 'q2', value: 200, prompt: 'Which is a red flag of a phishing email?', correctAnswer: 'Urgent language or suspicious sender domain', options: ['Urgent language or suspicious sender domain', 'Company logo in the header', 'Plain-text formatting only', 'Short subject line'] },
            ]
          },
          {
            id: 'c2', name: 'Passwords',
            questions: [
              { id: 'q3', value: 100, prompt: 'What is the recommended minimum password length?', correctAnswer: 'At least 12 characters', options: ['At least 4 characters', 'At least 8 characters', 'At least 12 characters', 'At least 20 characters'] },
              { id: 'q4', value: 200, prompt: 'What does MFA stand for?', correctAnswer: 'Multi-Factor Authentication', options: ['Multi-Factor Authentication', 'Managed Firewall Access', 'Mobile File Archiver', 'Manual Feedback Analysis'] },
            ]
          },
        ]
      }
    };
  } else if (templateId === 'millionaire') {
    payload = {
      ...base, templateType: 'millionaire', title: 'Security Millionaire',
      gamePayload: {
        lifelines: [
          { type: '5050', available: true },
          { type: 'phone-friend', available: true },
          { type: 'ask-audience', available: true },
        ],
        questions: [
          { id: 'q1', value: 100, prompt: 'Which of these is a safe email practice?', options: ['Click all links', 'Verify sender before clicking', 'Share passwords freely', 'Ignore security alerts'], correctAnswer: 'Verify sender before clicking', isSafeHaven: false },
          { id: 'q2', value: 500, prompt: 'What does HTTPS indicate on a website?', options: ['High Traffic Protocol', 'Encrypted connection', 'Fast loading site', 'Government-only site'], correctAnswer: 'Encrypted connection', isSafeHaven: true },
          { id: 'q3', value: 1000, prompt: 'What is the "principle of least privilege"?', options: ['Give all users admin access', 'Only grant access needed for a job role', 'Block all internet access', 'Require 10-character passwords'], correctAnswer: 'Only grant access needed for a job role', isSafeHaven: false },
        ]
      }
    };
  } else if (templateId === 'family-feud') {
    payload = {
      ...base, templateType: 'family-feud', title: 'Security Family Feud',
      gamePayload: {
        maxStrikesPerRound: 3,
        rounds: [
          {
            id: 'r1', prompt: 'Name a common type of cybersecurity threat.',
            answers: [
              { id: 'a1', text: 'Phishing', points: 45, synonyms: ['email scam', 'social engineering'] },
              { id: 'a2', text: 'Malware', points: 30, synonyms: ['virus', 'ransomware', 'spyware'] },
              { id: 'a3', text: 'Data breach', points: 15, synonyms: ['hack', 'leak'] },
              { id: 'a4', text: 'Password attack', points: 10, synonyms: ['brute force', 'credential stuffing'] },
            ]
          }
        ]
      }
    };
  } else if (templateId === 'escape-room') {
    payload = {
      ...base, templateType: 'escape-room', title: 'Cyber Security Escape Room',
      gamePayload: {
        scenarioIntro: 'A suspicious email was opened. You have 10 minutes to contain the breach before it spreads across the network.',
        successOutro: 'Breach contained! You saved the network.',
        stages: [
          {
            id: 's1', title: 'The Lobby',
            narrativeText: 'You receive an alert. A phishing email was clicked. Find the employee who clicked it.',
            clues: ['Check email logs', 'Look at the sender domain', 'The email arrived at 9:04 AM'],
            lock: { id: 'l1', type: 'code', prompt: 'Enter the department code shown in the email logs to isolate the workstation.', correctAnswer: '7734', hint: 'The department code is in the email footer.' }
          },
          {
            id: 's2', title: 'The Server Room',
            narrativeText: 'You find the compromised workstation. Now you must identify the malware type.',
            clues: ['The malware encrypts files', 'It demands a payment', 'Files now have a .locked extension'],
            lock: { id: 'l2', type: 'choice', prompt: 'What type of malware is this?', correctAnswer: 'ransomware', hint: 'It encrypts files and demands payment.' }
          }
        ]
      }
    };
  } else if (templateId === 'spin-wheel') {
    payload = {
      ...base, templateType: 'spin-wheel', title: 'Security Spin the Wheel',
      gamePayload: {
        spinsAllowed: 5,
        segments: [
          { id: 'seg1', label: 'Passwords', color: '#6366f1', questionPool: [{ prompt: 'How long should a strong password be?', correctAnswer: '12+ characters', options: ['4+ characters', '8+ characters', '12+ characters', '20+ characters'] }] },
          { id: 'seg2', label: 'Phishing', color: '#ec4899', questionPool: [{ prompt: 'What is spear phishing?', correctAnswer: 'Targeted attack on a specific person', options: ['Mass spam emails', 'Targeted attack on a specific person', 'Malware via USB drive', 'SQL injection attack'] }] },
          { id: 'seg3', label: 'Privacy', color: '#f59e0b', questionPool: [{ prompt: 'What does GDPR stand for?', correctAnswer: 'General Data Protection Regulation', options: ['General Data Privacy Rules', 'General Data Protection Regulation', 'Global Digital Privacy Regulation', 'Government Data Privacy Rules'] }] },
          { id: 'seg4', label: 'Compliance', color: '#10b981', questionPool: [{ prompt: 'What is the purpose of SOC 2?', correctAnswer: 'Auditing security controls of service organizations', options: ['Filing annual tax returns', 'Auditing security controls of service organizations', 'Managing employee performance reviews', 'Processing vendor contracts'] }] },
        ]
      }
    };
  } else if (templateId === 'price-is-right') {
    payload = {
      ...base, templateType: 'price-is-right', title: 'Guess the Compliance Penalty',
      gamePayload: {
        showcaseVariant: false,
        items: [
          { id: 'i1', name: 'GDPR Maximum Fine', description: 'The maximum penalty for serious GDPR violations in the EU.', correctValue: 20000000, toleranceRange: 2000000, explanation: 'GDPR max fine is €20M or 4% of global turnover, whichever is higher.' },
          { id: 'i2', name: 'Average Data Breach Cost (2024)', description: 'The average total cost of a data breach globally in 2024.', correctValue: 4880000, toleranceRange: 500000, explanation: 'IBM reports the average breach cost is approximately $4.88M in 2024.' },
        ]
      }
    };
  }

  return (
    <div className="w-full max-w-4xl bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
      <GameContainer payload={payload} />
    </div>
  );
}

