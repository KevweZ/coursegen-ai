/**
 * setup_admin_account.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time script to:
 *   1. Find your existing kevwe.zoma@gmail.com account in Supabase
 *   2. Set a password on it (so you can log in without Google)
 *   3. Update the display name to "Admin"
 *
 * Usage:
 *   node setup_admin_account.mjs <YOUR_DESIRED_PASSWORD>
 *
 * Example:
 *   node setup_admin_account.mjs NexAdmin2025!
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL         = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAIL          = process.env.VITE_ADMIN_EMAIL;

// ── Arg check ────────────────────────────────────────────────────────────────
const newPassword = process.argv[2];
if (!newPassword || newPassword.length < 8) {
  console.error('\n❌  Usage: node setup_admin_account.mjs <password>');
  console.error('   Password must be at least 8 characters.\n');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !ADMIN_EMAIL) {
  console.error('\n❌  Missing env vars. Make sure .env has:');
  console.error('   VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY, VITE_ADMIN_EMAIL\n');
  process.exit(1);
}

// ── Admin Supabase client (bypasses RLS) ─────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('\n🔧  NexCourse AI — Admin Account Setup');
  console.log('━'.repeat(50));
  console.log(`   Email:        ${ADMIN_EMAIL}`);
  console.log(`   New name:     Admin`);
  console.log(`   New password: ${'*'.repeat(newPassword.length)}\n`);

  // 1. List users and find by email
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('❌  Failed to list users:', listErr.message);
    process.exit(1);
  }

  const adminUser = users.find(u => u.email === ADMIN_EMAIL);
  if (!adminUser) {
    console.error(`❌  No user found with email: ${ADMIN_EMAIL}`);
    console.error('   Make sure you have signed up at least once with this email.\n');
    process.exit(1);
  }

  console.log(`✅  Found user: ${adminUser.id}`);

  // 2. Update password + display name
  const { data, error: updateErr } = await supabase.auth.admin.updateUserById(
    adminUser.id,
    {
      password: newPassword,
      user_metadata: {
        ...adminUser.user_metadata,  // preserve existing metadata
        full_name: 'Admin',
      },
    }
  );

  if (updateErr) {
    console.error('❌  Failed to update user:', updateErr.message);
    process.exit(1);
  }

  console.log('✅  Password set successfully');
  console.log('✅  Display name updated to "Admin"');
  console.log('\n' + '━'.repeat(50));
  console.log('🎉  Done! You can now log in with:');
  console.log(`   Username: admin  (or: ${ADMIN_EMAIL})`);
  console.log(`   Password: ${newPassword}\n`);
}

main().catch(err => {
  console.error('\n❌  Unexpected error:', err.message);
  process.exit(1);
});
