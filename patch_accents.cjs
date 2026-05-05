/**
 * App.tsx multi-patch:
 * 1. Import MODULE_COLORS from ModuleOverviewSlide
 * 2. Add currentModuleNumber useMemo (after allSlides is defined)
 * 3. Compute slideAccentColor
 * 4. Add global accent strip (absolute left strip in slide frame)
 * 5. Simplify content slide renderer (remove left strip, keep label+underline)
 * 6. Update PlayerBar: pass volume/onVolumeChange, remove voiceOver props
 */

const fs = require('fs');
let src = fs.readFileSync('src/App.tsx', 'utf8');
let applied = 0;

// ── Helper: CRLF-aware replace ──────────────────────────────────────────────
function patch(label, oldStr, newStr) {
  if (src.includes(oldStr)) {
    src = src.replace(oldStr, newStr);
    applied++;
    console.log(`✔ ${label}`);
    return true;
  }
  // Try LF version
  const oldLF = oldStr.replace(/\r\n/g, '\n');
  const newLF = newStr.replace(/\r\n/g, '\n');
  if (src.includes(oldLF)) {
    src = src.replace(oldLF, newLF);
    applied++;
    console.log(`✔ ${label} (LF)`);
    return true;
  }
  console.error(`❌ ${label} — NOT FOUND`);
  return false;
}

// ── 1. Import MODULE_COLORS ──────────────────────────────────────────────────
patch(
  '1. Import MODULE_COLORS',
  `import { ModuleOverviewSlide } from './components/player/ModuleOverviewSlide';`,
  `import { ModuleOverviewSlide, MODULE_COLORS } from './components/player/ModuleOverviewSlide';`
);

// ── 2. Add currentModuleNumber + slideAccentColor after allSlides useMemo ───
// Find the examIntroIndex definition line and insert after allSlides
const AFTER_ALLSLIDES = `  const examIntroIndex   = contentSlides.length + PRE_CONTENT;`;
const INSERT_ACCENT = `  // Compute which module the current slide belongs to (for accent color)
  const currentModuleNumber = React.useMemo(() => {
    let mod = 0;
    for (let i = 0; i <= currentSlideIndex; i++) {
      const s = allSlides[i];
      if (s && typeof (s as any).id === 'string') {
        const m = (s as any).id.match(/__module-overview-(\\d+)__/);
        if (m) mod = parseInt(m[1]);
      }
    }
    return mod;
  }, [allSlides, currentSlideIndex]);

  const slideAccentColor = React.useMemo(() => {
    if ((playerConfig as any).accentMode === 'global') {
      return (playerConfig as any).globalAccentColor || '#4f46e5';
    }
    return MODULE_COLORS[(currentModuleNumber - 1) % MODULE_COLORS.length] || '#4f46e5';
  }, [playerConfig, currentModuleNumber]);

  `;

patch(
  '2. Add currentModuleNumber + slideAccentColor',
  AFTER_ALLSLIDES,
  INSERT_ACCENT + AFTER_ALLSLIDES
);

// ── 3. Global accent strip — add as absolute element inside slide frame ─────
// The slide frame div contains the content zone and playerbar. We need to add
// the accent strip as the first child, just after the slide frame opening.
// We'll insert it before the "content zone" comment.

const CONTENT_ZONE_COMMENT = `                    {/* \u2500\u2500 Content zone: flex-1 so PlayerBar stays at bottom \u2500\u2500 */}`;
const WITH_ACCENT_STRIP = `                    {/* Global per-module accent strip (absolute, left edge) */}
                    {!['cover','module-cover','module-overview','player-tour','course-objectives','closing','exam-intro','mastery-exam','exam-results'].includes((currentSlide as any)?.type) && (
                      <div
                        className="absolute left-0 top-0 bottom-0 w-[3px] z-20 pointer-events-none"
                        style={{ background: \`linear-gradient(to bottom, \${slideAccentColor}, \${slideAccentColor}40)\` }}
                      />
                    )}
                    {/* \u2500\u2500 Content zone: flex-1 so PlayerBar stays at bottom \u2500\u2500 */}`;

patch('3. Global accent strip', CONTENT_ZONE_COMMENT, WITH_ACCENT_STRIP);

// ── 4. Simplify content slide renderer (remove left strip, keep label+underline)
const OLD_CONTENT = `                               {(currentSlide?.type === 'content' || currentSlide?.type === 'summary') && (() => {\n                                 const accent = theme === 'light' ? '#4338ca' : theme === 'unified' ? '#a78bfa' : '#818cf8';\n                                 const accentFaint = \`\${accent}40\`;\n                                 const labelClr = theme === 'light' ? '#6366f1' : theme === 'unified' ? '#c4b5fd' : '#818cf8';\n                                 const typeLabel = currentSlide.type === 'summary' ? 'Summary' : 'Overview';\n                                 return (\n                                   <div className="w-full h-full flex gap-0 overflow-hidden">\n                                     {/* Left accent strip */}\n                                     <div className="shrink-0 w-[3px] rounded-full mr-5 self-stretch" style={{ background: \`linear-gradient(to bottom, \${accent}, \${accentFaint})\` }} />\n                                     {/* Content area */}\n                                     <div className="flex-1 min-w-0 space-y-4">\n                                       {/* Section label */}\n                                       <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: labelClr }}>\n                                         {typeLabel}\n                                       </p>\n                                       {/* Title + animated underline */}\n                                       <div className="space-y-1.5">\n                                         <SlideHeader title={currentSlide.title} theme={theme} className="mb-0" />\n                                         <div className="h-[2px] w-full rounded-full" style={{ background: \`linear-gradient(to right, \${accent}, \${accentFaint}, transparent)\` }} />\n                                       </div>\n                                       {/* Body content */}\n                                       {currentSlide.content && <SlideContent content={sanitizeContent(currentSlide.content)} theme={theme} />}\n                                     </div>\n                                   </div>\n                                 );\n                               })()}`;

const NEW_CONTENT = `                               {(currentSlide?.type === 'content' || currentSlide?.type === 'summary') && (() => {\n                                 const typeLabel = currentSlide.type === 'summary' ? 'Summary' : 'Overview';\n                                 const accentFaint = \`\${slideAccentColor}40\`;\n                                 return (\n                                   <div className="w-full space-y-4">\n                                     {/* Section label */}\n                                     <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: slideAccentColor }}>\n                                       {typeLabel}\n                                     </p>\n                                     {/* Title + animated underline */}\n                                     <div className="space-y-1.5">\n                                       <SlideHeader title={currentSlide.title} theme={theme} className="mb-0" />\n                                       <div className="h-[2px] w-full rounded-full" style={{ background: \`linear-gradient(to right, \${slideAccentColor}, \${accentFaint}, transparent)\` }} />\n                                     </div>\n                                     {/* Body content */}\n                                     {currentSlide.content && <SlideContent content={sanitizeContent(currentSlide.content)} theme={theme} />}\n                                   </div>\n                                 );\n                               })()}`;

patch('4. Simplify content slide renderer', OLD_CONTENT, NEW_CONTENT);

// ── 5. Update PlayerBar call: add volume props, remove voiceOver ─────────────
const OLD_PB = `                        voiceOverEnabled={voiceOverEnabled}\r\n                        onToggleVoiceOver={() => setVoiceOverEnabled(v => !v)}\r\n                      />`;
const NEW_PB = `                        volume={player.volume}\r\n                        onVolumeChange={player.setVolume}\r\n                      />`;

if (src.includes(OLD_PB)) {
  src = src.replace(OLD_PB, NEW_PB);
  applied++;
  console.log('✔ 5. PlayerBar volume props (CRLF)');
} else {
  const OLD_PB_LF = OLD_PB.replace(/\r\n/g, '\n');
  const NEW_PB_LF = NEW_PB.replace(/\r\n/g, '\n');
  if (src.includes(OLD_PB_LF)) {
    src = src.replace(OLD_PB_LF, NEW_PB_LF);
    applied++;
    console.log('✔ 5. PlayerBar volume props (LF)');
  } else {
    console.error('❌ 5. PlayerBar volume props not found');
  }
}

fs.writeFileSync('src/App.tsx', src, 'utf8');
console.log(`\n✅ ${applied}/5 patches applied to App.tsx`);
