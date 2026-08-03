/**
 * stripe_create_v2_prices.mjs
 * Creates Creator annual/monthly + Team annual prices for the new pricing model.
 * Does not delete old prices. Updates .env keys in place when possible.
 *
 * Usage: node stripe_create_v2_prices.mjs
 * (reads STRIPE_SECRET_KEY from .env)
 */

import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');
const envText = fs.readFileSync(envPath, 'utf8');
const secretKey = (envText.match(/^STRIPE_SECRET_KEY=(.+)$/m)?.[1] ?? '').trim();

if (!secretKey.startsWith('sk_')) {
  console.error('Missing STRIPE_SECRET_KEY in .env');
  process.exit(1);
}

const stripe = new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' });

const DEFS = [
  {
    envKey: 'STRIPE_PRICE_PRO_CREATOR_ANNUAL',
    name: 'Creator (Annual)',
    description: '500 AI + 500 TTS credits/mo · Alloy voice · 3 cloud drafts · SCORM export · $59/mo billed annually ($708/yr)',
    metadata: { tier: 'pro_creator', billing: 'annual', credits_ai: '500', credits_tts: '500' },
    unit_amount: 70800, // $708/year
    recurring: { interval: 'year' },
  },
  {
    envKey: 'STRIPE_PRICE_PRO_CREATOR_MONTHLY',
    name: 'Creator (Monthly)',
    description: '500 AI + 500 TTS credits/mo · Alloy voice · 3 cloud drafts · SCORM export · $79/mo billed monthly',
    metadata: { tier: 'pro_creator', billing: 'monthly', credits_ai: '500', credits_tts: '500' },
    unit_amount: 7900, // $79/month
    recurring: { interval: 'month' },
  },
  {
    envKey: 'STRIPE_PRICE_BUSINESS_TEAM_ANNUAL',
    name: 'Team (Annual)',
    description: '1,500 pooled credits/mo · up to 5 seats · 10 shared drafts · all 6 TTS voices · $149/mo billed annually ($1,788/yr)',
    metadata: { tier: 'business_team', billing: 'annual', credits_ai: '1500', credits_tts: '1500', seats: '5' },
    unit_amount: 178800, // $1,788/year
    recurring: { interval: 'year' },
  },
];

function upsertEnv(key, value) {
  let next = envText;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(next)) {
    next = next.replace(re, `${key}=${value}`);
  } else {
    next = next.trimEnd() + `\n${key}=${value}\n`;
  }
  fs.writeFileSync(envPath, next, 'utf8');
}

async function main() {
  console.log('\nNexCourse AI — Create v2 Stripe prices\n');
  const created = [];

  for (const def of DEFS) {
    const product = await stripe.products.create({
      name: def.name,
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
    console.log(`✅ ${def.envKey}=${price.id}  (${def.name})`);
    created.push({ envKey: def.envKey, priceId: price.id });
  }

  // Re-read after each write would be safer; write all at once from original + updates
  let updated = fs.readFileSync(envPath, 'utf8');
  for (const { envKey, priceId } of created) {
    const re = new RegExp(`^${envKey}=.*$`, 'm');
    if (re.test(updated)) {
      updated = updated.replace(re, `${envKey}=${priceId}`);
    } else {
      updated = updated.trimEnd() + `\n${envKey}=${priceId}`;
    }
  }
  // Keep legacy keys pointing at sensible defaults for Render fallbacks
  if (!/^STRIPE_PRICE_PRO_CREATOR=/m.test(updated)) {
    const annual = created.find(c => c.envKey === 'STRIPE_PRICE_PRO_CREATOR_ANNUAL')?.priceId;
    if (annual) updated += `\nSTRIPE_PRICE_PRO_CREATOR=${annual}`;
  }
  fs.writeFileSync(envPath, updated.endsWith('\n') ? updated : updated + '\n', 'utf8');

  console.log('\nUpdated .env. Also set these on Render (server env):\n');
  for (const { envKey, priceId } of created) {
    console.log(`  ${envKey}=${priceId}`);
  }
  console.log('\nDone.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
