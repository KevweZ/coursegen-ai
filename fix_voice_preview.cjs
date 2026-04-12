/**
 * fix_voice_preview.cjs
 * Adds ear icon preview buttons to both voice selector locations in App.tsx:
 * 1. Settings page voice grid — ear icon on each card, previews that voice
 * 2. Audio editor dropdown — ear icon button next to dropdown, previews selected voice
 *
 * Shared mechanism:
 * - voicePreviewCache ref (Map<voiceId, blobUrl>) — avoids repeat API calls
 * - previewingVoice state string | null — drives loading indicator on correct button
 * - previewVoice(id) async function — generates 1-sentence TTS, caches, plays
 */
const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// ── 1. Add Ear to lucide imports ─────────────────────────────────────────────
app = app.replace(
  `  ChevronDown\n} from 'lucide-react';`,
  `  ChevronDown,\n  Ear\n} from 'lucide-react';`
);

// ── 2. Add state + cache ref + previewVoice function after regenSlideId state ─
app = app.replace(
  `  // Per-slide TTS regeneration state\n  const [regenSlideId, setRegenSlideId] = useState<string | null>(null);`,
  `  // Per-slide TTS regeneration state
  const [regenSlideId, setRegenSlideId] = useState<string | null>(null);
  // Voice preview state
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const voicePreviewCache = useRef<Map<string, string>>(new Map());
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const previewVoice = async (voiceId: string) => {
    if (previewingVoice) return; // already loading one
    // Stop any currently playing preview
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    // Use cache if available
    if (voicePreviewCache.current.has(voiceId)) {
      const audio = new Audio(voicePreviewCache.current.get(voiceId)!);
      previewAudioRef.current = audio;
      audio.play().catch(() => {});
      return;
    }
    setPreviewingVoice(voiceId);
    try {
      const { generateSlideTTS } = await import('./services/ttsService');
      const sampleText = \`Hello! I'm \${voiceId.charAt(0).toUpperCase() + voiceId.slice(1)}, and I'll be your narrator for this course.\`;
      const blobUrl = await generateSlideTTS(sampleText, { voice: voiceId as any });
      voicePreviewCache.current.set(voiceId, blobUrl);
      const audio = new Audio(blobUrl);
      previewAudioRef.current = audio;
      audio.play().catch(() => {});
    } catch (err: any) {
      console.warn('[Voice Preview]', err.message);
    } finally {
      setPreviewingVoice(null);
    }
  };`
);

// ── 3. Update voice grid cards to include ear preview button ─────────────────
app = app.replace(
  `                               {([
                                 { id: 'alloy',   label: 'Alloy',   sub: 'Neutral · Balanced' },
                                 { id: 'echo',    label: 'Echo',    sub: 'Male · Measured' },
                                 { id: 'fable',   label: 'Fable',   sub: 'Male · Warm' },
                                 { id: 'onyx',    label: 'Onyx',    sub: 'Male · Deep' },
                                 { id: 'nova',    label: 'Nova',    sub: 'Female · Bright' },
                                 { id: 'shimmer', label: 'Shimmer', sub: 'Female · Soft' },
                               ] as const).map(v => (
                                 <button
                                   key={v.id}
                                   onClick={() => setTtsVoice(v.id)}
                                   className={cn(
                                     'flex flex-col items-start px-3 py-2.5 rounded-xl border text-left transition-all',
                                     ttsVoice === v.id
                                       ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                                       : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                                   )}
                                 >
                                   <span className="text-xs font-bold">{v.label}</span>
                                   <span className="text-[10px] opacity-70 mt-0.5">{v.sub}</span>
                                 </button>
                               ))}`,
  `                               {([
                                 { id: 'alloy',   label: 'Alloy',   sub: 'Neutral · Balanced' },
                                 { id: 'echo',    label: 'Echo',    sub: 'Male · Measured' },
                                 { id: 'fable',   label: 'Fable',   sub: 'Male · Warm' },
                                 { id: 'onyx',    label: 'Onyx',    sub: 'Male · Deep' },
                                 { id: 'nova',    label: 'Nova',    sub: 'Female · Bright' },
                                 { id: 'shimmer', label: 'Shimmer', sub: 'Female · Soft' },
                               ] as const).map(v => (
                                 <div key={v.id} className="relative group/card">
                                   <button
                                     onClick={() => setTtsVoice(v.id)}
                                     className={cn(
                                       'w-full flex flex-col items-start px-3 py-2.5 rounded-xl border text-left transition-all',
                                       ttsVoice === v.id
                                         ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                                         : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                                     )}
                                   >
                                     <span className="text-xs font-bold pr-5">{v.label}</span>
                                     <span className="text-[10px] opacity-70 mt-0.5">{v.sub}</span>
                                   </button>
                                   {/* Ear preview button */}
                                   <button
                                     onClick={e => { e.stopPropagation(); previewVoice(v.id); }}
                                     disabled={!!previewingVoice}
                                     title={\`Preview \${v.label} voice\`}
                                     className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md flex items-center justify-center bg-slate-800/80 hover:bg-emerald-700/60 text-slate-400 hover:text-emerald-300 transition-all opacity-0 group-hover/card:opacity-100 disabled:cursor-wait"
                                   >
                                     {previewingVoice === v.id
                                       ? <Loader2 className="w-3 h-3 animate-spin" />
                                       : <Ear className="w-3 h-3" />
                                     }
                                   </button>
                                 </div>
                               ))}`
);

// ── 4. Add ear button next to the audio editor dropdown ──────────────────────
app = app.replace(
  `                             <div className="flex items-center gap-3">
                               <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest shrink-0">Voice</label>
                               <select
                                 value={ttsVoice}
                                 onChange={e => setTtsVoice(e.target.value)}
                                 className="flex-1 bg-slate-950 border border-emerald-700/40 rounded-lg px-3 py-1.5 text-emerald-200 text-xs font-bold outline-none focus:border-emerald-500 transition-all"
                               >
                                 <option value="alloy">Alloy — Neutral / Balanced</option>
                                 <option value="echo">Echo — Male / Measured</option>
                                 <option value="fable">Fable — Male / Warm</option>
                                 <option value="onyx">Onyx — Male / Deep</option>
                                 <option value="nova">Nova — Female / Bright</option>
                                 <option value="shimmer">Shimmer — Female / Soft</option>
                               </select>
                             </div>`,
  `                             <div className="flex items-center gap-2">
                               <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest shrink-0">Voice</label>
                               <select
                                 value={ttsVoice}
                                 onChange={e => setTtsVoice(e.target.value)}
                                 className="flex-1 bg-slate-950 border border-emerald-700/40 rounded-lg px-3 py-1.5 text-emerald-200 text-xs font-bold outline-none focus:border-emerald-500 transition-all"
                               >
                                 <option value="alloy">Alloy — Neutral / Balanced</option>
                                 <option value="echo">Echo — Male / Measured</option>
                                 <option value="fable">Fable — Male / Warm</option>
                                 <option value="onyx">Onyx — Male / Deep</option>
                                 <option value="nova">Nova — Female / Bright</option>
                                 <option value="shimmer">Shimmer — Female / Soft</option>
                               </select>
                               {/* Ear preview for selected voice */}
                               <button
                                 onClick={() => previewVoice(ttsVoice)}
                                 disabled={!!previewingVoice}
                                 title={\`Preview \${ttsVoice} voice\`}
                                 className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-slate-800 hover:bg-emerald-700/40 border border-slate-700 hover:border-emerald-600 text-slate-400 hover:text-emerald-300 transition-all disabled:cursor-wait"
                               >
                                 {previewingVoice === ttsVoice
                                   ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                   : <Ear className="w-3.5 h-3.5" />
                                 }
                               </button>
                             </div>`
);

fs.writeFileSync('src/App.tsx', app, 'utf8');
console.log('✅ Voice preview ear buttons applied');

// Verify
const checks = ['Ear', 'previewVoice', 'previewingVoice', 'voicePreviewCache', 'group-hover/card'];
const out = fs.readFileSync('src/App.tsx','utf8');
checks.forEach(c => console.log(c, out.includes(c) ? '✓' : '✗ MISSING'));
