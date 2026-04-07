const fs = require("fs");
let content = fs.readFileSync("src/App.tsx", "utf-8");

// =====================================================
// FIX 1: handlePresetChange — pass pathway to getPresetConfig
// =====================================================
content = content.replace(
  `const handlePresetChange = (newPreset: 'quick' | 'standard' | 'comprehensive') => {
    setPreset(newPreset);
    const config = getPresetConfig(newPreset);
    setSlideCount(config.slideCount);
    setInteractionTypes(config.interactionTypes);
    setCourseType(config.courseType);
    if (config.gameTemplateIds) setGameTemplateIds(config.gameTemplateIds);
  };`,
  `const handlePresetChange = (newPreset: 'quick' | 'standard' | 'comprehensive') => {
    setPreset(newPreset);
    const config = getPresetConfig(pathway, newPreset);
    setSlideCount(config.slideCountTarget);
    setInteractionTypes(config.interactions);
    if (config.objectiveFormat) setObjectiveFormat(config.objectiveFormat === 'k12_ican' ? 'I Can' : config.objectiveFormat);
  };`
);

// =====================================================
// FIX 2: handleFileUpload — pass pathway when applying recommended preset
// =====================================================
content = content.replace(
  `        if (result.recommendedPreset) {
           setPreset(result.recommendedPreset as any);
           const config = getPresetConfig(result.recommendedPreset as any);
           setSlideCount(config.slideCountTarget || config.slideCount);
           setInteractionTypes(config.interactions || config.interactionTypes);
           setCourseType(config.courseType);
        }`,
  `        if (result.recommendedPreset) {
           const rp = result.recommendedPreset as 'quick' | 'standard' | 'comprehensive';
           setPreset(rp);
           const config = getPresetConfig(pathway, rp);
           setSlideCount(config.slideCountTarget);
           setInteractionTypes(config.interactions);
           if (config.objectiveFormat) setObjectiveFormat(config.objectiveFormat === 'k12_ican' ? 'I Can' : config.objectiveFormat);
        }`
);

// =====================================================
// FIX 3: getPresetOptions() calls — pass pathway
// =====================================================
content = content.replace(/getPresetOptions\(\)/g, 'getPresetOptions(pathway)');

// =====================================================
// FIX 4: Fix garbled bullet character in Interactive Elements header
// Using buffer to handle encoding issues
// =====================================================
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  // Replace any line containing the garbled bullet (multi-byte artifacts)
  if (lines[i].includes('CLICK TO SELECT') && lines[i].includes('ICON TO PREVIEW')) {
    lines[i] = lines[i].replace(/CLICK TO SELECT.*?ICON TO PREVIEW/, 'CLICK TO SELECT \u2022 HOVER FOR PREVIEW');
    console.log(`Fixed garbled text on line ${i+1}: ${lines[i].trim()}`);
    break;
  }
  // Also check for common encoding variants
  if (lines[i].includes('CLICK TO SELECT') && (lines[i].includes('\u00e2') || lines[i].includes('\u2022') || lines[i].includes('â'))) {
    lines[i] = `                            <p className="text-xs text-blue-400 font-bold tracking-widest uppercase mb-6">CLICK TO SELECT \u2022 HOVER FOR PREVIEW</p>`;
    console.log(`Fixed garbled text on line ${i+1}`);
    break;
  }
}
content = lines.join('\n');

// =====================================================
// FIX 5: Objective format buttons — pathway-aware
// =====================================================
const oldFormatButtons = `                            {['AB', 'ABC', 'ABCD', 'I Can'].map(fmt => (`;
const newFormatButtons = `                            {(pathway === 'corporate' ? ['AB', 'ABC', 'ABCD'] : ['I Can', 'ABC', 'ABCD']).map(fmt => (`;
content = content.replace(oldFormatButtons, newFormatButtons);

// =====================================================
// FIX 6: Landing page text
// =====================================================
content = content.replace(
  'Experience the Future of Course Creation',
  'Transform Any Document Into a Complete eLearning Course in Minutes'
);

content = content.replace(
  'Upload an expert document to instantly generate a fully styled, interactive, and SCORM-compliant eLearning course.',
  'AI-powered authoring that analyzes your content and builds a complete, SCORM-compliant, interactive course — automatically.'
);

// =====================================================
// FIX 7: gamification grid — pass pathway and preset
// =====================================================
content = content.replace(
  `{getRecommendedGames('standard').map((gt: any) => {`,
  `{getRecommendedGames(pathway, preset).map((gt: any) => {`
);

// =====================================================
// Write and verify
// =====================================================
const checks = [
  ['handlePresetChange fixed', content.includes('getPresetConfig(pathway, newPreset)')],
  ['handleFileUpload fixed', content.includes('getPresetConfig(pathway, rp)')],
  ['getPresetOptions(pathway) fixed', content.includes('getPresetOptions(pathway)')],
  ['format buttons pathway aware', content.includes("pathway === 'corporate' ? ['AB', 'ABC', 'ABCD']")],
  ['gamification grid pathway aware', content.includes("getRecommendedGames(pathway, preset)")],
  ['landing page text updated', content.includes('Transform Any Document')],
];

let allGood = true;
for (const [name, ok] of checks) {
  console.log(ok ? `✅ ${name}` : `❌ FAILED: ${name}`);
  if (!ok) allGood = false;
}

// Check for remaining garbled chars
const hasGarbled = content.includes('\u00e2\u20ac\u00a2');
console.log(hasGarbled ? `❌ FAILED: garbled bullet still present` : `✅ garbled bullet fixed`);

fs.writeFileSync("src/App.tsx", content, "utf-8");
console.log("\n✅ File written (fixes applied where successful)");
