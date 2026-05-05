const fs = require('fs');
let src = fs.readFileSync('src/components/player/CourseNavSidebar.tsx', 'utf8');

// ── 1. Add new icons to SLIDE_TYPE_ICON map ──────────────────────────────────
// Find the closing brace of the icon map and insert before it
src = src.replace(
  `  'exam-intro': '🎓', 'mastery-exam': '📝', 'exam-results': '🏆',\n};`,
  `  'exam-intro': '🎓', 'mastery-exam': '📝', 'exam-results': '🏆',\n  'player-tour': '🗺️', 'course-objectives': '🎯',\n};`
);

// ── 2. Inject Player Tour + Course Objectives entries between cover and modules ─
// After the closing of the cover button block, before `{modules.map(...`
const moduleMapStart = `        {modules.map((mod, mi) => (`;
const newEntries = `        {/* Player Tour — navigates to slide index 1 */}
        {allSlides[1]?.type === 'player-tour' && (() => {
          const idx = 1;
          const isActive = currentSlideIndex === idx;
          return (
            <button
              key="__player-tour__"
              onClick={() => onNavigate(idx)}
              className={cn(
                'w-full flex items-center gap-2.5 pl-4 pr-4 py-2.5 text-left transition-all mb-1',
                isActive ? activeRow : inactiveRow
              )}
              title="Player Navigation Guide"
            >
              <span className="text-base shrink-0">🗺️</span>
              <span className="text-sm leading-snug font-medium">Player Tour</span>
              <span className="ml-auto text-xs px-1.5 py-0.5 rounded font-semibold opacity-60" style={{ backgroundColor: 'rgba(79,70,229,0.25)', color: '#818cf8' }}>Skip</span>
            </button>
          );
        })()}

        {/* Course Objectives — navigates to slide index 2 */}
        {allSlides[2]?.type === 'course-objectives' && (() => {
          const idx = 2;
          const isActive = currentSlideIndex === idx;
          return (
            <button
              key="__course-objectives__"
              onClick={() => onNavigate(idx)}
              className={cn(
                'w-full flex items-center gap-2.5 pl-4 pr-4 py-2.5 text-left transition-all mb-1',
                isActive ? activeRow : inactiveRow
              )}
              title="Course Objectives"
            >
              <span className="text-base shrink-0">🎯</span>
              <span className="text-sm leading-snug font-medium">Course Objectives</span>
            </button>
          );
        })()}

        {modules.map((mod, mi) => (`;

if (!src.includes(moduleMapStart)) {
  console.error('❌ modules.map start not found');
  process.exit(1);
}
src = src.replace(moduleMapStart, newEntries);
fs.writeFileSync('src/components/player/CourseNavSidebar.tsx', src, 'utf8');
console.log('✔ CourseNavSidebar: Player Tour + Course Objectives entries added');
