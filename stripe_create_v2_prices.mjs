/**
 * stripe_create_v2_prices.mjs
 * Creates Creator annual/monthly + Team annual prices.
 *
 * Usage:
 *   node stripe_create_v2_prices.mjs           # test mode (default)
 *   node stripe_create_v2_prices.mjs --live    # live mode (real money)
 *
 * Reads from .env:
 *   test → STRIPE_SECRET_KEY_TEST || STRIPE_SECRET_KEY (must be sk_test_…)
 *   live → STRIPE_SECRET_KEY_LIVE (must be sk_live_…)
 *
 * Writes mode-suffixed price keys into .env, e.g.:
 *   STRIPE_PRICE_PRO_CREATOR_ANNUAL_TEST=price_…
 *   STRIPE_PRICE_PRO_CREATOR_ANNUAL_LIVE=price_…
 */

import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');
const envText = fs.readFileSync(envPath, 'utf8');
const isLive = process.argv.includes('--live');
const mode = isLive ? 'live' : 'test';
const modeSuffix = isLive ? '_LIVE' : '_TEST';

function readEnv(key) {
  return (envText.match(new RegExp(`^${key}=(.+)$`, 'm'))?.[1] ?? '').trim();
}

const secretKey = isLive
  ? (readEnv('STRIPE_SECRET_KEY_LIVE') || '')
  : (readEnv('STRIPE_SECRET_KEY_TEST') || readEnv('STRIPE_SECRET_KEY') || '');

const expectedPrefix = isLive ? 'sk_live_' : 'sk_test_';
if (!secretKey.startsWith(expectedPrefix)) {
  console.error(
    isLive
      ? 'Missing STRIPE_SECRET_KEY_LIVE=sk_live_… in .env (required for --live)'
      : 'Missing STRIPE_SECRET_KEY_TEST or STRIPE_SECRET_KEY=sk_test_… in .env'
  );
  process.exit(1);
}

const stripe = new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' });

const DEFS = [
  {
    baseKey: 'STRIPE_PRICE_PRO_CREATOR_ANNUAL',
    name: 'Creator (Annual)',
    description: '500 AI + 500 TTS credits/mo · Alloy voice · 3 cloud drafts · SCORM export · $59/mo billed annually ($708/yr)',
    metadata: { tier: 'pro_creator', billing: 'annual', credits_ai: '500', credits_tts: '500', stripe_mode: mode },
    unit_amount: 70800,
    recurring: { interval: 'year' },
  },
  {
    baseKey: 'STRIPE_PRICE_PRO_CREATOR_MONTHLY',
    name: 'Creator (Monthly)',
    description: '500 AI + 500 TTS credits/mo · Alloy voice · 3 cloud drafts · SCORM export · $79/mo billed monthly',
    metadata: { tier: 'pro_creator', billing: 'monthly', credits_ai: '500', credits_tts: '500', stripe_mode: mode },
    unit_amount: 7900,
    recurring: { interval: 'month' },
  },
  {
    baseKey: 'STRIPE_PRICE_BUSINESS_TEAM_ANNUAL',
    name: 'Team (Annual)',
    description: '1,500 pooled credits/mo · up to 5 seats · 10 shared drafts · all 6 TTS voices · $149/mo billed annually ($1,788/yr)',
    metadata: { tier: 'business_team', billing: 'annual', credits_ai: '1500', credits_tts: '1500', seats: '5', stripe_mode: mode },
    unit_amount: 178800,
    recurring: { interval: 'year' },
  },
];

async function main() {
  console.log(`\nNexCourse AI — Create v2 Stripe prices (${mode.toUpperCase()})\n`);
  const created = [];

  for (const def of DEFS) {
    const product = await stripe.products.create({
      name: `${def.name}${isLive ? '' : ' [TEST]'}`,
      description: def.description,
      metadata: def.metadata,
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: def.unit_amount,
      currency: 'usd',
      recurring: def.recurring,
      metadata: def.metadata,
    });
    const envKey = `${def.baseKey}${modeSuffix}`;
    console.log(`✅ ${envKey}=${price.id}  (${def.name})`);
    created.push({ envKey, baseKey: def.baseKey, priceId: price.id });
  }

  let updated = fs.readFileSync(envPath, 'utf8');
  for (const { envKey, baseKey, priceId } of created) {
    const reMode = new RegExp(`^${envKey}=.*$`, 'm');
    if (reMode.test(updated)) {
      updated = updated.replace(reMode, `${envKey}=${priceId}`);
    } else {
      updated = updated.trimEnd() + `\n${envKey}=${priceId}`;
    }
    // Also keep unsuffixed aliases when in TEST so current Render deploys keep working
    if (!isLive) {
      const reBase = new RegExp(`^${baseKey}=.*$`, 'm');
      if (reBase.test(updated)) {
        updated = updated.replace(reBase, `${baseKey}=${priceId}`);
      } else {
        updated = updated.trimEnd() + `\n${baseKey}=${priceId}`;
      }
    }
  }

  if (!/^STRIPE_MODE=/m.test(updated)) {
    updated = updated.trimEnd() + `\nSTRIPE_MODE=test\n`;
  }

  fs.writeFileSync(envPath, updated.endsWith('\n') ? updated : updated + '\n', 'utf8');

  console.log(`\nUpdated .env. Set these on Render for ${mode.toUpperCase()} mode:\n`);
  console.log(`  STRIPE_MODE=${mode}`);
  if (isLive) {
    console.log('  STRIPE_SECRET_KEY_LIVE=sk_live_…');
    console.log('  STRIPE_WEBHOOK_SECRET_LIVE=whsec_…  (from live webhook endpoint)');
  } else {
    console.log('  STRIPE_SECRET_KEY_TEST=sk_test_…   (or STRIPE_SECRET_KEY)');
    console.log('  STRIPE_WEBHOOK_SECRET_TEST=whsec_…');
  }
  for (const { envKey, priceId } of created) {
    console.log(`  ${envKey}=${priceId}`);
  }
  console.log('\nDone.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
