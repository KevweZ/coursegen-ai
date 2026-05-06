import React from 'react';
import { FULL_VIEWBOX, BUST_VIEWBOX } from './casual-business';

interface SvgProps { color?: string }

// ════════════════════════════════════════════════════════════════════════════
// OUTDOOR / SPECIALIST
// ════════════════════════════════════════════════════════════════════════════

export const FarmerMale: React.FC<SvgProps> = ({ color = '#000' }) => (
  <svg viewBox={FULL_VIEWBOX} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <g fill={color}>
      {/* Wide-brim hat */}
      <rect x="14" y="16" width="72" height="5" rx="2" />
      <path d="M26 16 Q28 6 50 6 Q72 6 74 16 Z" />
      {/* Head */}
      <circle cx="50" cy="29" r="15" />
      {/* Neck */}
      <rect x="44" y="42" width="12" height="8" rx="2" />
      {/* Shirt - casual work shirt */}
      <path d="M22 51 Q36 47 44 47 L56 47 Q64 47 78 51 L80 138 L20 138 Z" />
      {/* Overalls bib */}
      <rect x="38" y="51" width="24" height="35" rx="3" fill="white" opacity="0.25" />
      {/* Left arm - holding pitchfork */}
      <path d="M22 51 L14 138 L26 140 L28 57 Z" />
      {/* Pitchfork handle */}
      <rect x="8" y="60" width="4" height="180" rx="2" />
      {/* Pitchfork tines */}
      <rect x="2" y="60" width="2.5" height="30" rx="1" />
      <rect x="6" y="58" width="2.5" height="32" rx="1" />
      <rect x="10" y="60" width="2.5" height="30" rx="1" />
      <rect x="14" y="62" width="2.5" height="28" rx="1" />
      {/* Right arm */}
      <path d="M78 51 L86 138 L74 140 L72 57 Z" />
      {/* Jeans/overalls */}
      <path d="M20 136 L18 238 L46 238 L50 172 L54 238 L82 238 L80 136 Z" />
      {/* Work boots */}
      <rect x="16" y="234" width="32" height="12" rx="3" />
      <rect x="52" y="234" width="32" height="12" rx="3" />
    </g>
  </svg>
);

export const RangerMale: React.FC<SvgProps> = ({ color = '#000' }) => (
  <svg viewBox={FULL_VIEWBOX} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <g fill={color}>
      {/* Ranger/campaign hat (wide flat brim) */}
      <rect x="12" y="17" width="76" height="5" rx="2" />
      <path d="M28 17 Q30 8 50 8 Q70 8 72 17 Z" />
      {/* Head */}
      <circle cx="50" cy="29" r="15" />
      {/* Neck */}
      <rect x="44" y="42" width="12" height="8" rx="2" />
      {/* Uniform shirt */}
      <path d="M22 51 Q36 47 44 47 L56 47 Q64 47 78 51 L80 138 L20 138 Z" />
      {/* Shirt collar/lapels */}
      <path d="M44 47 L50 62 L56 47 Z" fill="white" opacity="0.35" />
      {/* Badge */}
      <rect x="43" y="68" width="14" height="12" rx="2" fill="white" opacity="0.35" />
      {/* Utility belt */}
      <rect x="20" y="130" width="60" height="9" rx="2" />
      {/* Arms */}
      <path d="M22 51 L14 132 L26 134 L28 57 Z" />
      <path d="M78 51 L86 132 L74 134 L72 57 Z" />
      {/* Trousers */}
      <path d="M20 138 L18 238 L46 238 L50 172 L54 238 L82 238 L80 138 Z" />
      {/* Boots */}
      <rect x="16" y="234" width="32" height="12" rx="3" />
      <rect x="52" y="234" width="32" height="12" rx="3" />
    </g>
  </svg>
);

// ════════════════════════════════════════════════════════════════════════════
// HALF-BODY BUSTS (viewBox 0 0 100 130)
// ════════════════════════════════════════════════════════════════════════════

export const BustMale: React.FC<SvgProps> = ({ color = '#000' }) => (
  <svg viewBox={BUST_VIEWBOX} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <g fill={color}>
      {/* Head - bald/short */}
      <circle cx="50" cy="32" r="22" />
      {/* Neck */}
      <rect x="42" y="52" width="16" height="10" rx="3" />
      {/* Shoulders + upper body */}
      <path d="M2 70 Q20 60 42 60 L58 60 Q80 60 98 70 L100 130 L0 130 Z" />
    </g>
  </svg>
);

export const BustFemaleLong: React.FC<SvgProps> = ({ color = '#000' }) => (
  <svg viewBox={BUST_VIEWBOX} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <g fill={color}>
      {/* Long hair (behind head) */}
      <path d="M28 22 Q18 50 20 100 L30 100 Q28 60 34 24 Z" />
      <path d="M72 22 Q82 50 80 100 L70 100 Q72 60 66 24 Z" />
      {/* Head */}
      <circle cx="50" cy="32" r="20" />
      {/* Neck */}
      <rect x="43" y="50" width="14" height="10" rx="3" />
      {/* Shoulders + upper body */}
      <path d="M6 68 Q24 60 43 60 L57 60 Q76 60 94 68 L96 130 L4 130 Z" />
    </g>
  </svg>
);

export const BustFemaleBob: React.FC<SvgProps> = ({ color = '#000' }) => (
  <svg viewBox={BUST_VIEWBOX} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <g fill={color}>
      {/* Bob hair */}
      <path d="M30 14 Q26 16 26 34 Q28 52 34 56 L36 52 Q32 46 32 32 Q32 18 36 16 Z" />
      <path d="M70 14 Q74 16 74 34 Q72 52 66 56 L64 52 Q68 46 68 32 Q68 18 64 16 Z" />
      {/* Top of hair */}
      <path d="M30 14 Q34 6 50 6 Q66 6 70 14 Q66 10 50 10 Q34 10 30 14 Z" />
      {/* Head */}
      <circle cx="50" cy="30" r="20" />
      {/* Neck */}
      <rect x="43" y="48" width="14" height="10" rx="3" />
      {/* Shoulders */}
      <path d="M6 66 Q24 58 43 58 L57 58 Q76 58 94 66 L96 130 L4 130 Z" />
    </g>
  </svg>
);

export const BustFemaleAfro: React.FC<SvgProps> = ({ color = '#000' }) => (
  <svg viewBox={BUST_VIEWBOX} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <g fill={color}>
      {/* Large afro */}
      <ellipse cx="50" cy="22" rx="30" ry="28" />
      {/* Head */}
      <circle cx="50" cy="32" r="20" />
      {/* Neck */}
      <rect x="43" y="50" width="14" height="10" rx="3" />
      {/* Shoulders */}
      <path d="M6 68 Q24 60 43 60 L57 60 Q76 60 94 68 L96 130 L4 130 Z" />
    </g>
  </svg>
);
