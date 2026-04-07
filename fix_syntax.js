import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf8');

// The issue was `topPart` used `<div className="w-full min-h-screen...` instead of `<motion.div key="preview"`
// And it didn't open `AnimatePresence` inside `flex-1`.

// 1. Fix the top level preview container
code = code.replace(
  `{step === 'preview' && course && (\n            <div className="w-full min-h-screen bg-slate-900 absolute top-0 left-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-20 z-50 overflow-hidden flex flex-col">`,
  `{step === 'preview' && course && (\n            <motion.div key="preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full min-h-screen bg-slate-900 absolute top-0 left-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-20 z-50 overflow-hidden flex flex-col">`
);

// 2. Fix the missing AnimatePresence around the slide renderer
const originalWrapper = `                    <div className={cn("flex-1 p-6 md:p-12 pb-8 overflow-y-auto custom-scrollbar w-full text-slate-900")}>\n                       <div className="w-full space-y-6">`;

const newWrapper = `                    <div className={cn("flex-1 p-6 md:p-12 pb-8 overflow-y-auto custom-scrollbar w-full text-slate-900")}>
                       <AnimatePresence mode="wait">
                         <motion.div key={currentSlide?.id || currentSlideIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full space-y-6">`;

code = code.replace(originalWrapper, newWrapper);

fs.writeFileSync('src/App.tsx', code);
