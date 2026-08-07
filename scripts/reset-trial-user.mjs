/**
 * Reset trial AI usage for one email (clears ai_usage rows for that user).
 * Optionally extends trial_expires_at by N days.
 *
 * Usage:
 *   node scripts/reset-trial-user.mjs mortalman2k@gmail.com
 *   node scripts/reset-trial-user.mjs mortalman2k@gmail.com --extend-days=7
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const emailArg = (process.argv[2] || '').trim().toLowerCase();
const extendMatch = process.argv.find(a => a.startsWith('--extend-days='));
const extendDays = extendMatch ? Number(extendMatch.split('=')[1]) : 0;

if (!emailArg || !emailArg.includes('@')) {
  console.error('Usage: node scripts/reset-trial-user.mjs <email> [--extend-days=7]');
  process.exit(1);
}

const envPath = resolve(process.cwd(), '.env');
let envText = '';
try {
  envText = readFileSync(envPath, 'utf8');
} catch {
  console.error('Missing .env — need VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPA_ADMIN_KEY).');
  process.exit(1);
}

const getEnv = (key) => {
  const match = envText.match(new RegExp(`^${key}=["']?(.+?)["']?\\s*$`, 'm'));
  return match ? match[1].trim() : process.env[key] || null;
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SERVICE_KEY = getEnv('SUPA_ADMIN_KEY') || getEnv('SUPABASE_SERVICE_KEY');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY / SUPA_ADMIN_KEY in .env');
  process.exit(1);
}

const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log(`Looking up user: ${emailArg}`);

// Prefer listUsers pagination — getUserByEmail is not always available on older clients
let user = null;
let page = 1;
while (!user && page <= 20) {
  const { data, error } = await supa.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error('listUsers error:', error.message);
    process.exit(1);
  }
  user = (data?.users || []).find(u => (u.email || '').toLowerCase() === emailArg) || null;
  if (!data?.users?.length || data.users.length < 200) break;
  page += 1;
}

if (!user) {
  console.error(`No auth user found for ${emailArg}`);
  process.exit(1);
}

console.log(`Found user id=${user.id}`);
console.log(`  role=${user.user_metadata?.role || '(none)'} plan=${user.user_metadata?.plan || '(none)'}`);
console.log(`  trial_expires_at=${user.user_metadata?.trial_expires_at || '(none)'}`);

const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
const { count: beforeCount, error: countErr } = await supa
  .from('ai_usage')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .gte('created_at', weekAgo);

if (countErr) {
  console.error('Count error:', countErr.message);
  process.exit(1);
}
console.log(`Weekly ai_usage (last 7 days): ${beforeCount ?? 0}`);

const { error: delErr, count: deleted } = await supa
  .from('ai_usage')
  .delete({ count: 'exact' })
  .eq('user_id', user.id);

if (delErr) {
  console.error('Delete error:', delErr.message);
  process.exit(1);
}
console.log(`Cleared ai_usage rows for this user (deleted≈${deleted ?? 'unknown'}).`);

if (extendDays > 0) {
  const fromNow = new Date(Date.now() + extendDays * 24 * 60 * 60 * 1000);
  const existing = user.user_metadata?.trial_expires_at
    ? new Date(user.user_metadata.trial_expires_at)
    : null;
  // Never shorten an existing trial — use the later of existing vs now+days
  const expiresAt = (existing && existing > fromNow ? existing : fromNow).toISOString();
  const { error: updErr } = await supa.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...(user.user_metadata || {}),
      role: 'trial',
      plan: 'trial',
      trial_expires_at: expiresAt,
    },
  });
  if (updErr) {
    console.error('Extend trial error:', updErr.message);
    process.exit(1);
  }
  console.log(`Extended trial_expires_at → ${expiresAt}`);
}

console.log(`✅ Trial usage reset for ${emailArg}. They can generate again (limit 30 complex AI calls / 7 days).`);
