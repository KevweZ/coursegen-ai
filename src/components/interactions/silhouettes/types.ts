/**
 * Silhouette Library — Type Definitions
 * All silhouette IDs available in the app.
 */

export type SilhouetteId =
  // ── Casual ──────────────────────────────────────────────────────
  | 'casual-male'
  | 'casual-female'
  | 'casual-male-afro'
  | 'casual-female-afro'
  // ── Business / Office ───────────────────────────────────────────
  | 'business-male'
  | 'business-female'
  // ── Medical ─────────────────────────────────────────────────────
  | 'doctor-male'
  | 'doctor-female'
  | 'nurse-male'
  // ── Police / Law ────────────────────────────────────────────────
  | 'police-male'
  | 'police-female'
  // ── Fire / Rescue ───────────────────────────────────────────────
  | 'firefighter-male'
  | 'firefighter-female'
  | 'emt-female'
  // ── Construction ────────────────────────────────────────────────
  | 'construction-male'
  // ── Aviation ────────────────────────────────────────────────────
  | 'pilot-male'
  | 'flight-attendant-female'
  // ── Outdoor / Specialist ────────────────────────────────────────
  | 'farmer-male'
  | 'ranger-male'
  // ── Half-body busts ─────────────────────────────────────────────
  | 'bust-male'
  | 'bust-female-long'
  | 'bust-female-bob'
  | 'bust-female-afro';

export type SilhouetteVariant = 'full' | 'bust';

export interface SilhouetteMeta {
  id: SilhouetteId;
  label: string;
  variant: SilhouetteVariant;
  gender: 'male' | 'female';
  category: string;
}

export const SILHOUETTE_REGISTRY: SilhouetteMeta[] = [
  { id: 'casual-male',              label: 'Casual Male',            variant: 'full', gender: 'male',   category: 'Casual' },
  { id: 'casual-female',            label: 'Casual Female',          variant: 'full', gender: 'female', category: 'Casual' },
  { id: 'casual-male-afro',         label: 'Casual Male (Afro)',     variant: 'full', gender: 'male',   category: 'Casual' },
  { id: 'casual-female-afro',       label: 'Casual Female (Afro)',   variant: 'full', gender: 'female', category: 'Casual' },
  { id: 'business-male',            label: 'Business Male',          variant: 'full', gender: 'male',   category: 'Business' },
  { id: 'business-female',          label: 'Business Female',        variant: 'full', gender: 'female', category: 'Business' },
  { id: 'doctor-male',              label: 'Doctor (Male)',          variant: 'full', gender: 'male',   category: 'Medical' },
  { id: 'doctor-female',            label: 'Doctor (Female)',        variant: 'full', gender: 'female', category: 'Medical' },
  { id: 'nurse-male',               label: 'Nurse (Male)',           variant: 'full', gender: 'male',   category: 'Medical' },
  { id: 'police-male',              label: 'Police (Male)',          variant: 'full', gender: 'male',   category: 'Police' },
  { id: 'police-female',            label: 'Police (Female)',        variant: 'full', gender: 'female', category: 'Police' },
  { id: 'firefighter-male',         label: 'Firefighter (Male)',     variant: 'full', gender: 'male',   category: 'Fire & Rescue' },
  { id: 'firefighter-female',       label: 'Firefighter (Female)',   variant: 'full', gender: 'female', category: 'Fire & Rescue' },
  { id: 'emt-female',               label: 'EMT / Paramedic',        variant: 'full', gender: 'female', category: 'Fire & Rescue' },
  { id: 'construction-male',        label: 'Construction Worker',    variant: 'full', gender: 'male',   category: 'Construction' },
  { id: 'pilot-male',               label: 'Pilot / Captain',        variant: 'full', gender: 'male',   category: 'Aviation' },
  { id: 'flight-attendant-female',  label: 'Flight Attendant',       variant: 'full', gender: 'female', category: 'Aviation' },
  { id: 'farmer-male',              label: 'Farmer (Male)',          variant: 'full', gender: 'male',   category: 'Outdoor' },
  { id: 'ranger-male',              label: 'Park Ranger',            variant: 'full', gender: 'male',   category: 'Outdoor' },
  { id: 'bust-male',                label: 'Bust — Male',            variant: 'bust', gender: 'male',   category: 'Bust' },
  { id: 'bust-female-long',         label: 'Bust — Female (Long)',   variant: 'bust', gender: 'female', category: 'Bust' },
  { id: 'bust-female-bob',          label: 'Bust — Female (Bob)',    variant: 'bust', gender: 'female', category: 'Bust' },
  { id: 'bust-female-afro',         label: 'Bust — Female (Afro)',   variant: 'bust', gender: 'female', category: 'Bust' },
];
