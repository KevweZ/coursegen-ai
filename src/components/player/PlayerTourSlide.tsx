import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Volume2, PanelLeft, Palette,
  BookOpen, Gamepad2, Play, ChevronLeft, ChevronRight, BarChart2,
} from 'lucide-react';

type Theme = 'light' | 'dark' | 'unified';
interface Props { theme: Theme; onSkip: () => void; }

const CARDS = [
  { id: 'prev-next', icon: ArrowRight,  title: 'Prev / Next',         color: '#4f46e5' },
  { id: 'sidebar',   icon: PanelLeft,   title: 'Table of Contents',   color: '#0891b2' },
  { id: 'volume',    icon: Volume2,      title: 'Narration & Volume',  color: '#16a34a' },
  { id: 'toolbar',   icon: Palette,      title: 'Theme & Tools',       color: '#d97706' },
  { id: 'seekbar',   icon: BarChart2,    title: 'Progress Bar',        color: '#9333ea' },
  { id: 'canvas',    icon: Gamepad2,     title: 'Interactive Slides',  color: '#e11d48' },
];

const BG:      Record<Theme,string> = { dark:'#0f172a', light:'#f1f5f9', unified:'#1e1b4b' };
const CARD_BG: Record<Theme,string> = { dark:'#1e293b', light:'#ffffff', unified:'#2e1065' };
const TEXT:    Record<Theme,string> = { dark:'#e2e8f0', light:'#1e293b', unified:'#e0e7ff' };
const SUB:     Record<Theme,string> = { dark:'#94a3b8', light:'#475569', unified:'#a5b4fc' };

function glowStyle(active: boolean, color: string): React.CSSProperties {
  return {
    boxShadow: active ? `0 0 0 2px ${color}, 0 0 14px ${color}55` : 'none',
    transition: 'box-shadow 0.18s ease',
    outline: active ? `2px solid ${color}` : '2px solid transparent',
    outlineOffset: '1px',
  };
}

// ── Mini Player — full faithful replica ──────────────────────────────────────
const MiniPlayer: React.FC<{ hovered: string | null; theme: Theme }> = ({ hovered, theme }) => {
  const isDark  = theme !== 'light';
  const mockBg  = isDark ? '#0d1526' : '#e8edf5';
  const mockBar = isDark ? '#111827' : '#d1d9e6';
  const mockSide= isDark ? '#0f172a' : '#dce3ed';
  const accent  = '#4f46e5';
  const faint   = isDark ? '#1e2d47' : '#b0bed0';
  const mid     = isDark ? '#3d5580' : '#7a96b3';
  const light   = isDark ? '#64748b' : '#94a3b8';
  const body    = isDark ? '#e2e8f0' : '#1e293b';

  const TOC = [
    { label:'Course Introduction',    indent:0, module:true,  active:false },
    { label:'Player Tour',            indent:1, module:false, active:true,  sub:'Skip' },
    { label:'Course Objectives',      indent:1, module:false, active:false },
    { label:'MODULE 1 — CORE PLAYER', indent:0, module:true,  active:false },
    { label:'1.1  Module 1 — Overview', indent:1, module:false, active:false },
    { label:'1.2  Player Layout',     indent:1, module:false, active:false },
    { label:'1.3  Key Takeaways',     indent:1, module:false, active:false },
    { label:'MODULE 2 — EXPLORATORY', indent:0, module:true,  active:false },
    { label:'2.1  Module 2 — Overview',indent:1, module:false, active:false },
  ];

  // Accordion items for canvas
  const ACCORDION = [
    { title:'What is Active Listening?', open:true,
      body:'Fully concentrating on what is being said and responding thoughtfully.' },
    { title:'Common Barriers in Remote Teams', open:false, body:'' },
    { title:'Practical Techniques', open:false, body:'' },
  ];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden"
      style={{ backgroundColor:mockBg, borderRadius:'10px',
        border:`1.5px solid ${isDark?'rgba(255,255,255,0.09)':'rgba(0,0,0,0.13)'}` }}>

      {/* Top toolbar */}
      <div className="shrink-0 flex items-center justify-between px-2"
        style={{ ...glowStyle(hovered==='toolbar','#d97706'), height:'22px',
          backgroundColor:mockBar,
          borderBottom:`1px solid ${isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.09)'}` }}>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor:accent, opacity:0.9 }} />
          <span style={{ color:body, fontSize:'5.5px', fontWeight:800, letterSpacing:'0.04em' }}>Demo Course</span>
          <div className="rounded px-1" style={{ backgroundColor:isDark?'#1e293b':'#cbd5e1',
            border:`1px solid ${isDark?'#334155':'#94a3b8'}` }}>
            <span style={{ color:light, fontSize:'4.5px', fontWeight:700, letterSpacing:'0.08em' }}>PREVIEW</span>
          </div>
        </div>
        <div className="flex gap-1">
          {[{label:'QC Check',bg:'#16a34a'},{label:'Save',bg:isDark?'#1e293b':'#c5cedb'},{label:'↑ Export',bg:accent}]
            .map((btn,i)=>(
            <div key={i} className="rounded px-1 flex items-center"
              style={{ backgroundColor:btn.bg, border:'1px solid rgba(255,255,255,0.1)', height:'11px' }}>
              <span style={{ color:i===1?light:'#fff', fontSize:'4.5px', fontWeight:700 }}>{btn.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">

        {/* Sidebar */}
        <div className="shrink-0 flex flex-col"
          style={{ ...glowStyle(hovered==='sidebar','#0891b2'), width:'30%',
            backgroundColor:mockSide,
            borderRight:`1px solid ${isDark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.08)'}` }}>
          <div className="flex items-center justify-between px-1.5 py-1"
            style={{ borderBottom:`1px solid ${isDark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.07)'}` }}>
            <span style={{ color:body, fontSize:'4.5px', fontWeight:800, letterSpacing:'0.1em' }}>TABLE OF CONTENTS</span>
            <div className="rounded px-1" style={{ backgroundColor:isDark?'#1e293b':'#c0cbd9' }}>
              <span style={{ color:light, fontSize:'4px' }}>28</span>
            </div>
          </div>
          <div className="flex flex-col gap-px px-1 py-1 overflow-hidden">
            {TOC.map((row,i)=>(
              <div key={i} className="rounded flex items-center justify-between"
                style={{ paddingLeft:row.indent?'7px':'2px', paddingTop:'1.5px', paddingBottom:'1.5px', paddingRight:'2px',
                  backgroundColor:row.active?`${accent}22`:'transparent',
                  border:row.active?`1px solid ${accent}44`:'1px solid transparent',
                  marginTop:row.module&&i>0?'2px':0 }}>
                <span style={{ color:row.active?'#818cf8':row.module?body:light,
                  fontSize:row.module?'4px':'3.8px', fontWeight:row.module||row.active?800:500,
                  letterSpacing:row.module?'0.07em':0, whiteSpace:'nowrap',
                  overflow:'hidden', textOverflow:'ellipsis', maxWidth:'88%' }}>
                  {row.label}
                </span>
                {row.sub&&<span style={{ color:accent, fontSize:'3.5px', fontWeight:700 }}>{row.sub}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Canvas — accordion interaction */}
        <div className="flex-1 flex flex-col p-2 gap-1.5 overflow-hidden"
          style={{ ...glowStyle(hovered==='canvas','#e11d48'), backgroundColor:mockBg }}>
          {/* Slide label */}
          <div>
            <span style={{ color:'#818cf8', fontSize:'4.5px', fontWeight:800, letterSpacing:'0.1em' }}>ACTIVE LISTENING</span>
            <div className="h-px mt-0.5 rounded" style={{ background:`linear-gradient(to right, ${accent}60, transparent)` }} />
          </div>
          {/* Accordion items */}
          {ACCORDION.map((item,i)=>(
            <div key={i}>
              <div className="flex items-center justify-between px-1.5 py-1 rounded"
                style={{ backgroundColor:item.open?`${accent}18`:isDark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.04)',
                  border:`1px solid ${item.open?`${accent}55`:isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.09)'}` }}>
                <span style={{ color:item.open?'#c7d2fe':light, fontSize:'4px', fontWeight:item.open?700:500 }}>{item.title}</span>
                <ChevronRight className={item.open?'rotate-90':''} style={{ width:'5px', height:'5px', color:item.open?'#818cf8':light, transition:'transform 0.2s' }} />
              </div>
              {item.open&&(
                <div className="px-1.5 py-1 rounded-b" style={{ backgroundColor:isDark?'rgba(79,70,229,0.06)':'rgba(79,70,229,0.04)',
                  borderLeft:`1px solid ${accent}33`, borderRight:`1px solid ${accent}33`, borderBottom:`1px solid ${accent}33` }}>
                  <span style={{ color:light, fontSize:'3.8px', lineHeight:1.4 }}>{item.body}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 flex flex-col"
        style={{ backgroundColor:mockBar, borderTop:`1px solid ${isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.1)'}` }}>
        {/* Seekbar */}
        <div className="mx-2 mt-1 rounded-full overflow-hidden"
          style={{ ...glowStyle(hovered==='seekbar','#9333ea'), height:'3px',
            backgroundColor:isDark?'rgba(255,255,255,0.09)':'rgba(0,0,0,0.13)' }}>
          <div className="h-full rounded-full" style={{ width:'16%', backgroundColor:accent }} />
        </div>
        {/* Controls */}
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-1" style={glowStyle(hovered==='volume','#16a34a')}>
            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor:accent }}>
              <Play className="w-1.5 h-1.5 text-white" />
            </div>
            <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
              style={{ backgroundColor:'rgba(22,163,74,0.18)', border:'1px solid rgba(22,163,74,0.45)' }}>
              <Volume2 className="w-1.5 h-1.5" style={{ color:'#16a34a' }} />
            </div>
            <div className="rounded-full overflow-hidden" style={{ width:'18px', height:'2.5px', backgroundColor:'rgba(255,255,255,0.12)' }}>
              <div className="h-full rounded-full" style={{ width:'50%', backgroundColor:'#16a34a' }} />
            </div>
          </div>
          <span style={{ color:light, fontSize:'4.5px', whiteSpace:'nowrap' }}>2 / 28 · Player Tour</span>
          <div className="flex items-center gap-1" style={glowStyle(hovered==='prev-next',accent)}>
            <div className="flex items-center gap-px rounded px-1 py-0.5"
              style={{ backgroundColor:isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)' }}>
              <ChevronLeft className="w-2 h-2" style={{ color:mid }} />
              <span style={{ color:mid, fontSize:'4.5px', fontWeight:700 }}>Prev</span>
            </div>
            <div className="flex items-center gap-px rounded px-1.5 py-0.5" style={{ backgroundColor:accent }}>
              <span style={{ color:'#fff', fontSize:'4.5px', fontWeight:700 }}>Next</span>
              <ChevronRight className="w-2 h-2 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main slide ───────────────────────────────────────────────────────────────
export const PlayerTourSlide: React.FC<Props> = ({ theme, onSkip }) => {
  const [showModal, setShowModal] = useState(true);
  const [hovered,   setHovered]   = useState<string | null>(null);

  const bg     = BG[theme]     || BG.dark;
  const cardBg = CARD_BG[theme]|| CARD_BG.dark;
  const textClr= TEXT[theme]   || TEXT.dark;
  const subClr = SUB[theme]    || SUB.dark;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ backgroundColor:bg }}>

      {/* ── Header ── */}
      <div className="shrink-0 px-6 pt-5 pb-2 flex items-start justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest mb-0.5" style={{ color:'#818cf8' }}>
            Player Navigation Guide
          </p>
          <p className="text-[11px]" style={{ color:subClr }}>
            Hover any feature button below to see it highlighted in the player
          </p>
        </div>
        <button
          onClick={onSkip}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
          style={{ color:subClr, border:`1px solid rgba(255,255,255,0.12)` }}
        >
          Skip <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Player mockup — fills most of the slide ── */}
      <div className="flex-1 min-h-0 px-6 pb-3">
        <MiniPlayer hovered={hovered} theme={theme} />
      </div>

      {/* ── Feature buttons — compact horizontal row at bottom ── */}
      <div className="shrink-0 px-6 pb-5">
        <div className="flex flex-wrap gap-2 justify-center">
          {CARDS.map((card) => {
            const Icon = card.icon;
            const isActive = hovered === card.id;
            return (
              <motion.button
                key={card.id}
                onMouseEnter={() => setHovered(card.id)}
                onMouseLeave={() => setHovered(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                style={{
                  backgroundColor: isActive ? `${card.color}22` : cardBg,
                  border: `1.5px solid ${isActive ? card.color : `${card.color}30`}`,
                  color: isActive ? card.color : subClr,
                  boxShadow: isActive ? `0 0 10px ${card.color}33` : 'none',
                }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: card.color }} />
                {card.title}
              </motion.button>
            );
          })}
          {/* Continue button */}
          <motion.button
            onClick={onSkip}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150"
            style={{ backgroundColor:'rgba(79,70,229,0.15)', border:'1.5px solid #4f46e5', color:'#818cf8' }}
            whileHover={{ backgroundColor:'rgba(79,70,229,0.28)', scale:1.04 }}
            whileTap={{ scale:0.97 }}
          >
            Continue to Course <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>

      {/* ── Blocking intro modal ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="absolute inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor:'rgba(0,0,0,0.72)', backdropFilter:'blur(4px)' }}
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.22 }}>
            <motion.div className="rounded-2xl p-8 mx-6 max-w-sm w-full text-center shadow-2xl"
              style={{ backgroundColor:cardBg, border:'1.5px solid rgba(255,255,255,0.1)' }}
              initial={{ scale:0.9, y:16 }} animate={{ scale:1, y:0 }} exit={{ scale:0.9, y:16 }} transition={{ duration:0.22 }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor:'#4f46e522' }}>
                <BookOpen className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="font-extrabold text-lg mb-2" style={{ color:textClr }}>Player Tutorial</h3>
              <p className="text-sm mb-6 leading-relaxed" style={{ color:subClr }}>
                Would you like a quick overview of the player controls before we begin?
              </p>
              <div className="flex gap-3">
                <button onClick={onSkip}
                  className="flex-1 px-4 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all hover:opacity-80"
                  style={{ borderColor:'rgba(255,255,255,0.15)', color:subClr }}>
                  Skip
                </button>
                <button onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors">
                  Show Me
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlayerTourSlide;
