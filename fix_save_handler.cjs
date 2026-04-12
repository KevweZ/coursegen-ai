'use strict';
const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add courseRef right after the course useState declaration
app = app.replace(
  `  const [course, setCourse] = useState<any>(isScormPlayer ? (window as any).__COURSE_DATA__ : null);`,
  `  const [course, setCourse] = useState<any>(isScormPlayer ? (window as any).__COURSE_DATA__ : null);
  /** Always-current ref so Save Changes uses the latest course even in stale closures */
  const courseRef = useRef<any>(null);`
);

// 2. Keep courseRef in sync — wrap setCourse calls with a helper, or update the save button to use functional updater
// Instead of wrapping all setCourse calls, let's just use the functional updater in Save Changes
// and use courseRef.current where needed

// Replace the save handler to use functional setCourse updater (always latest state)
const OLD_SAVE = `                      if (course && editingSlideRef.current) {
                        const latest = editingSlideRef.current;
                        const updatedModules = course.modules.map((m: any) => ({
                          ...m,
                          slides: m.slides.map((s: any) => s.id === latest.id ? latest : s)
                        }));
                        setCourse({ ...course, modules: updatedModules });
                      }`;

const NEW_SAVE = `                      if (editingSlideRef.current) {
                        const latest = editingSlideRef.current;
                        setCourse((prevCourse: any) => {
                          if (!prevCourse) return prevCourse;
                          return {
                            ...prevCourse,
                            modules: prevCourse.modules.map((m: any) => ({
                              ...m,
                              slides: m.slides.map((s: any) => s.id === latest.id ? latest : s)
                            })),
                          };
                        });
                      }`;

if (app.includes(OLD_SAVE)) {
  app = app.replace(OLD_SAVE, NEW_SAVE);
  console.log('✓ Save handler updated to use functional setCourse');
} else {
  console.log('✗ Save handler not found — trimming and retrying');
  // Try trimmed version
  const OLD_TRIM = `if (course && editingSlideRef.current)`;
  if (app.includes(OLD_TRIM)) {
    // Find the block and replace
    const idx = app.indexOf(OLD_TRIM);
    const before = app.slice(0, idx);
    const after = app.slice(idx);
    // Find the closing brace of the if block
    const closeIdx = after.indexOf('                      }\n                       setEditingSlide(null)');
    console.log('Block starts at idx:', idx, 'in after, closeIdx:', closeIdx);
  }
}

// 3. Also update the onChange in RichTextEditor usage to add console.log for debugging
// Actually let's just verify the editingSlideRef.current init on drawer open works
const hasInit = app.includes('editingSlideRef.current = currentSlide; setEditingSlide(currentSlide)');
console.log('Ref init on open:', hasInit ? '✓' : '✗');

fs.writeFileSync('src/App.tsx', app, 'utf8');

// Verify
const hasFunctional = app.includes('setCourse((prevCourse: any)');
console.log('Uses functional setCourse:', hasFunctional ? '✓' : '✗');
