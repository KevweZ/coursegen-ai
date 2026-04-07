const fs = require("fs");
let content = fs.readFileSync("src/App.tsx", "utf-8");

// ============================================================
// Replace inline JSX "Tabs Horizontal" preview with real TabbedHorizontal component
// ============================================================
const oldTabsH = `                         {previewModalOption === 'Tabs (Horizontal)' && (
                            <div className="w-full max-w-2xl">
                              <div className="flex border-b border-slate-700 mb-4">
                                {['Overview','Key Concepts','Practice','Summary'].map((tab, i) => (
                                  <div key={tab} className={\`px-5 py-3 text-sm font-bold cursor-pointer border-b-2 -mb-px transition-colors \${i===0 ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}\`}>{tab}</div>
                                ))}
                              </div>
                              <div className="p-4 bg-slate-800 rounded-xl text-slate-300 text-sm leading-relaxed">
                                Welcome to this interactive learning module. Use the tabs above to navigate between sections. Each section builds on the previous one to support progressive mastery.
                              </div>
                            </div>
                         )}`;
const newTabsH = `                         {previewModalOption === 'Tabs (Horizontal)' && (
                            <div className="w-full max-w-2xl">
                              <TabbedHorizontal tabs={[
                                { id: '1', label: 'Overview', content: 'Welcome to this interactive learning module. Use the tabs to navigate between sections. Each section builds on the previous one to support progressive mastery.' },
                                { id: '2', label: 'Key Concepts', content: 'This section covers the essential principles and frameworks. Take time to understand each before moving on.' },
                                { id: '3', label: 'Practice', content: 'Apply what you have learned through real-world scenarios and hands-on exercises.' },
                                { id: '4', label: 'Summary', content: 'Review the key takeaways from this module and test your knowledge with a quick knowledge check.' },
                              ]} />
                            </div>
                         )}`;

// ============================================================
// Replace inline JSX "Tabs Vertical" preview with real TabbedVertical component
// ============================================================
const oldTabsV = `                         {previewModalOption === 'Tabs (Vertical)' && (
                            <div className="w-full max-w-2xl flex gap-4">
                              <div className="flex flex-col border-r border-slate-700 shrink-0 w-44">
                                {['Introduction','Core Skills','Application','Assessment'].map((tab, i) => (
                                  <div key={tab} className={\`px-4 py-3 text-sm font-bold cursor-pointer border-r-2 -mr-px transition-colors \${i===0 ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' : 'border-transparent text-slate-500 hover:text-slate-300'}\`}>{tab}</div>
                                ))}
                              </div>
                              <div className="flex-1 p-4 bg-slate-800 rounded-xl text-slate-300 text-sm leading-relaxed">
                                This is the Introduction section. Use the vertical tab navigation on the left to jump between topic areas. Each tab covers a distinct concept.
                              </div>
                            </div>
                         )}`;
const newTabsV = `                         {previewModalOption === 'Tabs (Vertical)' && (
                            <div className="w-full max-w-2xl">
                              <TabbedVertical tabs={[
                                { id: '1', label: 'Introduction', icon: '📖', content: 'This section introduces the core framework. Use the vertical navigation on the left to jump between areas. Each tab covers a distinct concept.' },
                                { id: '2', label: 'Core Skills', icon: '⚡', content: 'These are the essential skills needed for mastery. Review each carefully and take notes on areas where you may need practice.' },
                                { id: '3', label: 'Application', icon: '🔧', content: 'Apply the concepts through real-world scenarios. The exercises here reinforce your understanding with practical examples.' },
                                { id: '4', label: 'Assessment', icon: '✅', content: 'Test your knowledge with a comprehensive review. Aim for 80% or above to demonstrate topic mastery.' },
                              ]} />
                            </div>
                         )}`;

// ============================================================
// Replace inline JSX "Folder Explorer" with real FolderExplorer component
// ============================================================
const oldFolder = `                         {previewModalOption === 'Folder Explorer' && (
                            <div className="w-full max-w-2xl">
                              <p className="text-white font-bold text-lg mb-4">Click folders to explore department policies:</p>
                              <div className="space-y-2">
                                {([
                                  {name:'📁 HR Policies', open:true, items:['Remote Work Guidelines','PTO Policy','Code of Conduct']},
                                  {name:'📁 IT Security', open:false, items:[]},
                                  {name:'📁 Finance', open:false, items:[]}
                                ] as any[]).map((folder: any) => (
                                  <div key={folder.name}>
                                    <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl flex items-center gap-3 cursor-pointer hover:border-indigo-500 transition-colors">
                                      <span className="font-bold text-white flex-1">{folder.name}</span>
                                      <span className="text-slate-500">{folder.open ? '▼' : '▶'}</span>
                                    </div>
                                    {folder.open && <div className="ml-6 mt-1 space-y-1">
                                      {folder.items.map((item: string) => <div key={item} className="p-2 text-slate-300 text-sm border-l-2 border-indigo-500/30 pl-4 hover:text-indigo-300 cursor-pointer">📄 {item}</div>)}
                                    </div>}
                                  </div>
                                ))}
                              </div>
                            </div>
                         )}`;
const newFolder = `                         {previewModalOption === 'Folder Explorer' && (
                            <div className="w-full max-w-2xl">
                              <FolderExplorer folderLabel="Department Policies" items={[
                                { id: 'f1', title: 'HR Policies', previewText: 'Human Resources', content: 'Updated remote work guidelines effective Q2.\\n\\nCore hours: 10AM - 3PM EST\\nPTO accrual: 1.5 days/month\\nAnnual carry-over: up to 5 days' },
                                { id: 'f2', title: 'IT Security', previewText: 'Technology', content: 'Password policy: Minimum 12 characters, must include uppercase, number, and symbol.\\n\\nMFA required for all corporate accounts.\\nVPN required for remote access.' },
                                { id: 'f3', title: 'Finance', previewText: 'Compliance', content: 'Expense reimbursement policy: Submit within 30 days of expense.\\n\\nRequires manager approval for amounts over $500.\\nReceipts required for all items over $25.' },
                              ]} />
                            </div>
                         )}`;

// ============================================================
// Replace inline JSX "Carousel Panel" with real CarouselPanel component
// ============================================================
const oldCarousel = `                         {previewModalOption === 'Carousel Panel' && (
                            <div className="w-full max-w-lg">
                              <div className="relative overflow-hidden rounded-2xl bg-slate-800 border border-slate-700">
                                <div className="p-8">
                                  <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest mb-2">Step 1 of 3</p>
                                  <h4 className="text-white font-bold text-xl mb-3">Discover</h4>
                                  <p className="text-slate-300 text-sm leading-relaxed">We begin by gathering requirements, understanding learner needs, and analyzing the existing content to identify key learning gaps.</p>
                                </div>
                                <div className="flex items-center justify-between px-6 pb-6">
                                  <button className="p-2 rounded-lg bg-slate-700 text-slate-400 cursor-not-allowed opacity-50">◀ Prev</button>
                                  <div className="flex gap-2">{[0,1,2].map(i => <div key={i} className={\`w-2 h-2 rounded-full \${i===0?'bg-indigo-500':'bg-slate-600'}\`} />)}</div>
                                  <button className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500">Next ▶</button>
                                </div>
                              </div>
                            </div>
                         )}`;
const newCarousel = `                         {previewModalOption === 'Carousel Panel' && (
                            <div className="w-full max-w-2xl">
                              <CarouselPanel cards={[
                                { id: 'c1', label: 'Discover', description: 'Gather requirements, understand learner needs, and analyze existing content to identify key learning gaps.', color: '#6366f1', expandedContent: 'During the discovery phase, we use surveys, interviews, and performance data to build a clear picture of what learners already know and what they need to learn.' },
                                { id: 'c2', label: 'Design', description: 'Develop the instructional design blueprint including objectives, module structure, and interaction types.', color: '#ec4899', expandedContent: 'In the design phase, we create storyboards, wireframes, and learning maps that guide the content authoring process.' },
                                { id: 'c3', label: 'Develop', description: 'Build the actual course content, interactions, assessments, and media elements.', color: '#f59e0b', expandedContent: 'Development transforms the design documents into a fully functional eLearning experience using tools like CourseGEN AI.' },
                                { id: 'c4', label: 'Deliver', description: 'Deploy the course to your LMS and roll it out to your learner audience.', color: '#10b981', expandedContent: 'During delivery, we ensure SCORM compliance, LMS compatibility, and learner access before launch.' },
                              ]} />
                            </div>
                         )}`;

// Apply all replacements
let changed = 0;
if (content.includes(oldTabsH)) { content = content.replace(oldTabsH, newTabsH); changed++; console.log('✅ Tabs Horizontal preview → real component'); }
else console.log('⚠️ Tabs Horizontal inline preview not found (may already use component)');

if (content.includes(oldTabsV)) { content = content.replace(oldTabsV, newTabsV); changed++; console.log('✅ Tabs Vertical preview → real component'); }
else console.log('⚠️ Tabs Vertical inline preview not found (may already use component)');

if (content.includes(oldFolder)) { content = content.replace(oldFolder, newFolder); changed++; console.log('✅ Folder Explorer preview → real component'); }
else console.log('⚠️ Folder Explorer inline preview not found');

if (content.includes(oldCarousel)) { content = content.replace(oldCarousel, newCarousel); changed++; console.log('✅ Carousel Panel preview → real component'); }
else console.log('⚠️ Carousel Panel inline preview not found');

fs.writeFileSync("src/App.tsx", content, "utf-8");
console.log(`\n✅ ${changed}/4 preview modal replacements applied. Size:`, content.length, "bytes");
