import React from 'react';
import { FULL_VIEWBOX } from './casual-business';

interface SvgProps { color?: string }

// ════════════════════════════════════════════════════════════════════════════
// MEDICAL
// ════════════════════════════════════════════════════════════════════════════

export const DoctorMale: React.FC<SvgProps> = ({ color = '#000' }) => (
  <svg viewBox={FULL_VIEWBOX} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <g fill={color}>
      {/* Head */}
      <circle cx="50" cy="27" r="17" />
      {/* Neck */}
      <rect x="44" y="42" width="12" height="9" rx="2" />
      {/* Lab coat - longer, knee length */}
      <path d="M18 52 Q34 47 44 47 L56 47 Q66 47 82 52 L84 185 L16 185 Z" />
      {/* Coat lapels */}
      <path d="M44 47 L50 75 L56 47 Z" fill="white" opacity="0.55" />
      {/* Stethoscope loop */}
      <path d="M42 55 Q34 70 36 85 Q38 95 50 95 Q62 95 64 85 Q66 70 58 55" fill="none" stroke="white" strokeWidth="2.5" opacity="0.5" />
      {/* Left arm */}
      <path d="M18 52 L12 155 L26 157 L28 58 Z" />
      {/* Right arm */}
      <path d="M82 52 L88 155 L74 157 L72 58 Z" />
      {/* Scrubs/trousers visible below coat */}
      <path d="M16 183 L14 238 L46 238 L50 205 L54 238 L86 238 L84 183 Z" />
      {/* Shoes */}
      <ellipse cx="30" cy="241" rx="17" ry="6" />
      <ellipse cx="70" cy="241" rx="17" ry="6" />
    </g>
  </svg>
);

export const DoctorFemale: React.FC<SvgProps> = ({ color = '#000' }) => (
  <svg viewBox={FULL_VIEWBOX} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <g fill={color}>
      {/* Hair behind */}
      <path d="M34 18 Q28 55 30 100 L36 100 Q34 58 38 22 Z" />
      <path d="M66 18 Q72 55 70 100 L64 100 Q66 58 62 22 Z" />
      {/* Head */}
      <circle cx="50" cy="27" r="16" />
      {/* Neck */}
      <rect x="45" y="41" width="10" height="9" rx="2" />
      {/* Lab coat */}
      <path d="M22 50 Q38 46 45 46 L55 46 Q62 46 78 50 L80 185 L20 185 Z" />
      {/* Coat lapels */}
      <path d="M45 46 L50 72 L55 46 Z" fill="white" opacity="0.55" />
      {/* Stethoscope */}
      <path d="M44 55 Q36 72 38 86 Q40 96 50 96 Q60 96 62 86 Q64 72 56 55" fill="none" stroke="white" strokeWidth="2" opacity="0.5" />
      {/* Left arm with clipboard */}
      <path d="M22 50 L14 155 L28 157 L30 56 Z" />
      {/* Clipboard */}
      <rect x="8" y="110" width="18" height="24" rx="2" fill={color} stroke="white" strokeWidth="1.5" opacity="0.7" />
      {/* Right arm */}
      <path d="M78 50 L86 155 L72 157 L70 56 Z" />
      {/* Legs */}
      <path d="M20 183 L18 238 L46 238 L50 205 L54 238 L82 238 L80 183 Z" />
      {/* Shoes */}
      <ellipse cx="32" cy="241" rx="15" ry="6" />
      <ellipse cx="68" cy="241" rx="15" ry="6" />
      <rect x="64" y="237" width="4" height="8" rx="1" />
    </g>
  </svg>
);

export const NurseMale: React.FC<SvgProps> = ({ color = '#000' }) => (
  <svg viewBox={FULL_VIEWBOX} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <g fill={color}>
      {/* Head */}
      <circle cx="50" cy="27" r="17" />
      {/* Neck */}
      <rect x="44" y="42" width="12" height="9" rx="2" />
      {/* Scrubs top - v-neck */}
      <path d="M20 52 Q36 47 44 47 L56 47 Q64 47 80 52 L80 138 L20 138 Z" />
      {/* V-neck */}
      <path d="M44 47 L50 68 L56 47 Z" fill="white" opacity="0.45" />
      {/* Medical cross on chest */}
      <rect x="46" y="78" width="8" height="2.5" rx="1" fill="white" opacity="0.6" />
      <rect x="48.5" y="75.5" width="2.5" height="7.5" rx="1" fill="white" opacity="0.6" />
      {/* Vest stripes */}
      <rect x="20" y="95" width="60" height="4" rx="1" fill="white" opacity="0.25" />
      {/* Left arm */}
      <path d="M20 52 L14 130 L26 132 L28 58 Z" />
      {/* Right arm */}
      <path d="M80 52 L86 130 L74 132 L72 58 Z" />
      {/* Scrubs pants */}
      <path d="M20 136 L18 238 L46 238 L50 170 L54 238 L82 238 L80 136 Z" />
      {/* Shoes */}
      <ellipse cx="32" cy="241" rx="15" ry="6" />
      <ellipse cx="68" cy="241" rx="15" ry="6" />
    </g>
  </svg>
);

// ════════════════════════════════════════════════════════════════════════════
// POLICE
// ════════════════════════════════════════════════════════════════════════════

export const PoliceMale: React.FC<SvgProps> = ({ color = '#000' }) => (
  <svg viewBox={FULL_VIEWBOX} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <g fill={color}>
      {/* Peaked cap brim */}
      <rect x="28" y="12" width="44" height="5" rx="2" />
      {/* Peaked cap dome */}
      <ellipse cx="50" cy="12" rx="22" ry="10" />
      {/* Cap band */}
      <rect x="30" y="16" width="40" height="3" fill="white" opacity="0.3" />
      {/* Head */}
      <circle cx="50" cy="28" r="16" />
      {/* Neck */}
      <rect x="44" y="42" width="12" height="8" rx="2" />
      {/* Uniform shirt */}
      <path d="M18 50 Q34 47 44 47 L56 47 Q66 47 82 50 L84 140 L16 140 Z" />
      {/* Collar/tie */}
      <path d="M44 47 L50 62 L56 47 Z" fill="white" opacity="0.4" />
      {/* Badge */}
      <rect x="44" y="70" width="12" height="10" rx="1" fill="white" opacity="0.4" />
      {/* Utility belt */}
      <rect x="16" y="132" width="68" height="10" rx="2" />
      {/* Belt items */}
      <rect x="22" y="134" width="8" height="6" rx="1" fill="white" opacity="0.3" />
      <rect x="70" y="134" width="8" height="6" rx="1" fill="white" opacity="0.3" />
      {/* Arms - crossed */}
      <path d="M18 50 L10 110 L48 122 L50 114 L24 106 L22 56 Z" />
      <path d="M82 50 L90 110 L52 122 L50 114 L76 106 L78 56 Z" />
      {/* Trousers */}
      <path d="M16 140 L14 238 L46 238 L50 175 L54 238 L86 238 L84 140 Z" />
      {/* Shoes */}
      <ellipse cx="30" cy="241" rx="17" ry="6" />
      <ellipse cx="70" cy="241" rx="17" ry="6" />
    </g>
  </svg>
);

export const PoliceFemale: React.FC<SvgProps> = ({ color = '#000' }) => (
  <svg viewBox={FULL_VIEWBOX} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <g fill={color}>
      {/* Peaked cap */}
      <rect x="30" y="12" width="40" height="5" rx="2" />
      <ellipse cx="50" cy="12" rx="20" ry="9" />
      {/* Head */}
      <circle cx="50" cy="28" r="16" />
      {/* Hair sides */}
      <path d="M34 28 Q32 44 34 48 L38 46 Q36 40 38 28 Z" />
      <path d="M66 28 Q68 44 66 48 L62 46 Q64 40 62 28 Z" />
      {/* Neck */}
      <rect x="45" y="42" width="10" height="8" rx="2" />
      {/* Uniform */}
      <path d="M24 50 Q38 47 45 47 L55 47 Q62 47 76 50 L78 138 L22 138 Z" />
      {/* Badge */}
      <rect x="44" y="68" width="12" height="10" rx="1" fill="white" opacity="0.4" />
      {/* Utility belt */}
      <rect x="22" y="130" width="56" height="10" rx="2" />
      {/* Left arm */}
      <path d="M24 50 L16 130 L28 132 L32 56 Z" />
      {/* Right arm */}
      <path d="M76 50 L84 130 L72 132 L68 56 Z" />
      {/* Trousers */}
      <path d="M22 138 L20 238 L46 238 L50 175 L54 238 L80 238 L78 138 Z" />
      {/* Shoes */}
      <ellipse cx="33" cy="241" rx="14" ry="6" />
      <ellipse cx="67" cy="241" rx="14" ry="6" />
    </g>
  </svg>
);
