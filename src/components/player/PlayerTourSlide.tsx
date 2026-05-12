import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Volume2, PanelLeft,
  BookOpen, Gamepad2, Play, ChevronLeft, ChevronRight,
  BarChart2, ChevronDown, Monitor,
} from 'lucide-react';

type Theme = 'light' | 'dark' | 'unified';
interface Props { theme: Theme; onSkip: () => void; }

/* ── Feature zones ─────────────────────────────────────────────────────────── */
const ZONES = [
  { id:'sidebar',  label:'Table of Contents',  icon:PanelLeft,  color:'#06b6d4',
    desc:'The left sidebar lists every module and slide in the course. Click any entry to jump directly to that slide at your own pace.' },
  { id:'canvas',   label:'Interactive Slides', icon:Gamepad2,   color:'#f43f5e',
    desc:'Interactive slides ask you to click, drag, or engage with a challenge. Read each slide\'s instructions before starting.' },
  { id:'seekbar',  label:'Progress Bar',       icon:BarChart2,  color:'#a855f7',
    desc:'The seekbar tracks your position through the course. Click anywhere on it to jump to that point, or watch it fill as you advance.' },
  { id:'volume',   label:'Narration & Volume', icon:Volume2,    color:'#22c55e',
    desc:'Press Play to start audio narration for each slide. Use the Volume button to mute or adjust audio at any time.' },
  { id:'prevnext', label:'Prev / Next',        icon:ArrowRight, color:'#f97316',
    desc:'The Prev and Next buttons sit at the bottom-right of the player. Use them to move between slides at your own pace.' },
];

/* ── Highlight helpers ─────────────────────────────────────────────────────── */
function sectionHL(on: boolean, color: string): React.CSSProperties {
  return {
    border: `2px solid ${on ? color : 'transparent'}`,
    boxShadow: on ? `inset 0 0 40px ${color}1a, 0 0 0 1px ${color}` : 'none',
    transition: 'border-color 0.18s, box-shadow 0.18s',
  };
}
function controlHL(on: boolean, color: string): React.CSSProperties {
  return {
    outline: on ? `2px solid ${color}` : '2px solid transparent',
    outlineOffset: '3px',
    borderRadius: '8px',
    boxShadow: on ? `0 0 18px ${color}66` : 'none',
    transition: 'outline-color 0.18s, box-shadow 0.18s',
  };
}

/* ── Accordion data ────────────────────────────────────────────────────────── */
const ACC = [
  { title:'What is Active Listening?', open:true,
    body:'Fully concentrating, understanding, and responding to what is being said — not just passively hearing.' },
  { title:'Common Barriers in Remote Teams', open:false, body:'' },
  { title:'Practical Techniques', open:false, body:'' },
];

/* ══════════════════════════════════════════════════════════════════════════════
   PLAYER REPLICA — learner view only
══════════════════════════════════════════════════════════════════════════════ */
function PlayerReplica({ hovered, activeZone }: { hovered: string | null; activeZone: typeof ZONES[0] | null }) {
  const acc  = '#6366f1';
  const bg   = '#0f172a';
  const bar  = '#111827';
  const side = '#0d1117';
  const card = '#1e293b';
  const lt   = '#94a3b8';
  const md   = '#64748b';

  const hColor = (id: string) => ZONES.find(z => z.id === id)?.color ?? acc;
  const h = (id: string) => hovered === id;

  const TOC = [
    { label:'Course Introduction',      module:true,  active:false },
    { label:'Player Tour',              module:false, active:true,  skip:true },
    { label:'Course Objectives',        module:false, active:false },
    { label:'MODULE 1 — CORE PLAYER',   module:true,  active:false },
    { label:'1.1  Module 1 — Overview', module:false, active:false },
    { label:'1.2  Player Layout',       module:false, active:false },
    { label:'1.3  Key Takeaways',       module:false, active:false },
    { label:'1.4  Components',          module:false, active:false },
    { label:'MODULE 2 — EXPLORATORY',   module:true,  active:false },
    { label:'2.1  Module 2 — Overview', module:false, active:false },
    { label:'2.2  Deep Dive',           module:false, active:false },
  ];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden rounded-xl"
      style={{ background:bg, border:'1.5px solid rgba(255,255,255,0.09)',
        boxShadow:'0 32px 80px rgba(0,0,0,0.7)' }}>

      {/* TOP BAR */}
      <div className="shrink-0 flex items-center justify-between px-4"
        style={{ height:'42px', background:bar,
          borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background:`linear-gradient(135deg,${acc},#818cf8)` }}>
            <span style={{ color:'#fff', fontSize:'10px', fontWeight:900 }}>N</span>
          </div>
          <span style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:700 }}>Demo Course</span>
          <div className="px-2 py-0.5 rounded-md" style={{ background:'#1e293b', border:'1px solid #334155' }}>
            <span style={{ color:'#64748b', fontSize:'10px', fontWeight:700, letterSpacing:'0.06em' }}>PREVIEW</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md"
          style={{ background:'#1e293b', border:'1px solid #334155' }}>
          <Monitor style={{ width:'12px', height:'12px', color:lt }} />
          <span style={{ color:lt, fontSize:'10px', fontWeight:600 }}>Desktop</span>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 flex min-h-0">

        {/* SIDEBAR */}
        <div className="shrink-0 flex flex-col overflow-hidden"
          style={{ ...sectionHL(h('sidebar'), hColor('sidebar')),
            width:'190px',
            backgroundColor: h('sidebar') ? `color-mix(in srgb, ${hColor('sidebar')} 6%, ${side})` : side,
            borderRight: h('sidebar') ? `2px solid ${hColor('sidebar')}` : '2px solid rgba(255,255,255,0.06)',
            transition:'all 0.18s' }}>
          <div className="flex items-center justify-between px-3 py-2.5"
            style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color:'#e2e8f0', fontSize:'9.5px', fontWeight:800, letterSpacing:'0.12em' }}>
              TABLE OF CONTENTS
            </span>
            <div className="px-1.5 py-0.5 rounded" style={{ background:card }}>
              <span style={{ color:lt, fontSize:'9px', fontWeight:600 }}>28</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {TOC.map((row,i) => (
              <div key={i} className="flex items-center justify-between mx-1.5 my-px px-2 py-1.5 rounded-md"
                style={{ marginLeft:row.module?'6px':'18px',
                  background:row.active?`${acc}22`:'transparent',
                  border:row.active?`1px solid ${acc}44`:'1px solid transparent',
                  marginTop:row.module&&i>0?'4px':undefined }}>
                <span style={{ color:row.active?'#a5b4fc':row.module?'#e2e8f0':md,
                  fontSize:row.module?'9.5px':'9px',
                  fontWeight:row.module?700:row.active?600:400,
                  letterSpacing:row.module?'0.06em':0,
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'130px' }}>
                  {row.label}
                </span>
                {row.skip&&<span style={{ color:acc, fontSize:'8px', fontWeight:700 }}>Skip</span>}
              </div>
            ))}
          </div>
        </div>

        {/* CANVAS */}
        <div className="flex-1 flex flex-col min-w-0 p-4 gap-3 overflow-hidden"
          style={{ ...sectionHL(h('canvas'), hColor('canvas')),
            backgroundColor: h('canvas') ? `color-mix(in srgb, ${hColor('canvas')} 5%, ${bg})` : bg,
            transition:'all 0.18s' }}>
          <div>
            <p style={{ color:'#f1f5f9', fontSize:'18px', fontWeight:800,
              letterSpacing:'-0.02em', marginBottom:'4px' }}>Active Listening</p>
            <div style={{ height:'2px', width:'100%', borderRadius:'2px',
              background:`linear-gradient(to right, ${acc}cc, transparent)` }} />
          </div>
          <p style={{ color:lt, fontSize:'11px', marginTop:'-4px' }}>
            Explore each section — click to expand
          </p>
          {ACC.map((item,i) => (
            <div key={i} className="rounded-lg overflow-hidden"
              style={{ border:`1px solid ${item.open?`${acc}55`:'rgba(255,255,255,0.08)'}`,
                background:item.open?`${acc}12`:card }}>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span style={{ color:item.open?'#c7d2fe':'#e2e8f0',
                  fontSize:'11.5px', fontWeight:item.open?700:500 }}>{item.title}</span>
                <ChevronDown style={{ width:'13px', height:'13px', color:item.open?'#818cf8':md,
                  transform:item.open?'rotate(180deg)':'none', transition:'transform 0.2s' }} />
              </div>
              {item.open&&(
                <div className="px-4 pb-3">
                  <p style={{ color:lt, fontSize:'10.5px', lineHeight:1.6 }}>{item.body}</p>
                </div>
              )}
            </div>
          ))}

          {/* ── In-player zone description — bottom of canvas ── */}
          <div className="mt-auto pt-2">
            <AnimatePresence mode="wait">
              {activeZone ? (
                <motion.div
                  key={activeZone.id}
                  initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:4 }}
                  transition={{ duration:0.18 }}
                  style={{
                    background: `color-mix(in srgb, ${activeZone.color} 10%, #0f172a)`,
                    border: `1px solid ${activeZone.color}45`,
                    borderRadius: '10px',
                    padding: '10px 14px',
                    boxShadow: `0 0 20px ${activeZone.color}22`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <activeZone.icon style={{ width:'12px', height:'12px', color:activeZone.color, flexShrink:0 }} />
                    <span style={{ color:activeZone.color, fontSize:'10.5px', fontWeight:800, letterSpacing:'0.03em' }}>
                      {activeZone.label}
                    </span>
                  </div>
                  <p style={{ color:'#cbd5e1', fontSize:'10.5px', lineHeight:1.6, margin:0 }}>
                    {activeZone.desc}
                  </p>
                </motion.div>
              ) : (
                <motion.p
                  key="placeholder"
                  initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                  style={{ color:md, fontSize:'10px', textAlign:'center', padding:'8px 0' }}
                >
                  Hover a button below to learn about each part of the player
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="shrink-0 flex flex-col"
        style={{ background:bar, borderTop:'1px solid rgba(255,255,255,0.07)' }}>
        {/* Seekbar */}
        <div className="px-4 pt-2.5 pb-1">
          <div style={{ ...controlHL(h('seekbar'), hColor('seekbar')),
            position:'relative', height:'6px', borderRadius:'999px', overflow:'visible',
            background:'rgba(255,255,255,0.1)' }}>
            <div style={{ position:'absolute', inset:'0', right:'88%',
              background:h('seekbar')?hColor('seekbar'):acc,
              borderRadius:'999px', transition:'background 0.18s' }} />
            <div style={{ position:'absolute', top:'50%', left:'12%',
              transform:'translateX(-50%) translateY(-50%)',
              width:'12px', height:'12px', borderRadius:'50%',
              background:'#fff', border:`2px solid ${h('seekbar')?hColor('seekbar'):acc}`,
              transition:'border-color 0.18s' }} />
          </div>
        </div>
        {/* Controls row */}
        <div className="flex items-center justify-between px-4 pb-2.5">
          {/* Play + Volume */}
          <div className="flex items-center gap-2"
            style={controlHL(h('volume'), hColor('volume'))}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background:acc }}>
              <Play style={{ width:'11px', height:'11px', fill:'#fff', color:'#fff' }} />
            </div>
            <div className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.4)' }}>
              <Volume2 style={{ width:'11px', height:'11px', color:'#22c55e' }} />
            </div>
            <div className="rounded-full overflow-hidden"
              style={{ width:'44px', height:'4px', background:'rgba(255,255,255,0.12)' }}>
              <div style={{ width:'55%', height:'100%', background:'#22c55e', borderRadius:'999px' }} />
            </div>
            <span style={{ color:md, fontSize:'9.5px' }}>No narration</span>
          </div>
          {/* Slide info */}
          <span style={{ color:lt, fontSize:'9.5px', fontWeight:500 }}>2 / 28 · Player Tour</span>
          {/* Prev + Next */}
          <div className="flex items-center gap-1.5"
            style={controlHL(h('prevnext'), hColor('prevnext'))}>
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg"
              style={{ background:'rgba(255,255,255,0.07)' }}>
              <ChevronLeft style={{ width:'11px', height:'11px', color:lt }} />
              <span style={{ color:lt, fontSize:'10px', fontWeight:600 }}>Prev</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg"
              style={{ background:acc }}>
              <span style={{ color:'#fff', fontSize:'10px', fontWeight:700 }}>Next</span>
              <ChevronRight style={{ width:'11px', height:'11px', color:'#fff' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   SIDE TOOLTIP PANEL — appears beside the player when a zone is active
══════════════════════════════════════════════════════════════════════════════ */
function SideTooltip({ zone, subClr }: { zone: typeof ZONES[0] | null; subClr: string }) {
  return (
    <div className="relative flex items-center" style={{ width:'220px', minWidth:'220px' }}>
      {/* Arrow pointing left toward the player */}
      <AnimatePresence>
        {zone && (
          <motion.div
            key={zone.id}
            initial={{ opacity:0, x:18, scale:0.94 }}
            animate={{ opacity:1, x:0,  scale:1   }}
            exit={{    opacity:0, x:12, scale:0.94 }}
            transition={{ type:'spring', stiffness:340, damping:28 }}
            className="w-full relative"
          >
            {/* Caret */}
            <div style={{
              position:'absolute', left:'-8px', top:'50%',
              transform:'translateY(-50%)',
              width:0, height:0,
              borderTop:'8px solid transparent',
              borderBottom:'8px solid transparent',
              borderRight:`8px solid ${zone.color}40`,
            }} />
            <div style={{
              background:'#0f172a',
              border:`1.5px solid ${zone.color}50`,
              borderRadius:'14px',
              padding:'16px 18px',
              boxShadow:`0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${zone.color}20, inset 0 0 24px ${zone.color}08`,
            }}>
              {/* Zone color accent bar */}
              <div style={{
                width:'32px', height:'3px', borderRadius:'2px',
                background:zone.color, marginBottom:'10px',
                boxShadow:`0 0 8px ${zone.color}`,
              }} />
              <div className="flex items-center gap-2 mb-2">
                <zone.icon style={{ width:'14px', height:'14px', color:zone.color, flexShrink:0 }} />
                <span style={{ color:zone.color, fontSize:'12px', fontWeight:800, letterSpacing:'0.02em' }}>
                  {zone.label}
                </span>
              </div>
              <p style={{ color:'#cbd5e1', fontSize:'12px', lineHeight:1.65, margin:0 }}>
                {zone.desc}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Placeholder when nothing is hovered */}
      <AnimatePresence>
        {!zone && (
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="w-full text-center px-4"
          >
            <p style={{ color:subClr, fontSize:'11.5px', lineHeight:1.6 }}>
              Hover or click a button below to learn about each part of the player
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN SLIDE
══════════════════════════════════════════════════════════════════════════════ */
const BG:      Record<Theme,string> = { dark:'#060d1a', light:'#f1f5f9', unified:'#13102b' };
const CARD_BG: Record<Theme,string> = { dark:'#1e293b', light:'#ffffff', unified:'#2e1065' };
const TEXT:    Record<Theme,string> = { dark:'#e2e8f0', light:'#1e293b', unified:'#e0e7ff' };
const SUB:     Record<Theme,string> = { dark:'#94a3b8', light:'#475569', unified:'#a5b4fc' };

export const PlayerTourSlide: React.FC<Props> = ({ theme, onSkip }) => {
  const [showModal, setShowModal] = useState(true);
  const [hovered,   setHovered]   = useState<string | null>(null);
  const [clicked,   setClicked]   = useState<string | null>(null);

  const bg     = BG[theme]     ?? BG.dark;
  const cardBg = CARD_BG[theme]?? CARD_BG.dark;
  const textClr= TEXT[theme]   ?? TEXT.dark;
  const subClr = SUB[theme]    ?? SUB.dark;

  // Active zone: clicked takes priority over hovered
  const activeId   = clicked ?? hovered;
  const activeZone = ZONES.find(z => z.id === activeId) ?? null;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative"
      style={{ backgroundColor:bg }}>

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-6 pt-4 pb-2">
        <div>
          <p style={{ color:'#818cf8', fontSize:'11px', fontWeight:800,
            letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:'2px' }}>
            Player Navigation Guide
          </p>
          <p style={{ color:subClr, fontSize:'12px' }}>
            Hover a button below to highlight that part of the player
          </p>
        </div>
        <button onClick={onSkip}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold"
          style={{ color:subClr, border:'1px solid rgba(255,255,255,0.12)' }}>
          Skip <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main body: Player — full width, no side panel */}
      <div className="flex-1 min-h-0 px-5 py-1">
        <PlayerReplica hovered={hovered} activeZone={activeZone} />
      </div>

      {/* Feature buttons row */}
      <div className="shrink-0 px-6 pb-4 pt-2">
        <div className="flex flex-wrap gap-2 justify-center">
          {ZONES.map(z => {
            const Icon = z.icon;
            const isH = hovered === z.id;
            const isC = clicked === z.id;
            return (
              <motion.button key={z.id}
                onMouseEnter={() => setHovered(z.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setClicked(isC ? null : z.id)}
                whileHover={{ scale:1.06 }} whileTap={{ scale:0.96 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{
                  background: isH||isC ? `${z.color}22` : cardBg,
                  border:`1.5px solid ${isH||isC ? z.color : `${z.color}30`}`,
                  color: isH||isC ? z.color : subClr,
                  boxShadow: isH ? `0 0 14px ${z.color}44` : 'none',
                  transition:'all 0.15s',
                }}>
                <Icon className="w-3.5 h-3.5" style={{ color:z.color }} />
                {z.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Intro modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="absolute inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)' }}
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <motion.div className="rounded-2xl p-8 mx-6 max-w-sm w-full text-center shadow-2xl"
              style={{ backgroundColor:cardBg, border:'1.5px solid rgba(255,255,255,0.1)' }}
              initial={{ scale:0.88, y:20 }} animate={{ scale:1, y:0 }} exit={{ scale:0.88, y:20 }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background:'rgba(99,102,241,0.15)' }}>
                <BookOpen className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 style={{ color:textClr, fontSize:'18px', fontWeight:800, marginBottom:'8px' }}>Player Tutorial</h3>
              <p style={{ color:subClr, fontSize:'13px', lineHeight:1.6, marginBottom:'24px' }}>
                Would you like a quick overview of the player controls before we begin?
              </p>
              <div className="flex gap-3">
                <button onClick={onSkip}
                  className="flex-1 px-4 py-2.5 rounded-xl border-2 font-semibold text-sm hover:opacity-80"
                  style={{ borderColor:'rgba(255,255,255,0.15)', color:subClr }}>
                  Skip
                </button>
                <button onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-white"
                  style={{ background:'#6366f1' }}>
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
