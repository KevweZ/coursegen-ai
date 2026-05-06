import React from 'react';

interface SvgProps { color?: string }

// ── Shared viewBox constants ─────────────────────────────────────────────────
export const FULL_VIEWBOX  = '0 0 100 260';
export const BUST_VIEWBOX  = '0 0 100 130';

// ════════════════════════════════════════════════════════════════════════════
// CASUAL
// ════════════════════════════════════════════════════════════════════════════

export const CasualMale: React.FC<SvgProps> = ({ color = '#000' }) => (
  <svg viewBox={FULL_VIEWBOX} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <g fill={color}>
      {/* Head */}
      <circle cx="50" cy="27" r="17" />
      {/* Neck */}
      <rect x="44" y="42" width="12" height="10" rx="2" />
      {/* T-shirt body */}
      <path d="M20 52 Q36 47 44 47 L56 47 Q64 47 80 52 L82 130 L18 130 Z" />
      {/* Left sleeve */}
      <path d="M20 52 L10 80 L20 82 L26 60 Z" />
      {/* Right sleeve */}
      <path d="M80 52 L90 80 L80 82 L74 60 Z" />
      {/* Left arm lower */}
      <path d="M10 80 L12 130 L22 130 L20 82 Z" />
      {/* Right arm lower */}
      <path d="M90 80 L88 130 L78 130 L80 82 Z" />
      {/* Jeans waistband */}
      <rect x="18" y="128" width="64" height="14" rx="2" />
      {/* Left leg */}
      <path d="M18 140 L16 238 L46 238 L48 140 Z" />
      {/* Right leg */}
      <path d="M52 140 L54 238 L84 238 L82 140 Z" />
      {/* Left shoe */}
      <ellipse cx="31" cy="241" rx="16" ry="6" />
      {/* Right shoe */}
      <ellipse cx="69" cy="241" rx="16" ry="6" />
    </g>
  </svg>
);

export const CasualFemale: React.FC<SvgProps> = ({ color = '#000' }) => (
  <svg viewBox={FULL_VIEWBOX} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <g fill={color}>
      {/* Long hair behind */}
      <path d="M32 18 Q26 50 28 90 L34 90 Q33 55 36 22 Z" />
      <path d="M68 18 Q74 50 72 90 L66 90 Q67 55 64 22 Z" />
      {/* Head */}
      <circle cx="50" cy="27" r="16" />
      {/* Neck */}
      <rect x="45" y="41" width="10" height="9" rx="2" />
      {/* Top/blouse */}
      <path d="M28 50 Q40 46 45 46 L55 46 Q60 46 72 50 L74 120 L26 120 Z" />
      {/* Left arm */}
      <path d="M28 50 L18 110 L26 112 L32 58 Z" />
      {/* Right arm */}
      <path d="M72 50 L82 110 L74 112 L68 58 Z" />
      {/* Pants (slim fit) */}
      <path d="M26 118 L24 238 L48 238 L50 150 L52 238 L76 238 L74 118 Z" />
      {/* Left shoe */}
      <ellipse cx="36" cy="241" rx="13" ry="6" />
      {/* Right shoe - slight heel */}
      <ellipse cx="64" cy="241" rx="13" ry="6" />
      <rect x="60" y="237" width="4" height="8" rx="1" />
    </g>
  </svg>
);

export const CasualMaleAfro: React.FC<SvgProps> = ({ color = '#000' }) => (
  <svg viewBox={FULL_VIEWBOX} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <g fill={color}>
      {/* Afro hair */}
      <ellipse cx="50" cy="20" rx="24" ry="22" />
      {/* Head */}
      <circle cx="50" cy="27" r="16" />
      {/* Neck */}
      <rect x="44" y="42" width="12" height="9" rx="2" />
      {/* T-shirt - arms crossed pose */}
      <path d="M22 52 Q36 47 44 47 L56 47 Q64 47 78 52 L80 130 L20 130 Z" />
      {/* Arms crossed */}
      <path d="M20 52 L14 76 L48 88 L50 80 L28 72 L26 54 Z" />
      <path d="M80 52 L86 76 L52 88 L50 80 L72 72 L74 54 Z" />
      {/* Jeans */}
      <rect x="20" y="128" width="60" height="13" rx="2" />
      <path d="M20 139 L18 238 L47 238 L50 155 L53 238 L82 238 L80 139 Z" />
      {/* Shoes */}
      <ellipse cx="33" cy="241" rx="16" ry="6" />
      <ellipse cx="67" cy="241" rx="16" ry="6" />
    </g>
  </svg>
);

export const CasualFemaleAfro: React.FC<SvgProps> = ({ color = '#000' }) => (
  <svg viewBox={FULL_VIEWBOX} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <g fill={color}>
      {/* Afro hair - large rounded */}
      <ellipse cx="50" cy="18" rx="26" ry="24" />
      {/* Head */}
      <circle cx="50" cy="28" r="16" />
      {/* Neck */}
      <rect x="45" y="42" width="10" height="8" rx="2" />
      {/* Top */}
      <path d="M28 50 Q40 46 45 46 L55 46 Q60 46 72 50 L74 122 L26 122 Z" />
      {/* Left arm - hand on hip */}
      <path d="M28 50 L16 95 L24 100 L18 108 L28 110 L36 60 Z" />
      {/* Right arm - hand on hip */}
      <path d="M72 50 L84 95 L76 100 L82 108 L72 110 L64 60 Z" />
      {/* Wide leg pants */}
      <path d="M24 120 L20 238 L48 238 L50 155 L52 238 L80 238 L76 120 Z" />
      {/* Shoes */}
      <ellipse cx="34" cy="241" rx="15" ry="6" />
      <ellipse cx="66" cy="241" rx="15" ry="6" />
      <rect x="62" y="237" width="4" height="8" rx="1" />
    </g>
  </svg>
);

// ════════════════════════════════════════════════════════════════════════════
// BUSINESS
// ════════════════════════════════════════════════════════════════════════════

export const BusinessMale: React.FC<SvgProps> = ({ color = '#000' }) => (
  <svg viewBox={FULL_VIEWBOX} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <g fill={color}>
      {/* Head */}
      <circle cx="50" cy="27" r="17" />
      {/* Neck */}
      <rect x="45" y="42" width="10" height="9" rx="2" />
      {/* Suit jacket body */}
      <path d="M16 52 Q34 46 44 47 L56 47 Q66 46 84 52 L86 138 L14 138 Z" />
      {/* Lapels (suit V) */}
      <path d="M44 47 L50 70 L56 47 L52 47 L50 62 L48 47 Z" fill="white" opacity="0.6" />
      {/* Tie */}
      <path d="M48 47 L46 90 L50 96 L54 90 L52 47 Z" fill="white" opacity="0.4" />
      {/* Left arm */}
      <path d="M16 52 L10 138 L24 138 L26 58 Z" />
      {/* Right arm */}
      <path d="M84 52 L90 138 L76 138 L74 58 Z" />
      {/* Trousers */}
      <path d="M14 136 L12 238 L46 238 L50 160 L54 238 L88 238 L86 136 Z" />
      {/* Left shoe */}
      <ellipse cx="29" cy="241" rx="18" ry="6" />
      {/* Right shoe */}
      <ellipse cx="71" cy="241" rx="18" ry="6" />
    </g>
  </svg>
);

export const BusinessFemale: React.FC<SvgProps> = ({ color = '#000' }) => (
  <svg viewBox={FULL_VIEWBOX} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <g fill={color}>
      {/* Hair - swept back */}
      <path d="M34 16 Q32 10 50 10 Q68 10 66 16 Q72 20 70 34 L66 32 Q66 18 50 18 Q34 18 34 32 L30 34 Z" />
      {/* Head */}
      <circle cx="50" cy="27" r="16" />
      {/* Neck */}
      <rect x="45" y="41" width="10" height="9" rx="2" />
      {/* Blazer */}
      <path d="M24 50 Q38 46 45 47 L55 47 Q62 46 76 50 L78 130 L22 130 Z" />
      {/* Lapels */}
      <path d="M45 47 L50 68 L55 47 L52 47 L50 60 L48 47 Z" fill="white" opacity="0.6" />
      {/* Left arm */}
      <path d="M24 50 L16 128 L28 130 L32 56 Z" />
      {/* Right arm */}
      <path d="M76 50 L84 128 L72 130 L68 56 Z" />
      {/* Skirt / pencil skirt */}
      <path d="M22 128 L20 190 L80 190 L78 128 Z" />
      {/* Legs */}
      <path d="M20 190 L22 238 L44 238 L46 190 Z" />
      <path d="M54 190 L56 238 L78 238 L80 190 Z" />
      {/* Heels */}
      <ellipse cx="33" cy="241" rx="13" ry="6" />
      <rect x="30" y="237" width="4" height="9" rx="1" />
      <ellipse cx="67" cy="241" rx="13" ry="6" />
      <rect x="66" y="237" width="4" height="9" rx="1" />
    </g>
  </svg>
);
