/**
 * AppImagePickerModal — lets users insert app-built-in images onto a slide.
 * Includes: curated background photos (by category) + silhouette characters.
 * On select, calls onInsert(url) which the parent adds as a floating image.
 */
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Image as ImageIcon, Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import { SilhouetteCharacter } from '../interactions/silhouettes';
import type { SilhouetteId } from '../interactions/silhouettes';

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
  { id: 'peo-1', label: 'Team at Table',        url: `${BASE}/Neutral/People at table working.jpg`,                 category: 'People' },
  { id: 'peo-2', label: 'Smiling Team',         url: `${BASE}/Neutral/people at table smiling.jpg`,                 category: 'People' },
  { id: 'peo-3', label: 'Greeting',             url: `${BASE}/Neutral/three people greeting_01.jpg`,                category: 'People' },
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
];

// ── Silhouette library ────────────────────────────────────────────────────────
interface SilhouetteEntry {
  id: SilhouetteId;
  label: string;
  color: string;
}

const SILHOUETTES: SilhouetteEntry[] = [
  { id: 'casual-male',             label: 'Casual Male',          color: '#334155' },
  { id: 'casual-female',           label: 'Casual Female',        color: '#334155' },
  { id: 'casual-male-afro',        label: 'Casual Male (Afro)',   color: '#1e293b' },
  { id: 'casual-female-afro',      label: 'Casual Female (Afro)', color: '#1e293b' },
  { id: 'business-male',           label: 'Business Male',        color: '#1e3a5f' },
  { id: 'business-female',         label: 'Business Female',      color: '#1e3a5f' },
  { id: 'doctor-male',             label: 'Doctor Male',          color: '#164e63' },
  { id: 'doctor-female',           label: 'Doctor Female',        color: '#164e63' },
  { id: 'nurse-male',              label: 'Nurse',                color: '#134e4a' },
  { id: 'police-male',             label: 'Police Male',          color: '#1e3a5f' },
  { id: 'police-female',           label: 'Police Female',        color: '#1e3a5f' },
  { id: 'firefighter-male',        label: 'Firefighter Male',     color: '#7c2d12' },
  { id: 'firefighter-female',      label: 'Firefighter Female',   color: '#7c2d12' },
  { id: 'construction-male',       label: 'Construction',         color: '#78350f' },
  { id: 'pilot-male',              label: 'Pilot',                color: '#1e3a5f' },
  { id: 'flight-attendant-female', label: 'Flight Attendant',     color: '#4c1d95' },
  { id: 'farmer-male',             label: 'Farmer',               color: '#14532d' },
  { id: 'ranger-male',             label: 'Ranger',               color: '#14532d' },
];

const BG_CATEGORIES = ['All', ...Array.from(new Set(BACKGROUNDS.map(b => b.category)))];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (url: string) => void;
  theme: 'light' | 'dark' | 'unified';
}

// Convert a rendered SVG DOM element to a blob URL
function svgElementToUrl(svgEl: SVGSVGElement | null): string | null {
  if (!svgEl) return null;
  // Ensure the SVG has an xmlns attribute for use as an image
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const blob = new Blob([clone.outerHTML], { type: 'image/svg+xml' });
  return URL.createObjectURL(blob);
}

// Thumbnail for each silhouette — holds a ref to its <svg>
const SilhouetteThumbnail: React.FC<{
  entry: SilhouetteEntry;
  onInsert: (url: string) => void;
  isLight: boolean;
}> = ({ entry, onInsert, isLight }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    const svgEl = containerRef.current?.querySelector('svg') as SVGSVGElement | null;
    const url = svgElementToUrl(svgEl);
    if (url) onInsert(url);
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'relative flex flex-col items-center gap-2 p-2 rounded-xl border-2 transition-all duration-200 overflow-hidden',
        hovered
          ? 'border-indigo-500 bg-indigo-900/20 scale-[1.03]'
          : isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-700/60 bg-slate-800/40'
      )}
      title={`Insert ${entry.label}`}
    >
      <div
        ref={containerRef}
        className="w-full h-28 flex items-end justify-center overflow-hidden"
        style={{ background: isLight ? '#e2e8f0' : '#1e293b' }}
      >
        <div style={{ height: '112px', display: 'flex', alignItems: 'flex-end' }}>
          <SilhouetteCharacter
            id={entry.id}
            color={hovered ? '#6366f1' : entry.color}
          />
        </div>
      </div>
      <span className={cn('text-[10px] font-semibold truncate w-full text-center', isLight ? 'text-slate-600' : 'text-slate-400')}>
        {entry.label}
      </span>
    </button>
  );
};

export const AppImagePickerModal: React.FC<Props> = ({ isOpen, onClose, onInsert, theme }) => {
  const [tab, setTab] = useState<'backgrounds' | 'silhouettes'>('backgrounds');
  const [category, setCategory] = useState('All');
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
    !search || s.label.toLowerCase().includes(search.toLowerCase())
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

              {/* Category filter — backgrounds only */}
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
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {filteredSils.map(sil => (
                    <SilhouetteThumbnail
                      key={sil.id}
                      entry={sil}
                      onInsert={handleInsertSil}
                      isLight={isLight}
                    />
                  ))}
                </div>
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
