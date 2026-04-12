const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');
const lines = app.split('\n');

// After line 1315 (0-indexed: 1314) which is `                      </div>` (end of audio section)
// Insert the voice picker block before line 1316 (the blank line before Footer)
const voicePicker = `
                        {/* TTS Voice Picker — shown when voice-over is enabled */}
                        {voiceOverEnabled && (
                          <div className="mt-5 space-y-3">
                            <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">AI Narrator Voice</div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {([
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
                              ))}
                            </div>
                          </div>
                        )}`.split('\n');

// Insert after line 1314 (0-indexed) — that's after `                      </div>` on line 1315
lines.splice(1314, 0, ...voicePicker);
fs.writeFileSync('src/App.tsx', lines.join('\n'), 'utf8');
console.log('Done. Lines around insertion:');
lines.slice(1310, 1360).forEach((l,i) => console.log(1311+i, l.substring(0, 90)));
