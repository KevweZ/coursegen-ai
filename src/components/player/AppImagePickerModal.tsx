/**
 * AppImagePickerModal — lets users insert app-built-in images onto a slide.
 * Backgrounds only. On select, calls onInsert(url) which the parent adds as a floating image.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Image as ImageIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

// Encode a public-folder path so spaces become %20 and are served correctly
const enc = (path: string) =>
  path.split('/').map(s => encodeURIComponent(s)).join('/');

const B = enc('/eLearning Template Backgrounds');

interface AppImage {
  id: string;
  label: string;
  url: string;
  category: string;
}

const BACKGROUNDS: AppImage[] = [
  // Office
  { id: 'off-1', label: 'Office Desk',         url: `${B}/${enc('Office Workplace')}/office_desk.png`,                         category: 'Office' },
  { id: 'off-2', label: 'Conference Room',      url: `${B}/${enc('Office Workplace')}/office_conference_room.png`,              category: 'Office' },
  { id: 'off-3', label: 'Open Workspace',       url: `${B}/${enc('Office Workplace')}/office_open_workspace.png`,               category: 'Office' },
  { id: 'off-4', label: 'Break Area',           url: `${B}/${enc('Office Workplace')}/office_break_area.png`,                   category: 'Office' },
  { id: 'off-5', label: 'City View Office',     url: `${B}/${enc('Office Workplace')}/office_workstation_city_view.png`,        category: 'Office' },
  // People
  { id: 'peo-1', label: 'Team at Table',        url: `${B}/${enc('Office Workplace')}/${enc('People at table working.jpg')}`,   category: 'People' },
  { id: 'peo-2', label: 'Smiling Team',         url: `${B}/${enc('Office Workplace')}/${enc('people at table smiling.jpg')}`,   category: 'People' },
  { id: 'peo-3', label: 'Greeting',             url: `${B}/${enc('Office Workplace')}/${enc('three people greeting_01.jpg')}`,  category: 'People' },
  // Neutral
  { id: 'neu-1', label: 'Notepad & Pen',        url: `${B}/Neutral/${enc('Gray background notepad pen.jpg')}`,                 category: 'Neutral' },
  { id: 'neu-2', label: 'Coffee & Books',       url: `${B}/Neutral/${enc('blue background coffee books_01.jpg')}`,              category: 'Neutral' },
  { id: 'neu-3', label: 'Blue Door',            url: `${B}/Neutral/${enc('blue door.jpg')}`,                                    category: 'Neutral' },
  { id: 'neu-4', label: 'Coffee & Phone',       url: `${B}/Neutral/${enc('peach white background with coffee and phone_01.png')}`, category: 'Neutral' },
  { id: 'neu-5', label: 'Coffee & Donuts',      url: `${B}/Neutral/${enc('blue background donute coffee paper_01.jpg')}`,       category: 'Neutral' },
  // City
  { id: 'cty-1', label: 'City Street',          url: `${B}/City/${enc('City ground view_01.png')}`,                             category: 'City' },
  { id: 'cty-2', label: 'Big City',             url: `${B}/City/${enc('Big City_01.png')}`,                                     category: 'City' },
  { id: 'cty-3', label: '3D City',              url: `${B}/City/${enc('3D City_01.jpg')}`,                                      category: 'City' },
  { id: 'cty-4', label: 'Red Signal',           url: `${B}/City/${enc('red signal_01.png')}`,                                   category: 'City' },
  // Classroom
  { id: 'cls-1', label: 'Empty Classroom',      url: `${B}/${enc('Children Classroom')}/classroom_empty_desk.png`,              category: 'Classroom' },
  { id: 'cls-2', label: 'Classroom Center',     url: `${B}/${enc('Children Classroom')}/classroom_center_view.png`,             category: 'Classroom' },
  { id: 'cls-3', label: 'Desk Green Bag',       url: `${B}/${enc('Children Classroom')}/classroom_desk_green_bag.png`,          category: 'Classroom' },
  // Farm
  { id: 'frm-1', label: 'Farm',                 url: `${B}/Farm/Farm_01.png`,                                                   category: 'Farm' },
  { id: 'frm-2', label: 'Farm 2',               url: `${B}/Farm/Farm_02.png`,                                                   category: 'Farm' },
  { id: 'frm-3', label: 'Farm Animals',         url: `${B}/Farm/${enc('Farm animals_02.png')}`,                                 category: 'Farm' },
  // Forest
  { id: 'frs-1', label: 'Forest',               url: `${B}/Forest/Forest_01.png`,                                               category: 'Forest' },
  { id: 'frs-2', label: 'Forest 2',             url: `${B}/Forest/Forest_02.png`,                                               category: 'Forest' },
  // Cargo Ship
  { id: 'crg-1', label: 'Cargo Ship',           url: `${B}/${enc('Cargo Ship')}/cargoship_01.png`,                              category: 'Cargo Ship' },
  { id: 'crg-2', label: 'Cargo Ship 2',         url: `${B}/${enc('Cargo Ship')}/cargoship_02.png`,                              category: 'Cargo Ship' },
  { id: 'crg-3', label: 'Cargo Ship 3',         url: `${B}/${enc('Cargo Ship')}/cargoship_04.jpg`,                              category: 'Cargo Ship' },
  // Snow & Ice
  { id: 'snw-1', label: 'Glacier',              url: `${B}/${enc('Snow and Ice')}/glacier_01.png`,                              category: 'Snow & Ice' },
  { id: 'snw-2', label: 'Snow Trees',           url: `${B}/${enc('Snow and Ice')}/${enc('Snow covered trees_01.png')}`,          category: 'Snow & Ice' },
  { id: 'snw-3', label: 'Frozen Lake',          url: `${B}/${enc('Snow and Ice')}/${enc('frozen lake_01.png')}`,                 category: 'Snow & Ice' },
  { id: 'snw-4', label: 'Icebreaker Ship',      url: `${B}/${enc('Snow and Ice')}/${enc('icebreaker ship_01.png')}`,             category: 'Snow & Ice' },
  { id: 'snw-5', label: 'Arctic Bear',          url: `${B}/${enc('Snow and Ice')}/${enc('arctic polar bear_01.png')}`,           category: 'Snow & Ice' },
  // Warehouse
  { id: 'wh-1',  label: 'Warehouse 1',          url: `${B}/Warehouse/warehouse_01.jpeg`,                                        category: 'Warehouse' },
  { id: 'wh-2',  label: 'Warehouse 2',          url: `${B}/Warehouse/warehouse_02.jpeg`,                                        category: 'Warehouse' },
  { id: 'wh-3',  label: 'Warehouse 3',          url: `${B}/Warehouse/warehouse_03.jpeg`,                                        category: 'Warehouse' },
  // Rigs
  { id: 'rig-1', label: 'Land Rig 1',           url: `${B}/Rigs/${enc('Land rig_01.jpeg')}`,                                    category: 'Rigs' },
  { id: 'rig-2', label: 'Land Rig 2',           url: `${B}/Rigs/${enc('Land rig_02.jpeg')}`,                                    category: 'Rigs' },
  { id: 'rig-3', label: 'Offshore Rig 1',       url: `${B}/Rigs/${enc('offshore rig_01.jpeg')}`,                                category: 'Rigs' },
  { id: 'rig-4', label: 'Offshore Rig 2',       url: `${B}/Rigs/${enc('offshore rig_02.jpeg')}`,                                category: 'Rigs' },
  // Workplace Scenes
  { id: 'ws-1',  label: 'Workplace Scene 1',    url: `${B}/${enc('Custom Scenarios')}/115088300_l.jpg`,                         category: 'Workplace Scenes' },
  { id: 'ws-2',  label: 'Workplace Scene 2',    url: `${B}/${enc('Custom Scenarios')}/118745672_l.jpg`,                         category: 'Workplace Scenes' },
  { id: 'ws-3',  label: 'Workplace Scene 3',    url: `${B}/${enc('Custom Scenarios')}/133169104_l.jpg`,                         category: 'Workplace Scenes' },
  { id: 'ws-4',  label: 'Workplace Scene 4',    url: `${B}/${enc('Custom Scenarios')}/139263622_l.jpg`,                         category: 'Workplace Scenes' },
  { id: 'ws-5',  label: 'Workplace Scene 5',    url: `${B}/${enc('Custom Scenarios')}/139337393_l.jpg`,                         category: 'Workplace Scenes' },
  { id: 'ws-6',  label: 'Workplace Scene 6',    url: `${B}/${enc('Custom Scenarios')}/148700167_l.jpg`,                         category: 'Workplace Scenes' },
  { id: 'ws-7',  label: 'Workplace Scene 7',    url: `${B}/${enc('Custom Scenarios')}/154325570_l.jpg`,                         category: 'Workplace Scenes' },
  { id: 'ws-8',  label: 'Workplace Scene 8',    url: `${B}/${enc('Custom Scenarios')}/158545435_l.jpg`,                         category: 'Workplace Scenes' },
  { id: 'ws-9',  label: 'Workplace Scene 9',    url: `${B}/${enc('Custom Scenarios')}/159781193_l.jpg`,                         category: 'Workplace Scenes' },
  { id: 'ws-10', label: 'Workplace Scene 10',   url: `${B}/${enc('Custom Scenarios')}/160008003_l.jpg`,                         category: 'Workplace Scenes' },
  { id: 'ws-11', label: 'Workplace Scene 11',   url: `${B}/${enc('Custom Scenarios')}/174849752_l.jpg`,                         category: 'Workplace Scenes' },
  { id: 'ws-12', label: 'Workplace Scene 12',   url: `${B}/${enc('Custom Scenarios')}/184063249_l.jpg`,                         category: 'Workplace Scenes' },
  { id: 'ws-13', label: 'Workplace Scene 13',   url: `${B}/${enc('Custom Scenarios')}/190236927_l.jpg`,                         category: 'Workplace Scenes' },
  { id: 'ws-14', label: 'Workplace Scene 14',   url: `${B}/${enc('Custom Scenarios')}/199836032_l.jpg`,                         category: 'Workplace Scenes' },
  { id: 'ws-15', label: 'Workplace Scene 15',   url: `${B}/${enc('Custom Scenarios')}/20109536_l.jpg`,                          category: 'Workplace Scenes' },
  { id: 'ws-16', label: 'Workplace Scene 16',   url: `${B}/${enc('Custom Scenarios')}/211556671_l.jpg`,                         category: 'Workplace Scenes' },
  { id: 'ws-17', label: 'Workplace Scene 17',   url: `${B}/${enc('Custom Scenarios')}/23857765_l.jpg`,                          category: 'Workplace Scenes' },
  { id: 'ws-18', label: 'Workplace Scene 18',   url: `${B}/${enc('Custom Scenarios')}/243803779_l.jpg`,                         category: 'Workplace Scenes' },
  { id: 'ws-19', label: 'Workplace Scene 19',   url: `${B}/${enc('Custom Scenarios')}/246942383_l.jpg`,                         category: 'Workplace Scenes' },
  { id: 'ws-20', label: 'Workplace Scene 20',   url: `${B}/${enc('Custom Scenarios')}/247540229_l.jpg`,                         category: 'Workplace Scenes' },
  { id: 'ws-21', label: 'Workplace Scene 21',   url: `${B}/${enc('Custom Scenarios')}/280442550_l.jpg`,                         category: 'Workplace Scenes' },
];

const BG_CATEGORIES = ['All', ...Array.from(new Set(BACKGROUNDS.map(b => b.category)))];

// ── Fallback SVG shown when an image 404s ─────────────────────────────────────
const FALLBACK_SVG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90">' +
    '<rect fill="#334155" width="160" height="90"/>' +
    '<text fill="#64748b" x="80" y="50" text-anchor="middle" font-size="11" font-family="sans-serif">No preview</text>' +
    '</svg>'
  );

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (url: string) => void;
  theme: 'light' | 'dark' | 'unified';
}

export const AppImagePickerModal: React.FC<Props> = ({ isOpen, onClose, onInsert, theme }) => {
  const [category, setCategory] = useState('All');
  const [search, setSearch]     = useState('');

  const isLight = theme === 'light';
  const modalBg = isLight ? 'bg-white'      : 'bg-slate-900';
  const borderC = isLight ? 'border-slate-200' : 'border-slate-700';
  const subText = isLight ? 'text-slate-500'   : 'text-slate-400';

  const filtered = BACKGROUNDS.filter(b =>
    (category === 'All' || b.category === category) &&
    (!search || b.label.toLowerCase().includes(search.toLowerCase()))
  );

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
              'w-[820px] max-w-[96vw] max-h-[85vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden',
              modalBg, borderC
            )}
          >
            {/* Header */}
            <div className={cn('flex items-center justify-between px-5 py-4 border-b shrink-0', borderC)}>
              <div>
                <h2 className="font-black text-sm tracking-tight text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-400" />
                  Image Library
                </h2>
                <p className={cn('text-xs mt-0.5', subText)}>
                  Select an image to insert on the current slide
                </p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700/30 transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Toolbar: search + category pills */}
            <div className={cn('flex items-center gap-3 px-5 py-3 border-b shrink-0 flex-wrap', borderC)}>
              {/* Search */}
              <div className="relative w-44 shrink-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search..."
                  className={cn(
                    'w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border outline-none focus:ring-1 focus:ring-indigo-500',
                    isLight
                      ? 'bg-white border-slate-200 text-slate-800'
                      : 'bg-slate-800 border-slate-600 text-slate-200'
                  )}
                />
              </div>
              {/* Category pills */}
              <div className="flex gap-1.5 flex-wrap">
                {BG_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[10px] font-bold transition-all',
                      category === cat
                        ? 'bg-indigo-600 text-white'
                        : isLight
                          ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {filtered.map(img => (
                  <button
                    key={img.id}
                    onClick={() => { onInsert(img.url); onClose(); }}
                    className={cn(
                      'group relative flex flex-col gap-0 rounded-xl border-2 overflow-hidden transition-all duration-200',
                      isLight
                        ? 'border-slate-200 hover:border-indigo-400'
                        : 'border-slate-700 hover:border-indigo-500'
                    )}
                    title={img.label}
                  >
                    {/* Thumbnail */}
                    <div className="w-full aspect-video overflow-hidden bg-slate-800">
                      <img
                        src={img.url}
                        alt={img.label}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => {
                          const el = e.target as HTMLImageElement;
                          if (el.src !== FALLBACK_SVG) el.src = FALLBACK_SVG;
                        }}
                      />
                    </div>
                    {/* Label */}
                    <span className={cn('text-[9px] font-semibold px-1.5 py-1 truncate w-full text-left', subText)}>
                      {img.label}
                    </span>
                    {/* Hover tint */}
                    <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-colors pointer-events-none" />
                  </button>
                ))}

                {filtered.length === 0 && (
                  <div className={cn('col-span-5 py-14 text-center text-sm', subText)}>
                    No images match your search.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className={cn('px-5 py-3 border-t text-xs shrink-0', subText, borderC)}>
              {filtered.length} image{filtered.length !== 1 ? 's' : ''} · Click to insert onto the current slide
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
