import React from 'react';
import { ArrowRight, Zap } from 'lucide-react';

export function LegalPageShell({
  title,
  updated,
  children,
  onBack,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white">
      <nav className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-bold transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-180" /> Back to Home
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-500/15 rounded-lg flex items-center justify-center border border-indigo-500/20">
              <Zap className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="font-extrabold text-lg text-white hidden sm:inline">
              NexCourse <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI</span>
            </span>
          </div>
        </div>
      </nav>
      <article className="max-w-3xl mx-auto px-6 py-12 pb-24">
        <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-3">Legal</p>
        <h1 className="text-3xl md:text-4xl font-black mb-2">{title}</h1>
        <p className="text-slate-500 text-sm mb-10">Last updated {updated}</p>
        <div className="space-y-8 text-slate-300 text-sm leading-relaxed [&_h2]:text-white [&_h2]:font-bold [&_h2]:text-lg [&_h2]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-indigo-400 [&_a]:hover:text-indigo-300">
          {children}
        </div>
      </article>
    </div>
  );
}
