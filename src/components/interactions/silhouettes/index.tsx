/**
 * Silhouette Library — Main Entry Point
 *
 * Usage:
 *   import { SilhouetteCharacter } from '.../silhouettes';
 *   <SilhouetteCharacter id="doctor-female" color="#ffffff" />
 *
 * To get the correct viewBox size for layout calculations:
 *   import { getSilhouetteViewBox } from '.../silhouettes';
 */

import React from 'react';
import { SilhouetteId, SILHOUETTE_REGISTRY } from './types';
import {
  CasualMale, CasualFemale, CasualMaleAfro, CasualFemaleAfro,
  BusinessMale, BusinessFemale,
  FULL_VIEWBOX, BUST_VIEWBOX,
} from './casual-business';
import {
  DoctorMale, DoctorFemale, NurseMale,
  PoliceMale, PoliceFemale,
} from './medical-police';
import {
  FirefighterMale, FirefighterFemale, EmtFemale,
  ConstructionMale,
  PilotMale, FlightAttendantFemale,
} from './fire-construction-aviation';
import {
  FarmerMale, RangerMale,
  BustMale, BustFemaleLong, BustFemaleBob, BustFemaleAfro,
} from './outdoor-busts';

export * from './types';
export { FULL_VIEWBOX, BUST_VIEWBOX };

// ── Component map ────────────────────────────────────────────────────────────
type SilhouetteFn = React.FC<{ color?: string }>;

const SILHOUETTE_MAP: Record<SilhouetteId, SilhouetteFn> = {
  'casual-male':             CasualMale,
  'casual-female':           CasualFemale,
  'casual-male-afro':        CasualMaleAfro,
  'casual-female-afro':      CasualFemaleAfro,
  'business-male':           BusinessMale,
  'business-female':         BusinessFemale,
  'doctor-male':             DoctorMale,
  'doctor-female':           DoctorFemale,
  'nurse-male':              NurseMale,
  'police-male':             PoliceMale,
  'police-female':           PoliceFemale,
  'firefighter-male':        FirefighterMale,
  'firefighter-female':      FirefighterFemale,
  'emt-female':              EmtFemale,
  'construction-male':       ConstructionMale,
  'pilot-male':              PilotMale,
  'flight-attendant-female': FlightAttendantFemale,
  'farmer-male':             FarmerMale,
  'ranger-male':             RangerMale,
  'bust-male':               BustMale,
  'bust-female-long':        BustFemaleLong,
  'bust-female-bob':         BustFemaleBob,
  'bust-female-afro':        BustFemaleAfro,
};

// ── Helper: which viewBox does this silhouette use? ───────────────────────────
export function getSilhouetteVariant(id: SilhouetteId): 'full' | 'bust' {
  return SILHOUETTE_REGISTRY.find(s => s.id === id)?.variant ?? 'full';
}

// ── Main component ────────────────────────────────────────────────────────────
interface SilhouetteCharacterProps {
  id: SilhouetteId;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const SilhouetteCharacter: React.FC<SilhouetteCharacterProps> = ({
  id,
  color = '#000000',
  className,
  style,
}) => {
  const Component = SILHOUETTE_MAP[id];
  if (!Component) return null;
  return (
    <div className={className} style={{ display: 'contents', ...style }}>
      <Component color={color} />
    </div>
  );
};

// ── Auto-detect best silhouette for a scenario context ───────────────────────
const CONTEXT_MAP: Array<{ pattern: RegExp; id: SilhouetteId }> = [
  { pattern: /doctor|physician|hospital|clinic|medical|health/i,    id: 'doctor-male' },
  { pattern: /nurse|scrub|ward/i,                                    id: 'nurse-male' },
  { pattern: /police|officer|law enforcement|detective/i,           id: 'police-male' },
  { pattern: /fire|firefighter|rescue|blaze/i,                      id: 'firefighter-male' },
  { pattern: /emt|paramedic|ambulance/i,                            id: 'emt-female' },
  { pattern: /construct|site|hardhat|hard hat|builder/i,            id: 'construction-male' },
  { pattern: /pilot|captain|cockpit|aviation|aircraft/i,            id: 'pilot-male' },
  { pattern: /flight attendant|cabin crew|steward/i,               id: 'flight-attendant-female' },
  { pattern: /office|manager|executive|corporate|meeting|board/i,  id: 'business-male' },
  { pattern: /farm|agriculture|crop|harvest|ranch/i,               id: 'farmer-male' },
  { pattern: /ranger|park|forest|wildlife/i,                        id: 'ranger-male' },
];

export function detectSilhouetteForContext(
  context: string,
  preferFemale = false,
): SilhouetteId {
  for (const { pattern, id } of CONTEXT_MAP) {
    if (pattern.test(context)) {
      // Swap to female variant where available
      if (preferFemale) {
        const femaleVariant = id.replace('-male', '-female') as SilhouetteId;
        if (femaleVariant in SILHOUETTE_MAP) return femaleVariant;
      }
      return id;
    }
  }
  return preferFemale ? 'casual-female' : 'casual-male';
}

export default SilhouetteCharacter;
