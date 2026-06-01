/**
 * Admin script: clear all ai_usage entries so trial users get a fresh start.
 * Run with: node scripts/clear-trial-usage.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Parse .env manually
const envPath = resolve(process.cwd(), '.env');
const envText = readFileSync(envPath, 'utf8');
const getEnv = (key) => {
  const match = envText.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return match ? match[1].trim() : null;
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SERVICE_KEY  = getEnv('SUPABASE_SERVICE_KEY');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 1. Show current counts per user
const { data: rows, error: fetchErr } = await supa
  .from('ai_usage')
  .select('user_id, created_at')
  .order('created_at', { ascending: false });

if (fetchErr) { console.error('Fetch error:', fetchErr.message); process.exit(1); }

const counts = {};
for (const r of rows ?? []) counts[r.user_id] = (counts[r.user_id] ?? 0) + 1;
console.log('Current ai_usage counts per user:');
for (const [uid, n] of Object.entries(counts)) {
  console.log(`  ${uid.slice(0, 8)}…  →  ${n} entries`);
}
console.log(`Total: ${rows?.length ?? 0} entries\n`);

// 2. Delete ALL entries (gives every trial user a clean slate)
const { error: delErr } = await supa.from('ai_usage').delete().gte('created_at', '2000-01-01');
if (delErr) { console.error('Delete error:', delErr.message); process.exit(1); }

console.log('✅ All ai_usage entries cleared. Trial users now have a fresh start.');
