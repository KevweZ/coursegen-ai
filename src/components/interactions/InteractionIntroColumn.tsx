import React from 'react';
import { PROCESS_PANEL_DEFAULT } from '../../lib/tabAccents';

interface Props {
  html?: string;
  cta?: string;
  theme?: 'light' | 'dark' | 'unified';
}

/** Left-rail intro used by click-reveal, process, and vertical tabs. */
export default function InteractionIntroColumn({
  html,
  cta = 'Select each term to continue →',
  theme = 'light',
}: Props) {
  const isLight = theme === 'light';
  const ink = isLight ? '#0f172a' : '#f8fafc';
  const muted = isLight ? '#334155' : '#cbd5e1';
  const panel = isLight ? PROCESS_PANEL_DEFAULT : '#0f172a';

  return (
    <aside
      className="w-[36%] max-w-[400px] min-w-[240px] shrink-0 rounded-2xl overflow-hidden"
      style={{ background: panel }}
    >
      <div className="box-border h-full p-6 sm:p-7 text-left overflow-y-auto custom-scrollbar">
        <p
          className="text-sm font-bold uppercase tracking-[0.18em] mb-2"
          style={{ color: ink }}
        >
          Overview
        </p>
        <h3 className="font-extrabold text-lg mb-4" style={{ color: ink }}>
          Introduction
        </h3>
        {html ? (
          <div
            className="text-sm leading-relaxed w-full tab-ost-body"
            style={{ color: muted }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : null}
        <p className="mt-6 text-xs font-semibold" style={{ color: muted }}>
          {cta}
        </p>
      </div>
    </aside>
  );
}
