import React from 'react';
import { cn } from '../../lib/utils';
import type { OstSectionGroup } from '../../lib/ostSectionGroups';

/** Parent topic as a heading; only child lines are bullets. */
export function OstSectionGroupsView({
  groups,
  theme = 'light',
}: {
  groups: OstSectionGroup[];
  theme?: string;
}) {
  const light = theme === 'light';
  return (
    <div className={cn('grid gap-x-10 gap-y-8 w-full', groups.length >= 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}>
      {groups.map((g, i) => (
        <section key={`${g.heading}-${i}`} className="min-w-0">
          <h3
            className={cn(
              'text-sm font-extrabold tracking-wide mb-3',
              /[A-Za-z]/.test(g.heading) &&
                (g.heading.replace(/[^A-Z]/g, '').length / Math.max(1, g.heading.replace(/[^A-Za-z]/g, '').length)) >= 0.78
                ? 'uppercase'
                : '',
              light ? 'text-slate-800' : 'text-slate-100'
            )}
          >
            {g.heading}
          </h3>
          <ul className={cn('pl-5 space-y-2 list-disc', light ? 'text-slate-800' : 'text-slate-200')}>
            {g.bullets.map((b, j) => (
              <li key={j} className="marker:[color:var(--slide-marker,#0f172a)] leading-relaxed">
                {b}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
