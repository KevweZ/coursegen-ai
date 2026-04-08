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
    { x: '15%', y: '20%', n: 1, label: 'Outer Layer' },
    { x: '70%', y: '15%', n: 2, label: 'Data Flow' },
    { x: '80%', y: '65%', n: 3, label: 'Security Zone' },
    { x: '20%', y: '70%', n: 4, label: 'Access Control' }
  ];
  return (
    <div className="w-full max-w-xl select-none">
      <p className="text-white font-bold text-lg mb-4">Click numbered hotspots to explore each part:</p>
      <div className="relative w-full h-[300px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-48 bg-indigo-500/10 rounded-full border border-indigo-500/30 flex items-center justify-center">
            <div className="w-28 h-28 bg-indigo-500/20 rounded-full border border-indigo-500/40 flex items-center justify-center">
              <div className="w-14 h-14 bg-indigo-500/40 rounded-full border border-indigo-500/60 flex items-center justify-center text-indigo-300 font-bold text-xs">Core</div>
            </div>
          </div>
        </div>
        {dots.map((dot) => (
          <div key={dot.n} className="absolute z-10" style={{ left: dot.x, top: dot.y }}>
            <button
              onClick={() => setOpenN(openN === dot.n ? null : dot.n)}
              className={`relative z-20 w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold text-sm shadow-xl transition-all ${openN === dot.n ? 'bg-pink-500 scale-125 ring-4 ring-pink-500/30' : 'bg-indigo-600 hover:bg-pink-500 hover:scale-110 animate-pulse'}`}
            >
              {dot.n}
            </button>
            <AnimatePresence>
              {openN === dot.n && (
                <motion.div initial={{ opacity: 0, scale: 0.8, x: 20 }} animate={{ opacity: 1, scale: 1, x: 45 }} exit={{ opacity: 0, scale: 0.8, x: 20 }} className="absolute -top-1 left-0 bg-slate-900 border-2 border-pink-500 text-white text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap shadow-2xl">
                  {dot.label}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
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
              <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest mb-2">📖 Scenario</p>
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
          <motion.div key="fail" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-red-900/40 border border-red-500/50 p-8 rounded-2xl text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-white font-bold text-xl mb-2">Costly Mistake!</p>
            <p className="text-red-200 text-sm mb-6">You fell for a Business Email Compromise (BEC) scam. The company lost $50,000.</p>
            <button onClick={() => setStep(0)} className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors">Retry Scenario</button>
          </motion.div>
        ) : (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-emerald-900/40 border border-emerald-500/50 p-8 rounded-2xl text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <p className="text-white font-bold text-xl mb-2">Disaster Averted!</p>
            <p className="text-emerald-200 text-sm mb-6">By verifying out-of-band, you thwarted a targeted spear-phishing attack.</p>
            <button onClick={() => setStep(0)} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors">Restart Scenario</button>
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

export function DragDropPreview() {
  const [items, setItems] = useState(['Social Security Number', 'Public Press Release', 'Employee Salary Data', 'Marketing Brochure']);
  const [confidential, setConfidential] = useState<string[]>([]);
  const [publicList, setPublicList] = useState<string[]>([]);

  const moveTo = (item: string, target: 'confidential'|'public') => {
    setItems(items.filter(i => i !== item));
    if (target === 'confidential') setConfidential([...confidential, item]);
    if (target === 'public') setPublicList([...publicList, item]);
  };

  return (
    <div className="w-full max-w-2xl space-y-4 select-none">
      <p className="text-white font-bold text-lg">Classify each item by clicking to assign:</p>
      
      {items.length > 0 && (
        <div className="flex flex-wrap gap-3 p-4 bg-slate-800 rounded-xl border border-slate-700 mb-2">
          <span className="text-xs text-slate-400 font-bold uppercase w-full mb-1">Unassigned Items:</span>
          {items.map(item => (
            <div key={item} className="group relative px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg transition-colors pr-10">
              {item}
              <div className="absolute right-0 top-0 bottom-0 flex">
                 <button onClick={() => moveTo(item, 'confidential')} className="w-6 bg-red-500 hover:bg-red-400 text-[10px] rounded-l-sm" title="Move to Confidential">C</button>
                 <button onClick={() => moveTo(item, 'public')} className="w-6 bg-green-500 hover:bg-green-400 text-[10px] rounded-r-lg" title="Move to Public">P</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <div className="p-4 bg-emerald-900/30 border border-emerald-500 text-emerald-400 rounded-xl text-center font-bold mb-4">
          All items classified! <button onClick={() => { setItems(['Social Security Number', 'Public Press Release', 'Employee Salary Data', 'Marketing Brochure']); setConfidential([]); setPublicList([]); }} className="text-white ml-2 underline text-xs">Reset</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border-2 border-dashed border-red-500/50 bg-red-500/10 min-h-[140px] flex flex-col gap-2">
           <p className="text-slate-300 font-bold mb-2 flex items-center justify-center border-b border-red-500/20 pb-2">🔒 Confidential</p>
           {confidential.map(i => <div key={i} className="text-xs font-bold bg-slate-800 text-white p-2 rounded">{i}</div>)}
        </div>
        <div className="p-4 rounded-xl border-2 border-dashed border-green-500/50 bg-green-500/10 min-h-[140px] flex flex-col gap-2">
           <p className="text-slate-300 font-bold mb-2 flex items-center justify-center border-b border-green-500/20 pb-2">📢 Public</p>
           {publicList.map(i => <div key={i} className="text-xs font-bold bg-slate-800 text-white p-2 rounded">{i}</div>)}
        </div>
      </div>
    </div>
  );
}

export function DropTargetsPreview() {
  const [items, setItems] = useState(['HIPAA', 'GDPR', 'SOX', 'PCI-DSS', 'FERPA']);
  const [zones, setZones] = useState<{ Healthcare: string[]; Financial: string[]; Education: string[] }>({ Healthcare: [], Financial: [], Education: [] });

  const moveTo = (item: string, target: 'Healthcare' | 'Financial' | 'Education') => {
    setItems(items.filter(i => i !== item));
    setZones({ ...zones, [target]: [...zones[target], item] });
  };

  return (
    <div className="w-full max-w-2xl select-none">
      <p className="text-white font-bold text-lg mb-4">Drop each regulation into the correct compliance category:</p>
      <div className="flex flex-wrap gap-2 p-4 bg-slate-800/50 rounded-xl border border-slate-700 mb-4 min-h-[70px]">
        {items.map(item => (
          <div key={item} className="group relative px-6 py-2 bg-indigo-600 rounded-lg text-white text-sm font-bold shadow-md pr-20 overflow-hidden">
            {item}
            <div className="absolute right-0 top-0 bottom-0 flex opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
               <button onClick={() => moveTo(item, 'Healthcare')}  className="w-6 bg-red-500 hover:bg-red-400 text-xs px-1">🏥</button>
               <button onClick={() => moveTo(item, 'Financial')}   className="w-6 bg-yellow-600 hover:bg-yellow-500 text-xs px-1">💰</button>
               <button onClick={() => moveTo(item, 'Education')}   className="w-6 bg-green-600 hover:bg-green-500 text-xs px-1">🎓</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-emerald-400 font-bold m-auto">All sorted!</p>}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {(['Healthcare', 'Financial', 'Education'] as const).map((zone) => (
          <div key={zone} className="p-4 rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/50 min-h-[140px] flex flex-col items-center gap-2 transition-colors hover:border-indigo-500">
            <span className="text-2xl">{zone === 'Healthcare' ? '🏥' : zone === 'Financial' ? '💰' : '🎓'}</span>
            <span className="text-xs font-bold uppercase text-slate-400">{zone}</span>
            <div className="w-full mt-2 space-y-1">
              {zones[zone].map(i => <div key={i} className="text-xs font-bold bg-indigo-600 text-white p-1.5 text-center rounded w-full line-clamp-1">{i}</div>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TimelinePreview() {
  const [openStep, setOpenStep] = useState<number | null>(null);
  const [layout, setLayout] = useState<'vertical' | 'horizontal'>('horizontal');
  const steps = [
    { n: 1, title: 'Preparation', content: 'Establish IR policies, train teams.', color: 'bg-blue-500', border: 'border-blue-500/50' },
    { n: 2, title: 'Identification', content: 'Detect security incidents using alerts.', color: 'bg-yellow-500', border: 'border-yellow-500/50' },
    { n: 3, title: 'Containment', content: 'Limit the damage and prevent spread.', color: 'bg-orange-500', border: 'border-orange-500/50' },
    { n: 4, title: 'Eradication', content: 'Remove root cause — patch systems.', color: 'bg-red-500', border: 'border-red-500/50' },
    { n: 5, title: 'Recovery', content: 'Restore systems to normal operations.', color: 'bg-green-500', border: 'border-green-500/50' },
  ];

  return (
    <div className="w-full max-w-3xl select-none">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white font-bold text-lg">Incident Timeline</p>
          <p className="text-slate-400 text-xs font-medium">Click steps to reveal details</p>
        </div>
        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
          <button onClick={() => setLayout('vertical')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${layout === 'vertical' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}><LayoutList className="w-4 h-4" /></button>
          <button onClick={() => setLayout('horizontal')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${layout === 'horizontal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}><GripVertical className="w-4 h-4 rotate-90" /></button>
        </div>
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
                <div key={i} className="flex flex-col items-center flex-1 cursor-pointer" onClick={() => setOpenStep(isOpen ? null : i)}>
                  <div className={`w-8 h-8 rounded-full ${step.color} flex items-center justify-center text-white font-bold text-sm shadow-lg z-10 mb-2 transition-transform ${isOpen ? 'scale-125 ring-4 ring-white/20' : 'hover:scale-110'}`}>{step.n}</div>
                  <span className="font-bold text-xs text-center text-slate-200 mb-2 h-8">{step.title}</span>
                  <AnimatePresence>
                     {isOpen && (
                       <motion.div initial={{ opacity: 0, scale: 0.9, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 10 }} className="absolute top-24 left-4 right-4 bg-slate-800 border border-slate-600 rounded-xl p-4 text-sm text-white shadow-2xl z-20 pointer-events-none">
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
                <button onClick={() => setOpenStep(isOpen ? null : i)} className={`w-full relative flex items-center gap-4 pl-14 pr-4 py-3 rounded-xl border transition-all text-left group ${isOpen ? `${step.border} bg-slate-800 text-white` : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800'}`}>
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
    'Knowledge Board': 'jeopardy',
    'Knowledge Board (Jeopardy)': 'jeopardy',
    'Millionaire Challenge': 'millionaire',
    'Ranked Survey': 'survey-says',
    'Digital Escape Room': 'escape-room',
    'Spin the Wheel': 'wheel-of-fortune',
    'Price Estimator': 'price-is-right'
  };
  const templateId = templateMap[option];
  if (!templateId) return <div>No preview available</div>;

  let payload: any = {};
  if (templateId === 'jeopardy') payload = { title: 'Security Jeopardy', columns: [{ category: 'Phishing', questions: [{ points: 100, prompt: 'What is phishing?', type: 'multiple_choice', options: [{id:'a', text:'Bad', isCorrect:true}, {id:'b', text:'Good', isCorrect:false}] }] }] };
  if (templateId === 'millionaire') payload = { title: 'Security Millionaire', questions: [{ prompt: 'Which of the following is true?', options: [{id:'a', text:'A', isCorrect:true}, {id:'b', text:'B'}], difficultyLevel: 1 }] };
  if (templateId === 'escape-room') payload = { theme: 'Cyber Security', rooms: [{ title: 'The Lobby', narrative: 'Escape the lobby', challenges: [{ prompt: 'What is 2+2?', type: 'text', correctAnswers: ['4'] }]}] };
  if (templateId === 'survey-says') payload = { pollGroups: [{ prompt: 'Name a security threat', totalRespondents: 100, answers: [{ text: 'Phishing', points: 50 }, { text: 'Malware', points: 30 }] }] };
  if (templateId === 'wheel-of-fortune') payload = { categories: ['Security', 'Privacy', 'Compliance'], questions: [{ prompt: 'What is privacy?', category: 'Privacy', answer: { text: 'Data protection' } }] };
  if (templateId === 'price-is-right') payload = { title: 'Guess the Penalty', items: [{ name: 'GDPR Fine', description: 'Max fine', actualPrice: 20000000 }] };

  return (
    <div className="w-full max-w-4xl h-[600px] bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl relative">
      <div className="absolute inset-0 overflow-y-auto custom-scrollbar flex items-center justify-center p-4">
         <GameContainer payload={{ templateType: templateId, ...payload }} />
      </div>
    </div>
  );
}
