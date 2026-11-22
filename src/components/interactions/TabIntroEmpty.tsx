import React from 'react';
import { MousePointerClick } from 'lucide-react';

/** Occupies the Instruction / process well when no topic is selected yet. */
export function TabIntroEmpty({
  theme = 'light',
  prompt = 'Select a topic to continue',
  hint = 'Open a tab to view this section',
}: {
  theme?: string;
  prompt?: string;
  hint?: string;
}) {
  const isLight = theme === 'light';
  return (
    <div className="flex flex-col items-center justify-center min-h-[16rem] h-full text-center px-8 py-10">
      <div
        className="w-16 h-16 rounded-2xl mb-5 flex items-center justify-center"
        style={{ background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)' }}
      >
        <MousePointerClick className="w-8 h-8" style={{ color: isLight ? '#64748b' : '#94a3b8' }} />
      </div>
      <p className="text-xl font-extrabold leading-snug" style={{ color: isLight ? '#0f172a' : '#f8fafc' }}>
        {prompt}
      </p>
      <p className="mt-2 text-base leading-relaxed" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
        {hint}
      </p>
    </div>
  );
}

export default TabIntroEmpty;
