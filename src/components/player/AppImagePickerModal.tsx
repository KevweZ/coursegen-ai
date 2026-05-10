/**
 * AppImagePickerModal — lets users insert app-built-in images onto a slide.
 * Includes: curated background photos (by category) + silhouette characters.
 * On select, calls onInsert(url) which the parent adds as a floating image.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Image as ImageIcon, Users } from 'lucide-react';
import { cn } from '../../lib/utils';

// ── Background image library ──────────────────────────────────────────────────
const BASE = '/eLearning Template Backgrounds';

interface AppImage {
  id: string;
  label: string;
  url: string;
  category: string;
}

const BACKGROUNDS: AppImage[] = [
  // Office
  { id: 'off-1', label: 'Office Desk',         url: `${BASE}/Office Workplace/office_desk.png`,                    category: 'Office' },
  { id: 'off-2', label: 'Conference Room',      url: `${BASE}/Office Workplace/office_conference_room.png`,         category: 'Office' },
  { id: 'off-3', label: 'Open Workspace',       url: `${BASE}/Office Workplace/office_open_workspace.png`,          category: 'Office' },
  { id: 'off-4', label: 'Break Area',           url: `${BASE}/Office Workplace/office_break_area.png`,              category: 'Office' },
  { id: 'off-5', label: 'City View Office',     url: `${BASE}/Office Workplace/office_workstation_city_view.png`,   category: 'Office' },
  // Neutral
  { id: 'neu-1', label: 'Notepad & Pen',        url: `${BASE}/Neutral/Gray background notepad pen.jpg`,             category: 'Neutral' },
  { id: 'neu-2', label: 'Coffee & Books',       url: `${BASE}/Neutral/blue background coffee books_01.jpg`,         category: 'Neutral' },
  { id: 'neu-3', label: 'Blue Door',            url: `${BASE}/Neutral/blue door.jpg`,                               category: 'Neutral' },
  { id: 'neu-4', label: 'Coffee & Phone',       url: `${BASE}/Neutral/peach white background with coffee and phone_01.png`, category: 'Neutral' },
  { id: 'neu-5', label: 'Coffee & Donuts',      url: `${BASE}/Neutral/blue background donute coffee paper_01.jpg`,  category: 'Neutral' },
  // People
  { id: 'peo-1', label: 'Team at Table',        url: `${BASE}/Office Workplace/People at table working.jpg`,        category: 'People' },
  { id: 'peo-2', label: 'Smiling Team',         url: `${BASE}/Office Workplace/people at table smiling.jpg`,        category: 'People' },
  { id: 'peo-3', label: 'Greeting',             url: `${BASE}/Office Workplace/three people greeting_01.jpg`,       category: 'People' },
  // City
  { id: 'cty-1', label: 'City Street',          url: `${BASE}/City/City ground view_01.png`,                        category: 'City' },
  { id: 'cty-2', label: 'Big City',             url: `${BASE}/City/Big City_01.png`,                                category: 'City' },
  { id: 'cty-3', label: '3D City',              url: `${BASE}/City/3D City_01.jpg`,                                 category: 'City' },
  { id: 'cty-4', label: 'Red Signal',           url: `${BASE}/City/red signal_01.png`,                              category: 'City' },
  // Classroom
  { id: 'cls-1', label: 'Empty Classroom',      url: `${BASE}/Children Classroom/classroom_empty_desk.png`,         category: 'Classroom' },
  { id: 'cls-2', label: 'Classroom Center',     url: `${BASE}/Children Classroom/classroom_center_view.png`,        category: 'Classroom' },
  { id: 'cls-3', label: 'Desk Green Bag',       url: `${BASE}/Children Classroom/classroom_desk_green_bag.png`,     category: 'Classroom' },
  // Farm
  { id: 'frm-1', label: 'Farm',                 url: `${BASE}/Farm/Farm_01.png`,                                    category: 'Farm' },
  { id: 'frm-2', label: 'Farm 2',               url: `${BASE}/Farm/Farm_02.png`,                                    category: 'Farm' },
  { id: 'frm-3', label: 'Farm Animals',         url: `${BASE}/Farm/Farm animals_02.png`,                            category: 'Farm' },
  // Forest
  { id: 'frs-1', label: 'Forest',               url: `${BASE}/Forest/Forest_01.png`,                                category: 'Forest' },
  { id: 'frs-2', label: 'Forest 2',             url: `${BASE}/Forest/Forest_02.png`,                                category: 'Forest' },
  // Cargo Ship
  { id: 'crg-1', label: 'Cargo Ship',           url: `${BASE}/Cargo Ship/cargoship_01.png`,                         category: 'Cargo Ship' },
  { id: 'crg-2', label: 'Cargo Ship 2',         url: `${BASE}/Cargo Ship/cargoship_02.png`,                         category: 'Cargo Ship' },
  { id: 'crg-3', label: 'Cargo Ship 3',         url: `${BASE}/Cargo Ship/cargoship_04.jpg`,                         category: 'Cargo Ship' },
  // Snow & Ice
  { id: 'snw-1', label: 'Glacier',              url: `${BASE}/Snow and Ice/glacier_01.png`,                         category: 'Snow & Ice' },
  { id: 'snw-2', label: 'Snow Trees',           url: `${BASE}/Snow and Ice/Snow covered trees_01.png`,              category: 'Snow & Ice' },
  { id: 'snw-3', label: 'Frozen Lake',          url: `${BASE}/Snow and Ice/frozen lake_01.png`,                     category: 'Snow & Ice' },
  { id: 'snw-4', label: 'Icebreaker Ship',      url: `${BASE}/Snow and Ice/icebreaker ship_01.png`,                 category: 'Snow & Ice' },
  { id: 'snw-5', label: 'Arctic Bear',          url: `${BASE}/Snow and Ice/arctic polar bear_01.png`,               category: 'Snow & Ice' },
  // Warehouse
  { id: 'wh-1',  label: 'Warehouse 1',          url: `${BASE}/Warehouse/warehouse_01.jpeg`,                         category: 'Warehouse' },
  { id: 'wh-2',  label: 'Warehouse 2',          url: `${BASE}/Warehouse/warehouse_02.jpeg`,                         category: 'Warehouse' },
  { id: 'wh-3',  label: 'Warehouse 3',          url: `${BASE}/Warehouse/warehouse_03.jpeg`,                         category: 'Warehouse' },
  // Rigs
  { id: 'rig-1', label: 'Land Rig 1',           url: `${BASE}/Rigs/Land rig_01.jpeg`,                               category: 'Rigs' },
  { id: 'rig-2', label: 'Land Rig 2',           url: `${BASE}/Rigs/Land rig_02.jpeg`,                               category: 'Rigs' },
  { id: 'rig-3', label: 'Offshore Rig 1',       url: `${BASE}/Rigs/offshore rig_01.jpeg`,                           category: 'Rigs' },
  { id: 'rig-4', label: 'Offshore Rig 2',       url: `${BASE}/Rigs/offshore rig_02.jpeg`,                           category: 'Rigs' },
  // Workplace Scenes (photography)
  { id: 'ws-1',  label: 'Workplace Scene 1',    url: `${BASE}/Custom Scenarios/115088300_l.jpg`,                    category: 'Workplace Scenes' },
  { id: 'ws-2',  label: 'Workplace Scene 2',    url: `${BASE}/Custom Scenarios/118745672_l.jpg`,                    category: 'Workplace Scenes' },
  { id: 'ws-3',  label: 'Workplace Scene 3',    url: `${BASE}/Custom Scenarios/133169104_l.jpg`,                    category: 'Workplace Scenes' },
  { id: 'ws-4',  label: 'Workplace Scene 4',    url: `${BASE}/Custom Scenarios/139263622_l.jpg`,                    category: 'Workplace Scenes' },
  { id: 'ws-5',  label: 'Workplace Scene 5',    url: `${BASE}/Custom Scenarios/139337393_l.jpg`,                    category: 'Workplace Scenes' },
  { id: 'ws-6',  label: 'Workplace Scene 6',    url: `${BASE}/Custom Scenarios/148700167_l.jpg`,                    category: 'Workplace Scenes' },
  { id: 'ws-7',  label: 'Workplace Scene 7',    url: `${BASE}/Custom Scenarios/154325570_l.jpg`,                    category: 'Workplace Scenes' },
  { id: 'ws-8',  label: 'Workplace Scene 8',    url: `${BASE}/Custom Scenarios/158545435_l.jpg`,                    category: 'Workplace Scenes' },
  { id: 'ws-9',  label: 'Workplace Scene 9',    url: `${BASE}/Custom Scenarios/159781193_l.jpg`,                    category: 'Workplace Scenes' },
  { id: 'ws-10', label: 'Workplace Scene 10',   url: `${BASE}/Custom Scenarios/160008003_l.jpg`,                    category: 'Workplace Scenes' },
  { id: 'ws-11', label: 'Workplace Scene 11',   url: `${BASE}/Custom Scenarios/174849752_l.jpg`,                    category: 'Workplace Scenes' },
  { id: 'ws-12', label: 'Workplace Scene 12',   url: `${BASE}/Custom Scenarios/184063249_l.jpg`,                    category: 'Workplace Scenes' },
  { id: 'ws-13', label: 'Workplace Scene 13',   url: `${BASE}/Custom Scenarios/190236927_l.jpg`,                    category: 'Workplace Scenes' },
  { id: 'ws-14', label: 'Workplace Scene 14',   url: `${BASE}/Custom Scenarios/199836032_l.jpg`,                    category: 'Workplace Scenes' },
  { id: 'ws-15', label: 'Workplace Scene 15',   url: `${BASE}/Custom Scenarios/20109536_l.jpg`,                     category: 'Workplace Scenes' },
  { id: 'ws-16', label: 'Workplace Scene 16',   url: `${BASE}/Custom Scenarios/211556671_l.jpg`,                    category: 'Workplace Scenes' },
  { id: 'ws-17', label: 'Workplace Scene 17',   url: `${BASE}/Custom Scenarios/23857765_l.jpg`,                     category: 'Workplace Scenes' },
  { id: 'ws-18', label: 'Workplace Scene 18',   url: `${BASE}/Custom Scenarios/243803779_l.jpg`,                    category: 'Workplace Scenes' },
  { id: 'ws-19', label: 'Workplace Scene 19',   url: `${BASE}/Custom Scenarios/246942383_l.jpg`,                    category: 'Workplace Scenes' },
  { id: 'ws-20', label: 'Workplace Scene 20',   url: `${BASE}/Custom Scenarios/247540229_l.jpg`,                    category: 'Workplace Scenes' },
  { id: 'ws-21', label: 'Workplace Scene 21',   url: `${BASE}/Custom Scenarios/280442550_l.jpg`,                    category: 'Workplace Scenes' },
];

// ── Silhouette library — PNGs from /public/silhouettes/ ──────────────────────
// White backgrounds are removed via mix-blend-mode: multiply at display time.
interface SilhouetteEntry {
  id: string;
  label: string;
  file: string;
  category: string;
}

const SILHOUETTES: SilhouetteEntry[] = [
  // Casual / Everyday
  { id: 'casual-male',             label: 'Casual Male',           file: 'casual-male.png',             category: 'Casual' },
  { id: 'casual-female',           label: 'Casual Female',         file: 'casual-female.png',           category: 'Casual' },
  { id: 'casual-male-afro',        label: 'Casual Male (Afro)',    file: 'casual-male-afro.png',        category: 'Casual' },
  { id: 'casual-female-afro',      label: 'Casual Female (Afro)',  file: 'casual-female-afro.png',      category: 'Casual' },
  // Busts
  { id: 'bust-male',               label: 'Bust — Male',           file: 'bust-male.png',               category: 'Busts' },
  { id: 'bust-female-long',        label: 'Bust — Long Hair',      file: 'bust-female-long.png',        category: 'Busts' },
  { id: 'bust-female-bob',         label: 'Bust — Bob',            file: 'bust-female-bob.png',         category: 'Busts' },
  { id: 'bust-female-afro',        label: 'Bust — Afro',           file: 'bust-female-afro.png',        category: 'Busts' },
  // Business
  { id: 'business-male',           label: 'Business Male',         file: 'business-male.png',           category: 'Business' },
  { id: 'business-female',         label: 'Business Female',       file: 'business-female.png',         category: 'Business' },
  { id: 'safety-vest-male',        label: 'Safety Vest',           file: 'safety-vest-male.png',        category: 'Business' },
  { id: 'safety-vest-hardhat',     label: 'Safety Vest + Hardhat', file: 'safety-vest-hardhat.png',     category: 'Business' },
  // Medical
  { id: 'doctor-male',             label: 'Doctor Male',           file: 'doctor-male.png',             category: 'Medical' },
  { id: 'doctor-female',           label: 'Doctor Female',         file: 'doctor-female.png',           category: 'Medical' },
  { id: 'doctor-male-coat',        label: 'Doctor (White Coat)',   file: 'doctor-male-coat.png',        category: 'Medical' },
  { id: 'nurse-male',              label: 'Nurse',                 file: 'nurse-male.png',              category: 'Medical' },
  // Emergency
  { id: 'police-male',             label: 'Police Male',           file: 'police-male.png',             category: 'Emergency' },
  { id: 'police-female',           label: 'Police Female',         file: 'police-female.png',           category: 'Emergency' },
  { id: 'firefighter-male',        label: 'Firefighter Male',      file: 'firefighter-male.png',        category: 'Emergency' },
  { id: 'firefighter-female',      label: 'Firefighter Female',    file: 'firefighter-female.png',      category: 'Emergency' },
  { id: 'firefighter-male-emt',    label: 'Firefighter EMT',       file: 'firefighter-male-emt.png',    category: 'Emergency' },
  { id: 'emt-female',              label: 'EMT Female',            file: 'emt-female.png',              category: 'Emergency' },
  // Trades / Outdoor
  { id: 'construction-male',       label: 'Construction',          file: 'construction-male.png',       category: 'Outdoor' },
  { id: 'farmer-male',             label: 'Farmer Male',           file: 'farmer-male.png',             category: 'Outdoor' },
  { id: 'farmer-female',           label: 'Farmer Female',         file: 'farmer-female.png',           category: 'Outdoor' },
  { id: 'ranger-male',             label: 'Ranger',                file: 'ranger-male.png',             category: 'Outdoor' },
  // Aviation
  { id: 'pilot-male',              label: 'Pilot',                 file: 'pilot-male.png',              category: 'Aviation' },
  { id: 'pilot-male-2',            label: 'Pilot (Arms Folded)',   file: 'pilot-male-2.png',            category: 'Aviation' },
  { id: 'flight-attendant-female', label: 'Flight Attendant',      file: 'flight-attendant-female.png', category: 'Aviation' },
];

const SIL_CATEGORIES = ['All', ...Array.from(new Set(SILHOUETTES.map(s => s.category)))];
const BG_CATEGORIES  = ['All', ...Array.from(new Set(BACKGROUNDS.map(b => b.category)))];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (url: string) => void;
  theme: 'light' | 'dark' | 'unified';
}

// PNG thumbnail — always white bg container so multiply blend removes white correctly
const SilhouetteThumbnail: React.FC<{
  entry: SilhouetteEntry;
  onInsert: (url: string) => void;
  isLight: boolean;
}> = ({ entry, onInsert, isLight }) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const url = `/silhouettes/${entry.file}`;

  return (
    <button
      onClick={() => onInsert(url)}
      className={cn(
        'group relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all duration-200 overflow-hidden',
        isLight
          ? 'border-slate-200 bg-slate-100 hover:border-indigo-400 hover:bg-indigo-50'
          : 'border-slate-700/60 bg-slate-800/40 hover:border-indigo-500 hover:bg-slate-700/40'
      )}
      title={`Insert ${entry.label}`}
    >
      {/* Always white bg so mix-blend-mode:multiply removes white correctly on any theme */}
      <div
        className="w-full h-28 flex items-center justify-center overflow-hidden rounded-lg"
        style={{ background: '#ffffff' }}
      >
        {errored ? (
          <div className="flex flex-col items-center gap-1 opacity-30">
            <Users className="w-8 h-8 text-slate-400" />
            <span className="text-[9px] text-slate-400">Missing file</span>
          </div>
        ) : (
          <img
            src={url}
            alt={entry.label}
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            style={{
              maxHeight: '108px',
              maxWidth: '100%',
              objectFit: 'contain',
              mixBlendMode: 'multiply',
              opacity: loaded ? 1 : 0,
              transition: 'opacity 0.2s',
            }}
          />
        )}
      </div>
      <span className={cn('text-[9px] font-semibold truncate w-full text-center', isLight ? 'text-slate-600' : 'text-slate-400')}>
        {entry.label}
      </span>
    </button>
  );
};

export const AppImagePickerModal: React.FC<Props> = ({ isOpen, onClose, onInsert, theme }) => {
  const [tab, setTab] = useState<'backgrounds' | 'silhouettes'>('backgrounds');
  const [category, setCategory] = useState('All');
  const [silCategory, setSilCategory] = useState('All');
  const [search, setSearch] = useState('');

  const isLight = theme === 'light';
  const modalBg = isLight ? 'bg-white' : 'bg-slate-900';
  const borderC  = isLight ? 'border-slate-200' : 'border-slate-700';
  const subText  = isLight ? 'text-slate-500' : 'text-slate-400';

  const filteredBgs = BACKGROUNDS.filter(b =>
    (category === 'All' || b.category === category) &&
    (!search || b.label.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredSils = SILHOUETTES.filter(s =>
    (silCategory === 'All' || s.category === silCategory) &&
    (!search || s.label.toLowerCase().includes(search.toLowerCase()))
  );

  const handleInsertBg = (url: string) => { onInsert(url); onClose(); };
  const handleInsertSil = (url: string) => { onInsert(url); onClose(); };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[450]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className={cn(
              'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[451]',
              'w-[780px] max-w-[96vw] max-h-[85vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden',
              modalBg, borderC
            )}
          >
            {/* Header */}
            <div className={cn('flex items-center justify-between px-5 py-4 border-b shrink-0', borderC)}>
              <div>
                <h2 className="font-black text-sm tracking-tight">App Image Library</h2>
                <p className={cn('text-xs mt-0.5', subText)}>Select an image to insert on the current slide</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700/30 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab bar + Search */}
            <div className={cn('flex items-center gap-3 px-5 py-3 border-b shrink-0', borderC)}>
              <div className="flex gap-1 rounded-lg p-1" style={{ background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)' }}>
                {(['backgrounds', 'silhouettes'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all',
                      tab === t
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                    )}
                  >
                    {t === 'backgrounds' ? <ImageIcon className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                    {t === 'backgrounds' ? 'Backgrounds' : 'Characters'}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative flex-1 max-w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search..."
                  className={cn(
                    'w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border outline-none focus:ring-1 focus:ring-indigo-500',
                    isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-600 text-slate-200'
                  )}
                />
              </div>

              {/* Category filter — per tab */}
              {tab === 'backgrounds' && (
                <div className="flex gap-1 flex-wrap">
                  {BG_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[10px] font-bold transition-all',
                        category === cat
                          ? 'bg-indigo-600 text-white'
                          : isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
              {tab === 'silhouettes' && (
                <div className="flex gap-1 flex-wrap">
                  {SIL_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSilCategory(cat)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[10px] font-bold transition-all',
                        silCategory === cat
                          ? 'bg-indigo-600 text-white'
                          : isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-5">
              {tab === 'backgrounds' ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {filteredBgs.map(img => (
                    <button
                      key={img.id}
                      onClick={() => handleInsertBg(img.url)}
                      className={cn(
                        'group relative flex flex-col gap-1.5 rounded-xl border-2 overflow-hidden transition-all duration-200',
                        isLight ? 'border-slate-200 hover:border-indigo-400' : 'border-slate-700 hover:border-indigo-500'
                      )}
                      title={img.label}
                    >
                      <div className="w-full aspect-video overflow-hidden">
                        <img
                          src={img.url}
                          alt={img.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect fill="%23334155" width="100" height="60"/><text fill="%2394a3b8" x="50" y="35" text-anchor="middle" font-size="10">No preview</text></svg>'; }}
                        />
                      </div>
                      <span className={cn('text-[9px] font-semibold px-1.5 pb-1.5 truncate text-left', subText)}>
                        {img.label}
                      </span>
                      <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-colors pointer-events-none" />
                    </button>
                  ))}
                  {filteredBgs.length === 0 && (
                    <div className={cn('col-span-5 py-12 text-center text-sm', subText)}>
                      No images match your search.
                    </div>
                  )}
                </div>
              ) : (
                filteredSils.length === 0 && !search ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Users className="w-12 h-12 text-slate-600" />
                    <p className="text-sm font-bold text-slate-400">No character assets installed</p>
                    <p className="text-xs text-slate-500 text-center max-w-xs">
                      Add PNG silhouette files to <code className="bg-slate-800 px-1 rounded text-indigo-400">/public/silhouettes/</code> to enable this library.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                    {filteredSils.map(sil => (
                      <SilhouetteThumbnail
                        key={sil.id}
                        entry={sil}
                        onInsert={handleInsertSil}
                        isLight={isLight}
                      />
                    ))}
                    {filteredSils.length === 0 && (
                      <div className={cn('col-span-5 py-12 text-center text-sm', subText)}>No characters match your search.</div>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Footer */}
            <div className={cn('px-5 py-3 border-t text-xs shrink-0', subText, borderC)}>
              {tab === 'backgrounds'
                ? `${filteredBgs.length} images · Click to insert as floating image on current slide`
                : `${filteredSils.length} characters · Click to insert as PNG onto current slide`}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
