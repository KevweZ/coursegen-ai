const fs = require("fs");
let content = fs.readFileSync("src/App.tsx", "utf-8");

const results = [];

// ====================================================================
// FIX 1: Add PlayerPropertiesModal import right after OutlinePreview import
// ====================================================================
const old_import = `import { OutlinePreview } from './components/builder/OutlinePreview';`;
const new_import = `import { OutlinePreview } from './components/builder/OutlinePreview';
import { PlayerPropertiesModal, PlayerConfig, defaultPlayerConfig } from './components/builder/PlayerPropertiesModal';`;
if (content.includes(old_import)) {
  content = content.replace(old_import, new_import);
  results.push('✅ PlayerPropertiesModal imported');
} else {
  results.push('⚠️ OutlinePreview import not found');
}

// ====================================================================
// FIX 2: Add showPlayerProperties + playerConfig states after previewModalOption
// ====================================================================
const old_state = `  // Interaction Previews
  const [previewModalOption, setPreviewModalOption] = useState<string | null>(null);`;
const new_state = `  // Interaction Previews
  const [previewModalOption, setPreviewModalOption] = useState<string | null>(null);
  
  // Player Properties
  const [showPlayerProperties, setShowPlayerProperties] = useState(false);
  const [playerConfig, setPlayerConfig] = useState<PlayerConfig>(defaultPlayerConfig);
  
  // Edit Drawer
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editDrawerTab, setEditDrawerTab] = useState<'text'|'audio'>('text');`;
if (content.includes(old_state)) {
  content = content.replace(old_state, new_state);
  results.push('✅ showPlayerProperties + playerConfig + editDrawerOpen states added');
} else {
  results.push('⚠️ previewModalOption state not found — trying alternate match');
  if (content.includes('const [previewModalOption')) {
    content = content.replace(
      '  const [previewModalOption, setPreviewModalOption] = useState<string | null>(null);',
      `  const [previewModalOption, setPreviewModalOption] = useState<string | null>(null);\n
  // Player Properties\n  const [showPlayerProperties, setShowPlayerProperties] = useState(false);\n  const [playerConfig, setPlayerConfig] = useState<PlayerConfig>(defaultPlayerConfig);\n  \n  // Edit Drawer\n  const [editDrawerOpen, setEditDrawerOpen] = useState(false);\n  const [editDrawerTab, setEditDrawerTab] = useState<'text'|'audio'>('text');`
    );
    results.push('✅ States added (alternate)');
  }
}

// ====================================================================
// FIX 3: Add Wand2 to lucide imports if not already there (for Audio section)
// ====================================================================
if (!content.includes('Mic')) {
  content = content.replace('  Move\n} from \'lucide-react\';', '  Move,\n  Mic,\n  Volume2 as Volume2Icon,\n  Music2,\n  Settings2 as PlayerIcon\n} from \'lucide-react\';');
  results.push('✅ Mic import added');
} else {
  results.push('⚠️ Mic already imported');
}

// ====================================================================
// FIX 4: Add Audio & Accessibility section BEFORE the Generate Course button
// and add Player Properties button alongside Generate Course
// ====================================================================
const old_generate_btn = `                      <button onClick={generateOutline} className="w-full py-6 mt-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xl hover:shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] hover:-translate-y-1 transition-all flex items-center justify-center gap-3 group">
                       Generate Course
                       <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                      </button>`;
const new_generate_section = `                      {/* Audio & Accessibility */}
                      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <Volume2 className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white">Audio & Accessibility</h3>
                            <p className="text-slate-400 text-sm">Control narration and audio for the course.</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <label className="flex items-center justify-between cursor-pointer group p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                <Volume2 className="w-4 h-4 text-emerald-400" />
                              </div>
                              <div>
                                <span className="text-slate-200 font-bold block text-sm">Voice-Over Narration</span>
                                <span className="text-slate-500 text-xs">AI reads slide narration aloud</span>
                              </div>
                            </div>
                            <div
                              className={\`w-12 h-6 rounded-full transition-colors relative cursor-pointer \${voiceOverEnabled ? 'bg-emerald-500' : 'bg-slate-700'}\`}
                              onClick={() => setVoiceOverEnabled(!voiceOverEnabled)}
                            >
                              <div className={\`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform \${voiceOverEnabled ? 'translate-x-6' : ''}\`} />
                            </div>
                          </label>
                          <label className="flex items-center justify-between cursor-pointer group p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                <Gamepad2 className="w-4 h-4 text-purple-400" />
                              </div>
                              <div>
                                <span className="text-slate-200 font-bold block text-sm">Sound Effects</span>
                                <span className="text-slate-500 text-xs">Sounds for interactions & quizzes</span>
                              </div>
                            </div>
                            <div
                              className={\`w-12 h-6 rounded-full transition-colors relative cursor-pointer \${soundEffectsEnabled ? 'bg-purple-500' : 'bg-slate-700'}\`}
                              onClick={() => setSoundEffectsEnabled(!soundEffectsEnabled)}
                            >
                              <div className={\`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform \${soundEffectsEnabled ? 'translate-x-6' : ''}\`} />
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex flex-col sm:flex-row gap-4 mt-8">
                        <button
                          onClick={() => setShowPlayerProperties(true)}
                          className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border-2 border-slate-700 bg-slate-900 text-slate-300 font-bold text-base hover:border-indigo-500/50 hover:text-white hover:bg-slate-800 transition-all"
                        >
                          <Settings2 className="w-5 h-5 text-indigo-400" />
                          Player Properties
                        </button>
                        <button onClick={generateOutline} className="flex-1 py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xl hover:shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] hover:-translate-y-1 transition-all flex items-center justify-center gap-3 group">
                          Generate Course Design
                          <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>`;
if (content.includes(old_generate_btn)) {
  content = content.replace(old_generate_btn, new_generate_section);
  results.push('✅ Audio section + Player Properties button + updated Generate Course button added');
} else {
  results.push('❌ Generate Course button not found with exact match');
}

// ====================================================================
// FIX 5: Enhance the Preview top toolbar to add Discard, Edit Slide, Theme Toggle
// ====================================================================
const old_toolbar = `                <div className="flex items-center gap-4">
                   <button onClick={() => setViewMode(viewMode === 'desktop' ? 'mobile' : 'desktop')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300">
                     {viewMode === 'desktop' ? <Monitor className="w-4 h-4"/> : <Smartphone className="w-4 h-4"/>}
                   </button>
                   <button onClick={exportScorm} className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-indigo-500/20">
                     <Download className="w-4 h-4" /> Export SCORM
                   </button>
                </div>`;
const new_toolbar = `                <div className="flex items-center gap-2 flex-wrap">
                   {/* Desktop/Mobile Toggle */}
                   <button onClick={() => setViewMode(viewMode === 'desktop' ? 'mobile' : 'desktop')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-medium">
                     {viewMode === 'desktop' ? <Monitor className="w-4 h-4"/> : <Smartphone className="w-4 h-4"/>}
                     <span className="hidden sm:inline">{viewMode === 'desktop' ? 'Desktop' : 'Mobile'}</span>
                   </button>
                   {/* Theme Toggle */}
                   <button onClick={() => setTheme(t => t === 'dark' ? 'light' : t === 'light' ? 'unified' : 'dark')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-medium">
                     {theme === 'dark' ? '🌑' : theme === 'light' ? '☀️' : '💜'}
                     <span className="hidden sm:inline capitalize">{theme}</span>
                   </button>
                   {/* Edit Slide */}
                   <button onClick={() => { setEditingSlide(currentSlide); setEditDrawerOpen(true); setEditDrawerTab('text'); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-indigo-700 hover:bg-indigo-800/30 text-indigo-300 text-sm font-medium">
                     <Edit3 className="w-4 h-4"/> <span className="hidden sm:inline">Edit Slide</span>
                   </button>
                   {/* Export SCORM */}
                   <button onClick={exportScorm} className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-indigo-500/20">
                     <Download className="w-4 h-4" /> Export SCORM
                   </button>
                   {/* Discard button */}
                   <button onClick={() => { setCourse(null); setStep('home'); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-800/60 hover:bg-red-900/20 text-red-400 text-sm font-medium">
                     <X className="w-4 h-4"/> <span className="hidden sm:inline">Discard</span>
                   </button>
                </div>`;
if (content.includes(old_toolbar)) {
  content = content.replace(old_toolbar, new_toolbar);
  results.push('✅ Preview toolbar: Desktop/Mobile, Theme toggle, Edit Slide, Discard added');
} else {
  results.push('❌ Preview toolbar pattern not found');
}

// ====================================================================
// FIX 6: Add the Edit Drawer (right slide-in panel) + PlayerPropertiesModal
// These need to be added BEFORE the closing </motion.div> of the preview step
// and also added globally for PlayerPropertiesModal
// ====================================================================

// Find the end of the preview section to insert the edit drawer there
// The preview section ends with </motion.div> for the step=preview block
// We'll add the Edit Drawer INSIDE the preview motion.div, just before its closing tag

const old_preview_close = `          )}\n\n          {step === 'outline' && outlineDraft &&`;
// We need to find the closing of the preview step and insert the edit drawer BEFORE the AnimatePresence closing
// Instead, let's find the last part of the preview section - specifically where the PlayerBar ends
// Then add the edit drawer after it
const EDIT_DRAWER_CODE = `

          {/* ═══════════════ Global Modals ════════════════ */}

          {/* ── PlayerPropertiesModal ── */}
          <AnimatePresence>
            {showPlayerProperties && (
              <PlayerPropertiesModal
                config={playerConfig}
                onChange={(cfg) => setPlayerConfig(cfg)}
                onClose={() => setShowPlayerProperties(false)}
              />
            )}
          </AnimatePresence>

`;

// Insert PlayerPropertiesModal before the AnimatePresence closing tag
// Target: closing of the full AnimatePresence wrapping all steps
const old_animatepresence_close = `        </AnimatePresence>\n      </main>`;
if (content.includes(old_animatepresence_close)) {
  content = content.replace(old_animatepresence_close, EDIT_DRAWER_CODE + `        </AnimatePresence>\n      </main>`);
  results.push('✅ PlayerPropertiesModal added to global modals');
} else {
  results.push('❌ AnimatePresence close not found; trying alternate');
}

// ====================================================================
// FIX 7: Add the Right Edit Drawer for text/audio editing
// Insert after the preview motion.div opening (inside it, before it closes)
// We'll find a reliable anchor: the FloatingImageCanvas section
// ====================================================================
// Check if slide edit drawer exists
if (!content.includes('editDrawerOpen && editingSlide')) {
  // Find the closing of the preview step section — look for the last PlayerBar in it
  // Then insert the edit drawer at the end of the preview motion.div
  const EDIT_DRAWER_JSX = `
                {/* ─── Right Edit Drawer ─── */}
                {editDrawerOpen && editingSlide && (
                  <>
                    <div className="fixed inset-0 z-[110] bg-black/30 backdrop-blur-sm" onClick={() => setEditDrawerOpen(false)} />
                    <motion.div
                      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                      className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-slate-900 border-l border-slate-700 shadow-2xl z-[120] flex flex-col"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-800/60">
                        <h3 className="text-white font-extrabold text-base">Edit Slide</h3>
                        <button onClick={() => setEditDrawerOpen(false)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      {/* Tabs */}
                      <div className="flex border-b border-slate-800">
                        {[
                          { id: 'text', label: '✏ Edit Text', color: 'indigo' },
                          { id: 'audio', label: '🎤 Audio', color: 'emerald' },
                        ].map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => setEditDrawerTab(tab.id as any)}
                            className={\`flex-1 px-4 py-3 text-sm font-bold transition-all \${editDrawerTab === tab.id ? 'text-white border-b-2 border-indigo-500 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'}\`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      {/* Body */}
                      <div className="flex-1 overflow-y-auto p-5 space-y-5">
                        {editDrawerTab === 'text' && (
                          <>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Slide Title</label>
                              <input
                                value={editingSlide.title || ''}
                                onChange={e => setEditingSlide({...editingSlide, title: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all font-bold"
                                placeholder="Slide title..."
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">On-Screen Text <span className="text-slate-600 normal-case">(Markdown supported)</span></label>
                              <textarea
                                rows={8}
                                value={editingSlide.content || ''}
                                onChange={e => setEditingSlide({...editingSlide, content: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all font-medium resize-none"
                                placeholder="Slide content in Markdown..."
                              />
                              <p className="text-xs text-slate-600">{(editingSlide.content || '').length} characters</p>
                            </div>
                          </>
                        )}
                        {editDrawerTab === 'audio' && (
                          <>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Audio Narration Script</label>
                              <p className="text-xs text-slate-500">Narration EXPANDS on bullets — never reads them verbatim.</p>
                              <textarea
                                rows={6}
                                value={editingSlide.voiceOverText || editingSlide.content || ''}
                                onChange={e => setEditingSlide({...editingSlide, voiceOverText: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition-all font-medium resize-none"
                                placeholder="Write the narration script here..."
                              />
                              {(() => {
                                const words = (editingSlide.voiceOverText || editingSlide.content || '').split(/\\s+/).filter(Boolean).length;
                                const mins = Math.round(words / 130);
                                return <p className="text-xs text-emerald-500/70">{words} words • ~{mins} min read at 130 wpm</p>;
                              })()}
                            </div>
                            <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Voice-Over Status</p>
                              <div className="flex items-center gap-2">
                                <div className={\`w-2 h-2 rounded-full \${voiceOverEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}\`} />
                                <span className="text-sm text-slate-300">{voiceOverEnabled ? 'Voice-Over Enabled' : 'Voice-Over Disabled'}</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      {/* Footer */}
                      <div className="px-5 py-4 border-t border-slate-800 flex gap-3">
                        <button onClick={() => setEditDrawerOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-sm hover:bg-slate-800 transition-all">
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (course && editingSlide) {
                              const updatedModules = course.modules.map((m: any) => ({
                                ...m,
                                slides: m.slides.map((s: any) => s.id === editingSlide.id ? editingSlide : s)
                              }));
                              setCourse({ ...course, modules: updatedModules });
                            }
                            setEditDrawerOpen(false);
                          }}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Save Changes
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}`;

  // Insert after the preview toolbar close div
  const anchor = `              </div>\n\n          )}\n\n          {step === 'outline'`;
  if (content.includes(anchor)) {
    content = content.replace(anchor, `              </div>\n${EDIT_DRAWER_JSX}\n\n          )}\n\n          {step === 'outline'`);
    results.push('✅ Right Edit Drawer (text/audio tabs) added inside preview section');
  } else {
    results.push('❌ Could not find anchor for edit drawer — trying inline insert after preview motion.div');
    // Try a different anchor
    const anchor2 = `           )}\n\n          {step === 'outline' && outlineDraft`;
    if (content.includes(anchor2)) {
      content = content.replace(anchor2, `${EDIT_DRAWER_JSX}\n\n           )}\n\n          {step === 'outline' && outlineDraft`);
      results.push('✅ Edit Drawer added (alternate anchor)');
    }
  }
} else {
  results.push('⚠️ Edit Drawer already present');
}

fs.writeFileSync("src/App.tsx", content, "utf-8");

console.log("\n=== FIX REPORT ===");
results.forEach(r => console.log(r));
console.log("\nTotal lines:", content.split('\n').length);
console.log("Total bytes:", content.length);
