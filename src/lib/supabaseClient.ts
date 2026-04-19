/**
 * supabaseClient.ts
 * Browser-safe Supabase client.
 * Uses the publishable (anon) key — safe in the browser as long as
 * Row Level Security (RLS) is enabled on your Supabase tables.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = (import.meta as any).env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
