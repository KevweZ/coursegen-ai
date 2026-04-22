/**
 * stripe_setup.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time script to create all NexCourse AI products & prices in Stripe.
 * Run ONCE with: node stripe_setup.mjs <YOUR_STRIPE_SECRET_KEY>
 *
 * What it creates:
 *   Subscriptions (annual billing):
 *     - Teacher Pro (K-12)           $12 / user / month
 *     - Pro Creator (Corporate)      $79 / user / month
 *     - Business Team (Corporate)   $149 / user / month
 *
 *   One-time credit packs:
 *     - Standard Credit Pack         $25
 *     - Volume Credit Pack          $100
 *
 * Output: Appends all Price IDs to your .env file automatically.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Arg check ────────────────────────────────────────────────────────────────
const secretKey = process.argv[2];
if (!secretKey || !secretKey.startsWith('sk_')) {
  console.error('\n❌  Usage: node stripe_setup.mjs <YOUR_STRIPE_SECRET_KEY>');
  console.error('   Example: node stripe_setup.mjs sk_test_51abc...\n');
  process.exit(1);
}

const stripe = new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' });

// ── Product definitions ───────────────────────────────────────────────────────
const PRODUCTS = [
  // ── Subscriptions (billed annually, shown as monthly price) ─────────────
  {
    envKey:      'STRIPE_PRICE_TEACHER_PRO',
    name:        'Teacher Pro (K-12)',
    description: '300 AI credits/month · Full AI generation · Standard TTS · No watermarks · LMS integration',
    metadata:    { track: 'k12', tier: 'teacher_pro', credits_monthly: '300' },
    price:       1200,   // $12.00 in cents
    currency:    'usd',
    type:        'recurring',
    interval:    'month',
  },
  {
    envKey:      'STRIPE_PRICE_PRO_CREATOR',
    name:        'Pro Creator (Corporate)',
    description: '500 AI credits/month · Full AI generation · SCORM exports · Standard & HD TTS',
    metadata:    { track: 'corporate', tier: 'pro_creator', credits_monthly: '500' },
    price:       7900,   // $79.00 in cents
    currency:    'usd',
    type:        'recurring',
    interval:    'month',
  },
  {
    envKey:      'STRIPE_PRICE_BUSINESS_TEAM',
    name:        'Business Team (Corporate)',
    description: '1,500 pooled credits/month · Team collaboration · Brand kit · HD TTS · Basic Voice Cloning',
    metadata:    { track: 'corporate', tier: 'business_team', credits_monthly: '1500' },
    price:       14900,  // $149.00 in cents
    currency:    'usd',
    type:        'recurring',
    interval:    'month',
  },

  // ── One-time credit packs ────────────────────────────────────────────────
  {
    envKey:      'STRIPE_PRICE_CREDITS_STANDARD',
    name:        'Standard Credit Pack',
    description: '100 AI credits · Never expire · Stack on top of subscription',
    metadata:    { type: 'credit_pack', credits: '100' },
    price:       2500,   // $25.00 in cents
    currency:    'usd',
    type:        'one_time',
  },
  {
    envKey:      'STRIPE_PRICE_CREDITS_VOLUME',
    name:        'Volume Credit Pack',
    description: '500 AI credits · Best value (save 20%) · Never expire · Stack on top of subscription',
    metadata:    { type: 'credit_pack', credits: '500' },
    price:       10000,  // $100.00 in cents
    currency:    'usd',
    type:        'one_time',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

async function createProductAndPrice(def) {
  // 1. Create product
  const product = await stripe.products.create({
    name:        def.name,
    description: def.description,
    metadata:    def.metadata ?? {},
  });
  console.log(`  ✅  Product created: ${product.name} (${product.id})`);

  // 2. Create price
  const priceData = {
    product:     product.id,
    unit_amount: def.price,
    currency:    def.currency,
    metadata:    def.metadata ?? {},
  };

  if (def.type === 'recurring') {
    priceData.recurring = { interval: def.interval };
  }

  const price = await stripe.prices.create(priceData);
  const label = def.type === 'recurring'
    ? `${formatPrice(def.price)}/${def.interval}`
    : `${formatPrice(def.price)} one-time`;
  console.log(`  ✅  Price created:   ${label} → ${price.id}`);

  return { envKey: def.envKey, priceId: price.id, name: def.name };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀  NexCourse AI — Stripe Product Setup');
  console.log('━'.repeat(55));

  const results = [];

  for (const def of PRODUCTS) {
    console.log(`\n→ Creating: ${def.name}`);
    try {
      const result = await createProductAndPrice(def);
      results.push(result);
    } catch (err) {
      console.error(`  ❌  Failed for ${def.name}: ${err.message}`);
      process.exit(1);
    }
  }

  // ── Print summary ─────────────────────────────────────────────────────────
  console.log('\n' + '━'.repeat(55));
  console.log('📋  All Price IDs:\n');
  for (const r of results) {
    console.log(`  ${r.envKey}=${r.priceId}`);
  }

  // ── Append to .env ────────────────────────────────────────────────────────
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const envPath   = path.join(__dirname, '.env');

  const envBlock = [
    '',
    '# ── Stripe Keys & Price IDs (auto-generated by stripe_setup.mjs) ────────────',
    `STRIPE_SECRET_KEY=${secretKey}`,
    `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_REPLACE_WITH_YOUR_PUBLISHABLE_KEY`,
    `STRIPE_WEBHOOK_SECRET=whsec_REPLACE_WITH_YOUR_WEBHOOK_SECRET`,
    ...results.map(r => `${r.envKey}=${r.priceId}`),
    '',
  ].join('\n');

  fs.appendFileSync(envPath, envBlock, 'utf8');

  console.log('\n✅  Price IDs appended to .env successfully!');
  console.log('\n⚠️   ACTION REQUIRED — open .env and fill in:');
  console.log('   1. VITE_STRIPE_PUBLISHABLE_KEY  → your pk_test_... key');
  console.log('   2. STRIPE_WEBHOOK_SECRET        → your whsec_... secret');
  console.log('\n🎉  Stripe setup complete!\n');
}

main().catch(err => {
  console.error('\n❌  Unexpected error:', err.message);
  process.exit(1);
});
