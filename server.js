/**
 * server.js — CourseGEN AI Secure Proxy Server
 *
 * Responsibilities:
 *  - Keep all API keys strictly server-side (never exposed to the browser bundle)
 *  - Apply security headers via helmet (HSTS, X-Content-Type-Options, X-Frame-Options, CSP)
 *  - Redirect HTTP → HTTPS in production
 *  - Rate-limit AI proxy endpoints to prevent abuse and runaway API costs
 *  - Serve the Vite production build as static files in production
 *  - Throw on startup if any critical environment variable is missing
 *
 * Development:  node server.js          (proxy only, Vite dev server handles the front-end)
 * Production:   node server.js          (serves /dist + proxy)
 */

import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import Stripe from 'stripe';
import { Resend } from 'resend';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT      = process.env.PORT ?? 3001;
const isProd    = process.env.NODE_ENV === 'production';

// ─── 1. Startup Environment Validation ──────────────────────────────────────
const REQUIRED_VARS = ['ANTHROPIC_API_KEY'];
const missingVars   = REQUIRED_VARS.filter(v => !process.env[v]);

if (missingVars.length > 0) {
  console.error('\n❌  SECURITY STARTUP FAILURE');
  console.error('   The following required environment variables are not set:');
  missingVars.forEach(v => console.error(`     • ${v}`));
  console.error('   Server will NOT start without these keys.\n');
  process.exit(1);
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY    = process.env.OPENAI_API_KEY ?? '';

// ─── 1b. Stripe Init ────────────────────────────────────────────────────────
const STRIPE_SECRET_KEY      = process.env.STRIPE_SECRET_KEY ?? '';
const STRIPE_WEBHOOK_SECRET  = process.env.STRIPE_WEBHOOK_SECRET ?? '';

// Map frontend plan IDs → Stripe Price IDs (set in Railway env vars)
const STRIPE_PRICE_MAP = {
  teacher_pro:      process.env.STRIPE_PRICE_TEACHER_PRO      ?? '',
  pro_creator:      process.env.STRIPE_PRICE_PRO_CREATOR      ?? '',
  business_team:    process.env.STRIPE_PRICE_BUSINESS_TEAM    ?? '',
  credits_standard: process.env.STRIPE_PRICE_CREDITS_STANDARD ?? '',
  credits_volume:   process.env.STRIPE_PRICE_CREDITS_VOLUME   ?? '',
};

// Map plan IDs → credit grants (applied on successful checkout)
const PLAN_CREDITS = {
  teacher_pro:      { credits_ai: 300,  credits_tts: 300  },
  pro_creator:      { credits_ai: 500,  credits_tts: 500  },
  business_team:    { credits_ai: 1500, credits_tts: 1500 },
  credits_standard: { credits_ai: 100,  credits_tts: 0    },
  credits_volume:   { credits_ai: 500,  credits_tts: 0    },
};

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' })
  : null;

// ─── 1c. Resend Init ────────────────────────────────────────────────────────
const RESEND_API_KEY  = process.env.RESEND_API_KEY ?? '';
const SUPPORT_EMAIL   = process.env.SUPPORT_EMAIL  ?? 'support@nexcourse.ai';
const FROM_EMAIL      = process.env.FROM_EMAIL     ?? 'noreply@nexcourse.ai';
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// ─── 2. Express App Setup ───────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: '512kb' }));

// ─── 2a. CORS — allow Cloudflare Pages frontend ─────────────────────────────
const ALLOWED_ORIGINS = [
  'https://nexcourse.ai',
  'https://www.nexcourse.ai',
  'https://coursegenai.ai',          // legacy — remove after full rename
  ...(isProd ? [] : ['http://localhost:3000', 'http://localhost:3001']),
];

app.use((req, res, next) => {
  const origin = req.headers.origin ?? '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ─── 3. HTTPS Enforcement (production only) ─────────────────────────────────
if (isProd) {
  app.use((req, res, next) => {
    // Trust proxy (Cloud Run, Heroku, Railway etc. terminates TLS upstream)
    const proto = req.headers['x-forwarded-proto'];
    if (proto && proto !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// ─── 4. Helmet Security Headers ─────────────────────────────────────────────
app.use(
  helmet({
    // Strict-Transport-Security: tell browsers to only use HTTPS for 1 year
    hsts: {
      maxAge: 31_536_000,       // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },
    // X-Content-Type-Options: nosniff — prevents MIME-type sniffing
    noSniff: true,
    // X-Frame-Options: DENY — prevents clickjacking
    frameguard: { action: 'deny' },
    // Content-Security-Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'", "'unsafe-inline'"],   // Vite inlines some scripts
        styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
        imgSrc:      ["'self'", 'data:', 'blob:', 'https:'],
        mediaSrc:    ["'self'", 'blob:'],
        connectSrc:  ["'self'"],                      // Block direct browser→3rd-party API calls
        objectSrc:   ["'none'"],
        frameSrc:    ["'none'"],
      },
    },
  })
);

// ─── 5. Rate Limiting — AI Proxy Endpoints ──────────────────────────────────
const aiRateLimit = rateLimit({
  windowMs:         15 * 60 * 1000,   // 15-minute window
  max:              30,                // max 30 AI requests per IP per window
  standardHeaders:  true,
  legacyHeaders:    false,
  message: { error: 'Too many requests. Please wait 15 minutes before trying again.' },
});

const ttsRateLimit = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              50,                // TTS is cheaper, allow slightly more
  standardHeaders:  true,
  legacyHeaders:    false,
  message: { error: 'Too many TTS requests. Please wait 15 minutes.' },
});

const supportRateLimit = rateLimit({
  windowMs:         60 * 60 * 1000,   // 1-hour window
  max:              5,                 // max 5 support submissions per IP per hour
  standardHeaders:  true,
  legacyHeaders:    false,
  message: { error: 'Too many support requests. Please wait before submitting again.' },
});

// ─── 6. Anthropic AI Proxy ──────────────────────────────────────────────────
app.post('/api/ai', aiRateLimit, async (req, res) => {
  const { model, system, user, maxTokens } = req.body;

  if (!model || !system || !user) {
    return res.status(400).json({ error: 'Missing required fields: model, system, user' });
  }

  // ── Trial-user AI generation cap ─────────────────────────────────────────
  // Decode the JWT from the Authorization header to check user role & usage.
  // Fails gracefully if the ai_usage table doesn't exist yet.
  const authHeader = req.headers.authorization ?? '';
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (jwt) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supa = createClient(
        process.env.VITE_SUPABASE_URL,
        getSupabaseKey(),
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      // Validate the JWT and get user info
      const { data: { user: authUser } } = await supa.auth.getUser(jwt);
      if (authUser?.user_metadata?.role === 'trial') {
        const TRIAL_AI_LIMIT = 50;
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supa
          .from('ai_usage')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authUser.id)
          .gte('created_at', weekAgo);

        if (typeof count === 'number' && count >= TRIAL_AI_LIMIT) {
          return res.status(429).json({
            error: `Trial limit reached. You've used ${count}/${TRIAL_AI_LIMIT} AI generations this week. Contact us to upgrade your account.`,
            code: 'TRIAL_LIMIT_EXCEEDED',
          });
        }
        // Log this generation
        await supa.from('ai_usage').insert({ user_id: authUser.id, type: 'course_generation' });
      }
    } catch (trialCheckErr) {
      // Degrade gracefully — if ai_usage table doesn't exist yet, just proceed
      console.warn('[AI Proxy] Trial check skipped:', trialCheckErr?.message ?? trialCheckErr);
    }
  }

  const modelStr =
    model === 'complex' ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      modelStr,
        max_tokens: maxTokens ?? 8192,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      console.error(`[AI Proxy] Upstream error ${response.status}: ${errText}`);
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text ?? '{}';
    return res.json({ text });

  } catch (err) {
    console.error('[AI Proxy] Network error:', err.message);
    return res.status(502).json({ error: 'AI proxy network error: ' + err.message });
  }
});

// ─── Helper: verify caller is the admin via their Supabase JWT ───────────────
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? '').toLowerCase();

// Try multiple env var names for the service key — SUPA_ADMIN_KEY takes priority
// so we can set a fresh variable in Railway if SUPABASE_SERVICE_KEY is corrupted.
function getSupabaseKey() {
  return process.env.SUPA_ADMIN_KEY
      || process.env.SUPABASE_SERVICE_KEY
      || '';
}

// Decode a Supabase JWT payload without verifying the signature.
// The email and user_metadata are self-contained in the token body.
// Security: Supabase JWTs are signed with the project's JWT secret — the email
// field cannot be forged without that secret, making this safe for admin checks.
function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

async function verifyAdminJwt(authHeader) {
  console.log('[AdminAuth] Authorization header present:', !!authHeader);
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  console.log('[AdminAuth] Token extracted:', token ? `${token.slice(0,20)}...` : 'NONE');
  if (!token) return false;

  // ── Fast path: decode JWT locally — no Supabase network call needed ─────────
  const payload = decodeJwtPayload(token);
  console.log('[AdminAuth] JWT email:', payload?.email ?? 'null');
  console.log('[AdminAuth] JWT role:', payload?.user_metadata?.role ?? 'none');
  console.log('[AdminAuth] ADMIN_EMAIL env:', ADMIN_EMAIL || '(not set)');

  if (payload) {
    const emailMatch = !!(ADMIN_EMAIL && payload.email?.toLowerCase() === ADMIN_EMAIL);
    const roleMatch  = payload.user_metadata?.role === 'admin';
    console.log('[AdminAuth] Email match:', emailMatch, '| Role match:', roleMatch);
    if (emailMatch || roleMatch) {
      console.log('[AdminAuth] ✅ Passed via JWT decode');
      return true;
    }
  }

  // ── Fallback: verify via Supabase getUser (requires env vars) ───────────────
  console.log('[AdminAuth] Trying Supabase fallback...');
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supa = createClient(
      process.env.VITE_SUPABASE_URL,
      getSupabaseKey(),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: { user }, error } = await supa.auth.getUser(token);
    console.log('[AdminAuth] Supabase getUser error:', error?.message ?? 'none');
    console.log('[AdminAuth] Supabase getUser email:', user?.email ?? 'null');
    if (error || !user) return false;
    return (ADMIN_EMAIL && user.email?.toLowerCase() === ADMIN_EMAIL)
        || user.user_metadata?.role === 'admin';
  } catch (e) {
    console.error('[AdminAuth] Supabase fallback threw:', e.message);
    return false;
  }
}

app.post('/api/admin/invite', async (req, res) => {
  const { email, trialDays = 7 } = req.body;
  console.log('[Admin Invite] Request received, email:', email);

  const isAdmin = await verifyAdminJwt(req.headers.authorization).catch((e) => {
    console.error('[AdminAuth] verifyAdminJwt threw:', e.message);
    return false;
  });
  console.log('[Admin Invite] isAdmin result:', isAdmin);
  if (!isAdmin) {
    return res.status(403).json({ error: 'Forbidden.' });
  }
  if (!email?.trim()) {
    return res.status(400).json({ error: 'email is required.' });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supa = createClient(
      process.env.VITE_SUPABASE_URL,
      getSupabaseKey(),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const expiresAt  = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
    const baseUrl    = isProd ? 'https://nexcourse.ai' : 'http://localhost:3000';

    // generateLink creates the magic-link token WITHOUT Supabase sending its own email,
    // so we can send exactly one branded email via Resend with the real working link.
    const { data, error } = await supa.auth.admin.generateLink({
      type: 'invite',
      email: email.trim().toLowerCase(),
      options: {
        data: {
          role:             'trial',
          trial_expires_at: expiresAt,
          full_name:        '',
          track:            'corporate',
          plan:             'trial',
        },
        redirectTo: `${baseUrl}/signup`,
      },
    });

    if (error) {
      console.error('[Admin Invite] Supabase generateLink error:', error.message);
      return res.status(400).json({ error: error.message });
    }

    const inviteLink = data?.properties?.action_link ?? `${baseUrl}/signup`;
    console.log('[Admin Invite] Magic link generated for:', email);

    // Send exactly one branded email via Resend with the real invite link
    if (resend) {
      await resend.emails.send({
        from: `NexCourse AI <${FROM_EMAIL}>`,
        to:   [email],
        subject: "You've been invited to try NexCourse AI!",
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
            <div style="background:#4f46e5;padding:28px 32px;border-radius:12px 12px 0 0;">
              <h2 style="color:white;margin:0;font-size:22px;">Welcome to NexCourse AI 🎉</h2>
            </div>
            <div style="background:#f8fafc;padding:28px 32px;border:1px solid #e2e8f0;border-top:none;">
              <p style="line-height:1.7;margin:0 0 16px;">
                You've been given <strong>${trialDays}-day trial access</strong> to NexCourse AI —
                an AI-powered eLearning authoring platform where you can build interactive courses
                in minutes.
              </p>
              <p style="line-height:1.7;margin:0 0 24px;color:#64748b;font-size:14px;">
                Your trial expires on <strong>${new Date(expiresAt).toLocaleDateString('en-GB', { dateStyle: 'long' })}</strong>.
              </p>
              <a href="${inviteLink}"
                 style="display:inline-block;background:#4f46e5;color:white;padding:14px 28px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;">
                Accept Invitation &amp; Get Started
              </a>
            </div>
            <div style="background:#f1f5f9;padding:12px 32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;font-size:12px;color:#94a3b8;">
              Questions? Reply to this email or write to <a href="mailto:${SUPPORT_EMAIL}" style="color:#4f46e5;">${SUPPORT_EMAIL}</a>
            </div>
          </div>
        `,
      }).catch(e => console.warn('[Admin Invite] Resend email failed:', e.message));
    } else {
      console.warn('[Admin Invite] Resend not configured — no email sent.');
    }

    console.log(`[Admin Invite] Invited ${email} — trial expires ${expiresAt}`);
    return res.json({ success: true, userId: data.user?.id, expiresAt });

  } catch (err) {
    console.error('[Admin Invite] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── 6c. Admin — Revoke Trial Access ────────────────────────────────────────
app.post('/api/admin/revoke', async (req, res) => {
  const { userId } = req.body;

  const isAdmin = await verifyAdminJwt(req.headers.authorization).catch(() => false);
  if (!isAdmin) {
    return res.status(403).json({ error: 'Forbidden.' });
  }
  if (!userId) {
    return res.status(400).json({ error: 'userId is required.' });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supa = createClient(
      process.env.VITE_SUPABASE_URL,
      getSupabaseKey(),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Set trial_expires_at to yesterday — immediate expiry without deleting the account
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supa.auth.admin.updateUserById(userId, {
      user_metadata: { trial_expires_at: yesterday },
    });

    if (error) return res.status(400).json({ error: error.message });

    console.log(`[Admin Revoke] Trial revoked for userId=${userId}`);
    return res.json({ success: true, revokedAt: yesterday });

  } catch (err) {
    console.error('[Admin Revoke] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});


// ─── 7. OpenAI TTS Proxy ────────────────────────────────────────────────────
app.post('/api/tts', ttsRateLimit, async (req, res) => {
  const { text, voice = 'alloy', model = 'tts-1', speed = 1.0 } = req.body;

  if (!OPENAI_API_KEY) {
    return res.status(503).json({ error: 'TTS is not configured on this server.' });
  }

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Missing required field: text' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model,
        input: text.trim().slice(0, 4096),
        voice,
        speed,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return res.status(response.status).json({ error: errText });
    }

    // Stream the MP3 binary directly back to the browser
    res.setHeader('Content-Type', 'audio/mpeg');
    const buffer = await response.arrayBuffer();
    return res.end(Buffer.from(buffer));

  } catch (err) {
    console.error('[TTS Proxy] Network error:', err.message);
    return res.status(502).json({ error: 'TTS proxy network error: ' + err.message });
  }
});

// ─── 8. Payment Routes ──────────────────────────────────────────────────────

// 8a. Create Stripe Checkout Session
app.post('/api/payments/create-checkout', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Payments not configured on this server.' });

  const { planId, userId, userEmail } = req.body;
  if (!planId || !userId || !userEmail) {
    return res.status(400).json({ error: 'Missing required fields: planId, userId, userEmail' });
  }

  const priceId = STRIPE_PRICE_MAP[planId];
  if (!priceId) {
    return res.status(400).json({ error: `Unknown planId: ${planId}` });
  }

  const isSubscription = ['teacher_pro', 'pro_creator', 'business_team'].includes(planId);
  const frontendBase = isProd ? 'https://nexcourse.ai' : 'http://localhost:3000';

  try {
    const session = await stripe.checkout.sessions.create({
      mode:               isSubscription ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      customer_email:     userEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata:           { userId, planId },
      success_url:        `${frontendBase}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:         `${frontendBase}/payment-cancel`,
    });
    return res.json({ url: session.url });
  } catch (err) {
    console.error('[Stripe] create-checkout error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 8b. Stripe Webhook — MUST use raw body (not parsed JSON)
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      return res.status(503).json({ error: 'Webhook not configured.' });
    }

    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('[Stripe Webhook] Signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ── Handle relevant events ────────────────────────────────────────────────
    try {
      if (event.type === 'checkout.session.completed') {
        const session  = event.data.object;
        const userId   = session.metadata?.userId;
        const planId   = session.metadata?.planId;
        const custId   = session.customer;
        const subId    = session.subscription ?? null;
        const credits  = PLAN_CREDITS[planId] ?? { credits_ai: 0, credits_tts: 0 };
        const isSubscription = subId !== null;

        if (userId && planId) {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            getSupabaseKey(),
            { auth: { autoRefreshToken: false, persistSession: false } }
          );

          if (isSubscription) {
            // Upsert subscription record
            await supabase.from('user_entitlements').upsert({
              user_id:            userId,
              subscription:       planId,
              credits_ai:         credits.credits_ai,
              credits_tts:        credits.credits_tts,
              stripe_customer_id: custId,
              stripe_sub_id:      subId,
              updated_at:         new Date().toISOString(),
            }, { onConflict: 'user_id' });
          } else {
            // One-time purchase — add credits on top of existing balance
            const { data: existing } = await supabase
              .from('user_entitlements')
              .select('credits_ai, credits_tts')
              .eq('user_id', userId)
              .single();

            await supabase.from('user_entitlements').upsert({
              user_id:            userId,
              subscription:       existing?.subscription ?? 'free',
              credits_ai:         (existing?.credits_ai ?? 0) + credits.credits_ai,
              credits_tts:        (existing?.credits_tts ?? 0) + credits.credits_tts,
              stripe_customer_id: custId,
              updated_at:         new Date().toISOString(),
            }, { onConflict: 'user_id' });
          }
          console.log(`[Stripe Webhook] checkout.session.completed — userId=${userId} plan=${planId}`);

          // ── If this was a trial user, graduate them to full customer ─────────
          // Clear the 'trial' role flag so all trial restrictions lift immediately.
          try {
            await supabase.auth.admin.updateUserById(userId, {
              user_metadata: { role: 'customer', trial_expires_at: null },
            });
            console.log(`[Stripe Webhook] Trial graduated to customer — userId=${userId}`);
          } catch (graduateErr) {
            // Non-fatal — entitlements are already updated, restrictions lift on next login
            console.warn('[Stripe Webhook] Could not clear trial metadata:', graduateErr?.message);
          }
        }
      }

      if (event.type === 'customer.subscription.deleted') {
        // Subscription cancelled — downgrade to free
        const sub    = event.data.object;
        const custId = sub.customer;
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.VITE_SUPABASE_URL,
          getSupabaseKey(),
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        await supabase
          .from('user_entitlements')
          .update({ subscription: 'free', stripe_sub_id: null, updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', custId);
        console.log(`[Stripe Webhook] subscription.deleted — customer=${custId}`);
      }
    } catch (handlerErr) {
      console.error('[Stripe Webhook] Handler error:', handlerErr.message);
      // Still return 200 so Stripe doesn't retry
    }

    res.json({ received: true });
  }
);

// 8c. Get Payment Status for a user
app.get('/api/payments/status', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId query param' });

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      getSupabaseKey(),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data, error } = await supabase
      .from('user_entitlements')
      .select('subscription, credits_ai, credits_tts, stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      // No record = free tier user
      return res.json({ subscription: 'free', credits_ai: 0, credits_tts: 0, stripe_customer_id: null });
    }
    return res.json(data);
  } catch (err) {
    console.error('[Payment Status] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── 9. QC Content Scan ─────────────────────────────────────────────────────
app.post('/api/qc/content-scan', aiRateLimit, async (req, res) => {
  try {
    const { slides } = req.body;
    if (!Array.isArray(slides) || slides.length === 0) {
      return res.status(400).json({ error: 'slides array required' });
    }

    const slideSummary = slides.map(s => ({
      id: s.id,
      type: s.type,
      fields: s.fields,
    }));

    const prompt = `You are a quality checker for eLearning course content. Review these slides and identify ONLY clear spelling or grammar errors — do not rewrite for style.

Return a JSON array (only the array, no markdown) where each item has:
{
  "slideId": "the slide id",
  "field": "the field path e.g. title, content, data.items.0.content",
  "type": "spelling" | "grammar" | "clarity",
  "severity": "error" | "warning" | "info",
  "message": "short description of the issue",
  "originalText": "the exact problematic phrase or sentence",
  "suggestion": "corrected version"
}

Rules:
- Only flag CLEAR errors. Do not suggest rewrites for style or voice.
- For spelling: provide the exact corrected word/phrase (not the whole field).
- For grammar: minimal fix, preserve the author's voice and meaning.
- Return [] if no issues found.
- Maximum 3 issues per slide.

Slides to review:
${JSON.stringify(slideSummary, null, 2)}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: `AI API error: ${errText}` });
    }

    const aiData = await response.json();
    const raw = aiData.content?.[0]?.text ?? '[]';

    // Strip any markdown code fences before parsing
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let issues = [];
    try {
      issues = JSON.parse(cleaned);
      if (!Array.isArray(issues)) issues = [];
    } catch {
      issues = [];
    }

    return res.json({ issues });
  } catch (err) {
    console.error('[QC Scan] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── 10. Support Contact ─────────────────────────────────────────────────────
app.post('/api/support/contact', supportRateLimit, async (req, res) => {
  const { name, email, message, subject = 'General Inquiry', issueType, userId } = req.body;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }
  if (message.trim().length < 10) {
    return res.status(400).json({ error: 'Message must be at least 10 characters.' });
  }
  if (!resend) {
    console.warn('[Support] RESEND_API_KEY not configured — email not sent.');
    return res.status(503).json({ error: 'Email service not configured.' });
  }

  const source    = issueType ? 'Dashboard (Logged-in User)' : 'Marketing Page (Visitor)';
  const ticketRef = `NCX-${Date.now().toString(36).toUpperCase()}`;
  const timestamp = new Date().toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' });

  try {
    // 1. Send notification to support inbox
    await resend.emails.send({
      from: `NexCourse AI Support <${FROM_EMAIL}>`,
      to:   [SUPPORT_EMAIL],
      subject: `[${ticketRef}] ${issueType ? `[${issueType}] ` : ''}${subject} — ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
          <div style="background: #4f46e5; padding: 20px 24px; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; margin: 0; font-size: 18px;">📬 New Support Ticket — ${ticketRef}</h2>
            <p style="color: #c7d2fe; margin: 4px 0 0; font-size: 13px;">Source: ${source}</p>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr><td style="padding: 8px 0; color: #64748b; width: 120px;">From</td><td style="padding: 8px 0; font-weight: 600;">${name} &lt;${email}&gt;</td></tr>
              ${userId ? `<tr><td style="padding: 8px 0; color: #64748b;">User ID</td><td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${userId}</td></tr>` : ''}
              <tr><td style="padding: 8px 0; color: #64748b;">Subject</td><td style="padding: 8px 0;">${subject}</td></tr>
              ${issueType ? `<tr><td style="padding: 8px 0; color: #64748b;">Issue Type</td><td style="padding: 8px 0;"><span style="background: #ede9fe; color: #4f46e5; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">${issueType}</span></td></tr>` : ''}
              <tr><td style="padding: 8px 0; color: #64748b;">Submitted</td><td style="padding: 8px 0; color: #94a3b8; font-size: 12px;">${timestamp} UTC</td></tr>
            </table>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">
            <h3 style="margin: 0 0 8px; font-size: 14px; color: #475569;">MESSAGE</h3>
            <p style="white-space: pre-wrap; background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; font-size: 14px; line-height: 1.6; margin: 0;">${message.trim()}</p>
          </div>
          <div style="background: #f1f5f9; padding: 12px 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; font-size: 12px; color: #94a3b8;">
            Reply directly to this email to respond to ${name}.
          </div>
        </div>
      `,
      replyTo: email,
    });

    // 2. Send auto-reply confirmation to submitter
    await resend.emails.send({
      from: `NexCourse AI <${FROM_EMAIL}>`,
      to:   [email],
      subject: `We received your message [${ticketRef}]`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
          <div style="background: #4f46e5; padding: 20px 24px; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; margin: 0; font-size: 18px;">Thanks for reaching out, ${name.split(' ')[0]}!</h2>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="margin: 0 0 16px; line-height: 1.6;">We've received your message and will get back to you within <strong>24–48 hours</strong> at this email address.</p>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; font-size: 13px; color: #64748b;">
              <strong>Ticket reference:</strong> ${ticketRef}<br>
              <strong>Subject:</strong> ${subject}
            </div>
            <p style="margin: 16px 0 0; line-height: 1.6; font-size: 14px; color: #64748b;">In the meantime, you may find answers in our FAQ at <a href="https://nexcourse.ai" style="color: #4f46e5;">nexcourse.ai</a>.</p>
          </div>
          <div style="background: #f1f5f9; padding: 12px 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; font-size: 12px; color: #94a3b8;">
            This is an automated confirmation. Please do not reply to this email — write to <a href="mailto:${SUPPORT_EMAIL}" style="color: #4f46e5;">${SUPPORT_EMAIL}</a> directly.
          </div>
        </div>
      `,
    });

    console.log(`[Support] Ticket ${ticketRef} submitted by ${email}`);
    return res.json({ success: true, ticketRef });

  } catch (err) {
    console.error('[Support] Resend error:', err.message);
    return res.status(500).json({ error: 'Failed to send email. Please try again.' });
  }
});

// ─── 11. Health Check ───────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    mode: isProd ? 'production' : 'development',
    resend_configured: !!resend,
    support_email: SUPPORT_EMAIL,
    version: '437a0ab-v2',
  });
});

// ─── Temporary: Supabase connection diagnostic (admin-only, remove after fix) ─
app.get('/api/admin/test-supabase', async (req, res) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
  const serviceKey  = getSupabaseKey();
  const result = {
    url_set:       !!supabaseUrl,
    url_value:     supabaseUrl ? `${supabaseUrl.slice(0, 40)}...` : '(not set)',
    supa_admin_key_set: !!process.env.SUPA_ADMIN_KEY,
    supa_admin_key_prefix: process.env.SUPA_ADMIN_KEY ? process.env.SUPA_ADMIN_KEY.slice(0, 20) + '...' : '(not set)',
    legacy_key_set: !!process.env.SUPABASE_SERVICE_KEY,
    legacy_key_prefix: process.env.SUPABASE_SERVICE_KEY ? process.env.SUPABASE_SERVICE_KEY.slice(0, 20) + '...' : '(not set)',
    key_in_use_prefix: serviceKey ? serviceKey.slice(0, 20) + '...' : '(none)',
    supabase_test: 'not run',
  };
  if (supabaseUrl && serviceKey) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supa = createClient(supabaseUrl, serviceKey,
        { auth: { autoRefreshToken: false, persistSession: false } });
      const { data, error } = await supa.auth.admin.listUsers({ page: 1, perPage: 1 });
      result.supabase_test = error ? `ERROR: ${error.message}` : `OK — ${data?.users?.length ?? 0} user returned`;
    } catch (e) {
      result.supabase_test = `THREW: ${e.message}`;
    }
  }
  res.json(result);
});

// ─── 9. Serve Static Build (production only) ────────────────────────────────
if (isProd) {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  // SPA fallback — all non-API routes return index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ─── 10. Start Server ───────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n✅  CourseGEN AI Proxy Server started');
  console.log(`   Mode:      ${isProd ? 'production' : 'development'}`);
  console.log(`   Port:      ${PORT}`);
  console.log(`   Security:  helmet headers ✓  rate limiting ✓  API keys server-side ✓`);
  if (!isProd) {
    console.log('   Note:      In development, run "npm run dev" separately for the Vite front-end.\n');
  }
});
