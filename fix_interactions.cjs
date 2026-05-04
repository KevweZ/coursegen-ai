const fs = require('fs');
let c = fs.readFileSync('src/App.tsx','utf8');

// Fix matching renderer (lines 2739-2748 area)
const matchOld = `                                   return (
                                     <div className="space-y-6 w-full">
                                       <SlideHeader title={currentSlide.title} theme={theme} />
                                       <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                       <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                         <MatchingActivity {...matchingProps} />
                                       </div>
                                     </div>
                                   );
                                })()}`;

const matchNew = `                                   return (
                                     <div className="space-y-4 w-full">
                                       <SlideHeader title={currentSlide.title} theme={theme} />
                                       <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                       <CustomMatchingActivity
                                         items={matchingProps.items || []}
                                         targets={matchingProps.targets || []}
                                       />
                                     </div>
                                   );
                                })()}`;

if (c.includes(matchOld)) { c = c.replace(matchOld, matchNew); console.log('✔ matching'); }
else {
  // Try CRLF
  const matchOldCRLF = matchOld.replace(/\n/g, '\r\n');
  if (c.includes(matchOldCRLF)) { c = c.replace(matchOldCRLF, matchNew); console.log('✔ matching CRLF'); }
  else {
    // Targeted: just replace MatchingActivity line
    c = c.replace('<MatchingActivity {...matchingProps} />', `<CustomMatchingActivity\n                                         items={matchingProps.items || []}\n                                         targets={matchingProps.targets || []}\n                                       />`);
    // Also fix surrounding div
    c = c.replace(
      `<div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>\n                                         <CustomMatchingActivity`,
      `<CustomMatchingActivity`
    );
    c = c.replace(
      `<div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>\r\n                                         <CustomMatchingActivity`,
      `<CustomMatchingActivity`
    );
    // Remove the closing </div> for the wrapper
    c = c.replace(
      `                                       />\r\n                                       </div>\r\n                                     </div>\r\n                                   );\r\n                                })()}\r\n                                {currentSlide?.type === 'accordion'`,
      `                                       />\r\n                                     </div>\r\n                                   );\r\n                                })()}\r\n                                {currentSlide?.type === 'accordion'`
    );
    console.log('✔ matching (targeted replace)');
  }
}

// Fix sorting renderer
const sortOld = `{currentSlide?.type === 'sorting' && (
                                   <div className="space-y-6 w-full">
                                      <SlideHeader title={currentSlide.title} theme={theme} />
                                      <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                      <div className={cn(theme === 'dark' || theme === 'unified' ? 'interaction-dark-override' : 'interaction-light-fix')}>
                                         <SortingActivity {...(currentSlide.data || currentSlide.interactions?.[0] || {})} />
                                      </div>
                                   </div>
                                )}`;
const sortNew = `{currentSlide?.type === 'sorting' && (() => {
                                   const sd = currentSlide.data || currentSlide.interactions?.[0] || {};
                                   const sortItems = Array.isArray(sd.items) ? sd.items
                                     : Array.isArray(sd.steps) ? sd.steps.map((s, i) => ({ id: s.id || String(i), content: s.label || s.content || String(s) }))
                                     : [];
                                   return (
                                     <div className="space-y-4 w-full">
                                       <SlideHeader title={currentSlide.title} theme={theme} />
                                       <SmartContent content={sanitizeContent(currentSlide.content)} theme={theme} className={cn('prose max-w-none', theme !== 'light' ? 'prose-invert' : '')} />
                                       <CustomSortingActivity items={sortItems} correctOrder={sd.correctOrder || []} prompt="Drag items or use arrows to reorder" />
                                     </div>
                                   );
                                })()}`;

if (c.includes(sortOld)) { c = c.replace(sortOld, sortNew); console.log('✔ sorting'); }
else {
  const sortOldCRLF = sortOld.replace(/\n/g, '\r\n');
  if (c.includes(sortOldCRLF)) { c = c.replace(sortOldCRLF, sortNew); console.log('✔ sorting CRLF'); }
  else {
    // Targeted: replace just the SortingActivity component
    c = c.replace(
      '<SortingActivity {...(currentSlide.data || currentSlide.interactions?.[0] || {})} />',
      `<CustomSortingActivity items={(currentSlide.data || currentSlide.interactions?.[0] || {}).items || []} correctOrder={(currentSlide.data || currentSlide.interactions?.[0] || {}).correctOrder || []} prompt="Drag items or use arrows to reorder" />`
    );
    console.log('✔ sorting (targeted)');
  }
}

fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log('done');
