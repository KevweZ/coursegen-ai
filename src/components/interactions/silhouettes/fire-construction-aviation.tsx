import React from 'react';
import { FULL_VIEWBOX } from './casual-business';

interface SvgProps { color?: string }

// ════════════════════════════════════════════════════════════════════════════
// FIRE & RESCUE
// ════════════════════════════════════════════════════════════════════════════

export const FirefighterMale: React.FC<SvgProps> = ({ color = '#000' }) => (
  <svg viewBox={FULL_VIEWBOX} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <g fill={color}>
      {/* Helmet dome */}
      <path d="M26 22 Q28 6 50 6 Q72 6 74 22 L76 26 L24 26 Z" />
      {/* Helmet brim */}
      <rect x="20" y="24" width="60" height="5" rx="2" />
      {/* Head */}
      <circle cx="50" cy="32" r="15" />
      {/* Neck */}
      <rect x="44" y="45" width="12" height="8" rx="2" />
      {/* Firefighter gear - bulky jacket */}
      <path d="M12 55 Q32 48 44 48 L56 48 Q68 48 88 55 L90 148 L10 148 Z" />
      {/* Reflective stripe 1 */}
      <rect x="10" y="100" width="80" height="5" rx="1" fill="white" opacity="0.35" />
      {/* Reflective stripe 2 */}
      <rect x="10" y="115" width="80" height="5" rx="1" fill="white" opacity="0.35" />
      {/* Left arm - bulky */}
      <path d="M12 55 L4 148 L20 150 L22 62 Z" />
      {/* Right arm - bulky */}
      <path d="M88 55 L96 148 L80 150 L78 62 Z" />
      {/* Left arm reflective stripe */}
      <rect x="4" y="110" width="18" height="4" rx="1" fill="white" opacity="0.35" />
      {/* Right arm reflective stripe */}
      <rect x="78" y="110" width="18" height="4" rx="1" fill="white" opacity="0.35" />
      {/* Turnout pants */}
      <path d="M10 146 L8 230 L44 230 L50 170 L56 230 L92 230 L90 146 Z" />
      {/* Pant reflective stripes */}
      <rect x="8" y="190" width="36" height="4" rx="1" fill="white" opacity="0.35" />
      <rect x="56" y="190" width="36" height="4" rx="1" fill="white" opacity="0.35" />
      {/* Boots (blocky) */}
      <rect x="8" y="228" width="38" height="16" rx="3" />
      <rect x="54" y="228" width="38" height="16" rx="3" />
    </g>
  </svg>
);

export const FirefighterFemale: React.FC<SvgProps> = ({ color = '#000' }) => (
  <svg viewBox={FULL_VIEWBOX} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <g fill={color}>
      {/* Helmet */}
      <path d="M28 22 Q30 7 50 7 Q70 7 72 22 L74 26 L26 26 Z" />
      <rect x="22" y="24" width="56" height="5" rx="2" />
      {/* Head */}
      <circle cx="50" cy="32" r="15" />
      {/* Neck */}
      <rect x="45" y="45" width="10" height="8" rx="2" />
      {/* Gear jacket */}
      <path d="M16 54 Q34 48 45 48 L55 48 Q66 48 84 54 L86 148 L14 148 Z" />
      {/* Reflective stripes */}
      <rect x="14" y="100" width="72" height="5" rx="1" fill="white" opacity="0.35" />
      <rect x="14" y="115" width="72" height="5" rx="1" fill="white" opacity="0.35" />
      {/* Arms */}
      <path d="M16 54 L8 148 L24 150 L26 60 Z" />
      <path d="M84 54 L92 148 L76 150 L74 60 Z" />
      {/* Arm stripes */}
      <rect x="8" y="110" width="18" height="4" rx="1" fill="white" opacity="0.35" />
      <rect x="74" y="110" width="18" height="4" rx="1" fill="white" opacity="0.35" />
      {/* Pants */}
      <path d="M14 146 L12 230 L44 230 L50 170 L56 230 L88 230 L86 146 Z" />
      <rect x="12" y="190" width="32" height="4" rx="1" fill="white" opacity="0.35" />
      <rect x="56" y="190" width="32" height="4" rx="1" fill="white" opacity="0.35" />
      {/* Boots */}
      <rect x="12" y="228" width="34" height="16" rx="3" />
      <rect x="54" y="228" width="34" height="16" rx="3" />
    </g>
  </svg>
);

export const EmtFemale: React.FC<SvgProps> = ({ color = '#000' }) => (
  <svg viewBox={FULL_VIEWBOX} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <g fill={color}>
      {/* Hair ponytail */}
      <path d="M34 18 Q32 28 34 38 L38 36 Q36 26 38 18 Z" />
      <path d="M62 20 Q70 30 68 50 L64 46 Q66 30 60 20 Z" />
      {/* Head */}
      <circle cx="50" cy="27" r="16" />
      {/* Uniform cap */}
      <rect x="32" y="13" width="36" height="5" rx="2" />
      <rect x="34" y="10" width="32" height="5" rx="2" />
      {/* Neck */}
      <rect x="45" y="41" width="10" height="9" rx="2" />
      {/* EMT uniform shirt */}
      <path d="M24 50 Q38 47 45 47 L55 47 Q62 47 76 50 L78 138 L22 138 Z" />
      {/* Star of life / medical cross */}
      <rect x="44" y="72" width="12" height="3" rx="1" fill="white" opacity="0.55" />
      <rect x="47.5" y="69" width="3" height="9" rx="1" fill="white" opacity="0.55" />
      {/* Utility belt */}
      <rect x="22" y="130" width="56" height="9" rx="2" />
      {/* Arms */}
      <path d="M24 50 L16 130 L28 132 L32 56 Z" />
      <path d="M76 50 L84 130 L72 132 L68 56 Z" />
      {/* Trousers */}
      <path d="M22 138 L20 238 L46 238 L50 175 L54 238 L80 238 L78 138 Z" />
      {/* Shoes */}
      <ellipse cx="33" cy="241" rx="14" ry="6" />
      <ellipse cx="67" cy="241" rx="14" ry="6" />
    </g>
  </svg>
);

// ════════════════════════════════════════════════════════════════════════════
// CONSTRUCTION
// ════════════════════════════════════════════════════════════════════════════

export const ConstructionMale: React.FC<SvgProps> = ({ color = '#000' }) => (
  <svg viewBox={FULL_VIEWBOX} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <g fill={color}>
      {/* Hard hat dome */}
      <path d="M28 18 Q30 5 50 5 Q70 5 72 18 L74 22 L26 22 Z" />
      {/* Hard hat brim */}
      <rect x="22" y="20" width="56" height="5" rx="2" />
      {/* Head */}
      <circle cx="50" cy="31" r="15" />
      {/* Neck */}
      <rect x="44" y="44" width="12" height="9" rx="2" />
      {/* High-vis safety vest over shirt */}
      <path d="M20 53 Q36 48 44 48 L56 48 Q64 48 80 53 L82 138 L18 138 Z" />
      {/* Vest colour shoulder panels */}
      <path d="M20 53 L26 90 L38 90 L38 53 Z" fill="white" opacity="0.3" />
      <path d="M80 53 L74 90 L62 90 L62 53 Z" fill="white" opacity="0.3" />
      {/* Reflective stripes across chest */}
      <rect x="18" y="95" width="64" height="5" rx="1" fill="white" opacity="0.4" />
      <rect x="18" y="110" width="64" height="5" rx="1" fill="white" opacity="0.4" />
      {/* Arms */}
      <path d="M20 53 L12 138 L26 140 L28 60 Z" />
      <path d="M80 53 L88 138 L74 140 L72 60 Z" />
      {/* Work trousers */}
      <path d="M18 136 L16 238 L46 238 L50 172 L54 238 L84 238 L82 136 Z" />
      {/* Work boots */}
      <rect x="14" y="234" width="34" height="12" rx="3" />
      <rect x="52" y="234" width="34" height="12" rx="3" />
    </g>
  </svg>
);

// ════════════════════════════════════════════════════════════════════════════
// AVIATION
// ════════════════════════════════════════════════════════════════════════════

export const PilotMale: React.FC<SvgProps> = ({ color = '#000' }) => (
  <svg viewBox={FULL_VIEWBOX} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <g fill={color}>
      {/* Captain peaked cap */}
      <rect x="28" y="12" width="44" height="5" rx="2" />
      <path d="M32 12 Q34 4 50 4 Q66 4 68 12 Z" />
      {/* Cap badge area */}
      <rect x="44" y="6" width="12" height="6" rx="1" fill="white" opacity="0.4" />
      {/* Head */}
      <circle cx="50" cy="28" r="16" />
      {/* Neck */}
      <rect x="44" y="42" width="12" height="8" rx="2" />
      {/* Uniform jacket */}
      <path d="M18 51 Q34 47 44 47 L56 47 Q66 47 82 51 L84 140 L16 140 Z" />
      {/* Lapels + tie */}
      <path d="M44 47 L50 68 L56 47 Z" fill="white" opacity="0.4" />
      <path d="M48 48 L46 88 L50 94 L54 88 L52 48 Z" fill="white" opacity="0.3" />
      {/* Epaulettes left */}
      <rect x="14" y="50" width="18" height="6" rx="2" fill="white" opacity="0.4" />
      <rect x="16" y="52" width="14" height="2" fill="white" opacity="0.6" />
      {/* Epaulettes right */}
      <rect x="68" y="50" width="18" height="6" rx="2" fill="white" opacity="0.4" />
      <rect x="70" y="52" width="14" height="2" fill="white" opacity="0.6" />
      {/* Arms */}
      <path d="M18 51 L12 140 L26 142 L28 57 Z" />
      <path d="M82 51 L88 140 L74 142 L72 57 Z" />
      {/* Sleeve stripes */}
      <rect x="12" y="118" width="16" height="3" rx="1" fill="white" opacity="0.5" />
      <rect x="12" y="123" width="16" height="3" rx="1" fill="white" opacity="0.5" />
      <rect x="72" y="118" width="16" height="3" rx="1" fill="white" opacity="0.5" />
      <rect x="72" y="123" width="16" height="3" rx="1" fill="white" opacity="0.5" />
      {/* Trousers */}
      <path d="M16 138 L14 238 L46 238 L50 172 L54 238 L86 238 L84 138 Z" />
      {/* Shoes */}
      <ellipse cx="30" cy="241" rx="17" ry="6" />
      <ellipse cx="70" cy="241" rx="17" ry="6" />
    </g>
  </svg>
);

export const FlightAttendantFemale: React.FC<SvgProps> = ({ color = '#000' }) => (
  <svg viewBox={FULL_VIEWBOX} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <g fill={color}>
      {/* Bun/updo hair */}
      <circle cx="50" cy="14" r="9" />
      <rect x="44" y="14" width="12" height="10" rx="3" />
      {/* Head */}
      <circle cx="50" cy="28" r="16" />
      {/* Neck */}
      <rect x="45" y="42" width="10" height="8" rx="2" />
      {/* Uniform jacket */}
      <path d="M24 50 Q38 47 45 47 L55 47 Q62 47 76 50 L78 135 L22 135 Z" />
      {/* Lapels */}
      <path d="M45 47 L50 68 L55 47 Z" fill="white" opacity="0.4" />
      {/* Scarf / neckerchief at collar */}
      <path d="M42 47 Q50 60 58 47 Q54 52 50 58 Q46 52 42 47 Z" fill="white" opacity="0.5" />
      {/* Arms */}
      <path d="M24 50 L16 132 L28 134 L32 56 Z" />
      <path d="M76 50 L84 132 L72 134 L68 56 Z" />
      {/* Pencil skirt */}
      <path d="M22 133 L20 200 L80 200 L78 133 Z" />
      {/* Legs */}
      <path d="M20 200 L22 238 L44 238 L46 200 Z" />
      <path d="M54 200 L56 238 L78 238 L80 200 Z" />
      {/* Heels */}
      <ellipse cx="33" cy="241" rx="13" ry="6" />
      <rect x="30" y="237" width="4" height="9" rx="1" />
      <ellipse cx="67" cy="241" rx="13" ry="6" />
      <rect x="66" y="237" width="4" height="9" rx="1" />
    </g>
  </svg>
);
