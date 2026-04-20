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

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT      = process.env.PORT ?? 3001;
const isProd    = process.env.NODE_ENV === 'production';

// ─── 1. Startup Environment Validation ──────────────────────────────────────
const REQUIRED_VARS = ['ANTHROPIC_API_KEY', 'SUPABASE_SERVICE_KEY'];
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

// ─── 6. Anthropic AI Proxy ──────────────────────────────────────────────────
app.post('/api/ai', aiRateLimit, async (req, res) => {
  const { model, system, user, maxTokens } = req.body;

  if (!model || !system || !user) {
    return res.status(400).json({ error: 'Missing required fields: model, system, user' });
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

// ─── 8. Health Check ────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', mode: isProd ? 'production' : 'development' });
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
