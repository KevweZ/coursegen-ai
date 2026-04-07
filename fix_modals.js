import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf8');

const anchor = `{/* Source Image Gallery Modal */}`;
if (code.includes(anchor)) {
    const parts = code.split(anchor);
    const beforeModals = parts[0];

    const modalsJSX = `{/* Source Image Gallery Modal */}
        <AnimatePresence>
          {showImageGalleryForSlide && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[150] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[85vh] shadow-2xl overflow-hidden border border-slate-700 flex flex-col"
              >
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-indigo-400" />
                      Source Document Images
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">Select an image to insert into the current slide.</p>
                  </div>
                  <button onClick={() => setShowImageGalleryForSlide(null)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4">
                  {sourceImages.map((img: any, i: number) => (
                    <div 
                      key={i} 
                      onClick={() => {
                        handleUpdateSlideMedia(showImageGalleryForSlide, { mediaUrl: img.url, imagePlaceholder: false });
                        setShowImageGalleryForSlide(null);
                      }}
                      className="aspect-video bg-slate-800 rounded-xl overflow-hidden cursor-pointer hover:ring-4 hover:ring-indigo-500 transition-all border border-slate-700 group relative"
                    >
                      <img src={img.url} alt="Source Document Extracted" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Slide Edit Modal */}
        <AnimatePresence>
          {editingSlide && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[120] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] shadow-2xl overflow-hidden border border-gray-100 flex flex-col"
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Edit3 className="w-5 h-5 text-indigo-600" />
                      Edit Slide Content
                    </h3>
                  </div>
                  <button onClick={() => setEditingSlide(null)} className="p-2 hover:bg-white rounded-full transition-colors drop-shadow-sm"><X className="w-5 h-5 text-slate-500" /></button>
                </div>
                <div className="p-8 overflow-y-auto space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Slide Title</label>
                    <input 
                      type="text" 
                      value={editingSlide.title}
                      onChange={(e) => setEditingSlide({ ...editingSlide, title: e.target.value })}
                      className="w-full px-4 py-3 bg-white text-slate-900 rounded-xl border border-gray-200 focus:border-indigo-600 outline-none transition-all font-bold shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">On-Screen Text</label>
                    </div>
                    <textarea 
                      id="slide-content-textarea"
                      rows={6}
                      value={editingSlide.content}
                      onChange={(e) => setEditingSlide({ ...editingSlide, content: e.target.value })}
                      className="w-full px-4 py-3 bg-white text-slate-900 rounded-xl border border-gray-200 focus:border-indigo-600 outline-none transition-all resize-none font-medium shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex justify-between items-center">
                      <span>Audio Narration Script</span>
                    </label>
                    <textarea 
                      rows={3}
                      value={editingSlide.voiceOverText || ''}
                      onChange={(e) => setEditingSlide({ ...editingSlide, voiceOverText: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:border-indigo-600 outline-none transition-all resize-none font-sans text-emerald-700 bg-emerald-50"
                    />
                  </div>
                </div>
                <div className="p-6 bg-gray-50 flex justify-end gap-3 shrink-0">
                  <button onClick={() => setEditingSlide(null)} className="px-6 py-2 rounded-xl font-bold text-sm text-gray-500 hover:text-gray-800">Cancel</button>
                  <button onClick={() => handleUpdateSlide(editingSlide)} className="bg-indigo-600 text-white px-8 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all">Save Changes</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Settings Modal */}
        <AnimatePresence>
          {showSettings && course && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[130] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-xl font-bold">Course Settings</h3>
                  <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Visual Theme</h4>
                    <div className="grid grid-cols-3 gap-2">
                       {['light', 'dark', 'unified'].map((t) => (
                         <button key={t} onClick={() => setTheme(t as any)} className={cn("py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all", theme === t ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-gray-100 text-gray-400")}>{t}</button>
                       ))}
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-gray-50 flex justify-end">
                  <button onClick={() => setShowSettings(false)} className="bg-indigo-600 text-white px-8 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all">Done</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}`;

    fs.writeFileSync('src/App.tsx', beforeModals + modalsJSX);
    console.log("Rewrote Modals successfully");
} else {
    console.log("Anchor not found!");
}
