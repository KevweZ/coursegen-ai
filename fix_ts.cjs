const fs = require("fs");
let content = fs.readFileSync("src/App.tsx", "utf-8");

// ===========================
// FIX 1: p.title → p.label, p.slideCountStr→slideCountTarget, p.interactionDensityStr→interactions.length
// ===========================
const old1 = `                              <div key={p.id} onClick={() => handlePresetChange(p.id as any)} className={\`p-4 rounded-xl border-2 cursor-pointer transition-all \${preset === p.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-slate-950 hover:border-slate-700'}\`}>
                                 <h4 className="text-white font-bold text-lg mb-1">{p.title}</h4>
                                 <p className="text-slate-400 text-xs mb-3">{p.description}</p>
                                 <div className="text-xs font-mono text-indigo-400">{p.slideCountStr} • {p.interactionDensityStr}</div>
                              </div>`;
const new1 = `                              <div key={p.id} onClick={() => handlePresetChange(p.id as any)} className={\`p-4 rounded-xl border-2 cursor-pointer transition-all \${preset === p.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-slate-950 hover:border-slate-700'}\`}>
                                 <h4 className="text-white font-bold text-lg mb-1">{pathway === 'k12' ? p.k12Label : p.label}</h4>
                                 <p className="text-slate-400 text-xs mb-3">{pathway === 'k12' ? p.k12Description : p.description}</p>
                                 <div className="text-xs font-mono text-indigo-400">{p.slideCountTarget} slides • {p.interactions.length} interaction types</div>
                              </div>`;
if (content.includes(old1)) { content = content.replace(old1, new1); console.log("✅ Preset tile fields fixed"); }
else console.log("❌ Preset tile fields not matched — checking alternatives...");

// Try alternate with already partially updated:
const old1b = `{p.title}`;
if (content.includes(old1b)) { 
  content = content.replace(`{p.title}`, `{pathway === 'k12' ? p.k12Label : p.label}`);
  content = content.replace(`{p.slideCountStr} • {p.interactionDensityStr}`, `{p.slideCountTarget} slides • {p.interactions.length} types`);
  console.log("✅ Preset tile fields fixed (alternate)");
}

// ===========================
// FIX 2: processCourseContent is not defined — remove that call
// ===========================
const old2 = `setCourse(processCourseContent(finalCourse));`;
const new2 = `setCourse(finalCourse);`;
if (content.includes(old2)) { content = content.replace(old2, new2); console.log("✅ processCourseContent removed"); }
else console.log("⚠️ processCourseContent already fixed or not found");

// ===========================
// FIX 3: FloatingImageCanvas — fix the component call that has wrong props
// Find the line with `images={` and check the component usage
// ===========================
// This might be something like <FloatingImageCanvas images={...} /> but needs isAuthoring, onChange, onRemove
// Let's look for it
const floatIdx = content.indexOf('<FloatingImageCanvas');
if (floatIdx !== -1) {
  const floatEnd = content.indexOf('/>', floatIdx) + 2;
  const floatSection = content.substring(floatIdx, floatEnd);
  console.log("FloatingImageCanvas usage:", floatSection.substring(0, 200));
  
  // Add the missing required props with no-op defaults
  const fixedFloat = floatSection.replace(
    '<FloatingImageCanvas',
    '<FloatingImageCanvas isAuthoring={false} onChange={() => {}} onRemove={() => {}}'
  );
  content = content.substring(0, floatIdx) + fixedFloat + content.substring(floatEnd);
  console.log("✅ FloatingImageCanvas props added");
} else {
  console.log("⚠️ FloatingImageCanvas not found in JSX");
}

// ===========================
// FIX 4: suggestLearningObjectives — the call at line 272 has wrong arg count
// ===========================
// Find it and check
const suggLine = content.split('\n')[271]; // line 272 is 0-indexed 271
console.log("Line 272 (suggest call):", suggLine?.trim());

fs.writeFileSync("src/App.tsx", content, "utf-8");
console.log("\n✅ TS fixes written. New size:", content.length);
