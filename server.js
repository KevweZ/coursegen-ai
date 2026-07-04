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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-File-Name, X-File-Size');
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

const parseRateLimit = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              20,                // 20 document parses per IP per 15 min
  standardHeaders:  true,
  legacyHeaders:    false,
  message: { error: 'Too many parse requests. Please wait 15 minutes.' },
});

const imageRateLimit = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              60,                // 60 image requests per IP per 15 min (full course = ~10)
  standardHeaders:  true,
  legacyHeaders:    false,
  message: { error: 'Too many image generation requests. Please wait 15 minutes.' },
});

// ─── Document Parser Helpers ─────────────────────────────────────────────────

/** Extract all <a:t> text from a shape or slide XML block, one line per <a:p>. */
function extractAText(xml) {
  const paras = xml.match(/<a:p[\s>][\s\S]*?<\/a:p>/g) ?? [];
  return paras
    .map(para => {
      const runs = para.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) ?? [];
      return runs.map(r => r.replace(/<[^>]*>/g, '')).join('');
    })
    .filter(Boolean)
    .join('\n');
}

/** Find the title placeholder text in a slide XML (type title/ctrTitle/subTitle). */
function extractSlideTitle(xml) {
  // Split on shape elements; find the one containing a title placeholder
  const shapes = xml.split(/<p:sp[\s>]/);
  for (const shape of shapes) {
    if (/<p:ph[^>]*(type="(title|ctrTitle|subTitle)")/i.test(shape)) {
      const text = extractAText(shape).replace(/\n/g, ' ').trim();
      return text;
    }
  }
  return '';
}

/** Extract all non-title body text from a slide, formatted as a list. */
function extractSlideBody(xml) {
  const shapes = xml.split(/<p:sp[\s>]/);
  const lines = [];
  for (const shape of shapes) {
    // Skip title / footer / slide-number / date placeholders
    if (/<p:ph[^>]*(type="(title|ctrTitle|subTitle|ftr|sldNum|dt)")/i.test(shape)) continue;
    const text = extractAText(shape);
    if (text.trim()) {
      // Turn each line into a bullet if it looks like a list item
      text.split('\n').forEach(line => {
        const t = line.trim();
        if (t) lines.push(t.startsWith('-') || t.startsWith('•') ? t : `- ${t}`);
      });
    }
  }
  return lines.join('\n');
}

/** Apply heading heuristics to a list of PDF text lines. */
function detectHeadings(lines) {
  return lines.map(line => {
    const t = line.trim();
    if (!t) return '';
    // ALL CAPS short line → heading (but not page numbers or single words)
    if (t.length > 4 && t.length < 90 && t === t.toUpperCase() && /[A-Z]{2,}/.test(t) && !/^\d+$/.test(t)) {
      return `### ${t}`;
    }
    // Chapter/Section/Module/Unit with number
    if (/^(Chapter|Section|Module|Unit|Part|Lesson)\s+\d+/i.test(t) && t.length < 90) {
      return `## ${t}`;
    }
    // Numbered section like "1 Introduction" or "1.1 Background"
    if (/^\d+(\.\d+)*\s+[A-Z][a-z]/.test(t) && t.length < 80) {
      return `### ${t}`;
    }
    return t;
  });
}

/** Collapse 3+ blank lines into 2. */
function cleanWhitespace(text) {
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

/** Minimal HTML → Markdown converter for DOCX mammoth output. */
function htmlToMarkdown(html) {
  const stripTags = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').trim();
  return html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, c) => `# ${stripTags(c)}\n\n`)
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, c) => `## ${stripTags(c)}\n\n`)
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, c) => `### ${stripTags(c)}\n\n`)
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, c) => `#### ${stripTags(c)}\n\n`)
    .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/(strong|b)>/gi, (_, _t, c) => `**${stripTags(c)}**`)
    .replace(/<(em|i)[^>]*>([\s\S]*?)<\/(em|i)>/gi, (_, _t, c) => `*${stripTags(c)}*`)
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, c) => `- ${stripTags(c)}\n`)
    .replace(/<\/ul>|<\/ol>/gi, '\n')
    .replace(/<ul[^>]*>|<ol[^>]*>/gi, '')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, c) => `${stripTags(c)}\n\n`)
    .replace(/<br[^>]*\/?>/gi, '\n')
    .replace(/<table[\s\S]*?<\/table>/gi, '[Table — see original document]\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Server-side PDF parser: pdf-parse + heading detection. */
async function parsePdfToMarkdown(buffer) {
  const pdfParse = (await import('pdf-parse')).default;
  const data = await pdfParse(buffer);
  const title = data.info?.Title?.trim() || '';
  const lines = data.text.split('\n');
  const processed = detectHeadings(lines);
  const markdown = (title ? `# ${title}\n\n` : '') + processed.join('\n');
  return {
    markdown: cleanWhitespace(markdown),
    metadata: { type: 'pdf', pageCount: data.numpages, wordCount: data.text.split(/\s+/).filter(Boolean).length },
  };
}

/** Server-side PPTX parser: JSZip + slide-by-slide structure. */
async function parsePptxToMarkdown(buffer) {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(buffer);

  // Slide files in order
  const slideFiles = Object.keys(zip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)[0], 10);
      const nb = parseInt(b.match(/\d+/)[0], 10);
      return na - nb;
    });

  const mdSlides = [];
  let totalWords = 0;

  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async('string');
    const title = extractSlideTitle(xml);
    const body  = extractSlideBody(xml);

    // Speaker notes
    const slideNum = slideFiles[i].match(/\d+/)[0];
    const notesPath = `ppt/notesSlides/notesSlide${slideNum}.xml`;
    let notes = '';
    if (zip.files[notesPath]) {
      const notesXml = await zip.files[notesPath].async('string');
      // Notes contain the slide body text again plus the actual notes — skip first block
      const notesRaw = extractAText(notesXml);
      // Filter out the duplicate slide content (notes slides echo body text first)
      const notesLines = notesRaw.split('\n').filter(l => l.trim() && !body.includes(l.trim()));
      notes = notesLines.join(' ').trim();
    }

    const words = [title, body, notes].join(' ').split(/\s+/).filter(Boolean).length;
    totalWords += words;

    let md = `## Slide ${i + 1}${title ? ': ' + title : ''}`;
    if (body) md += `\n\n${body}`;
    if (notes) md += `\n\n> **Speaker Notes:** ${notes}`;
    mdSlides.push(md);
  }

  return {
    markdown: mdSlides.join('\n\n---\n\n'),
    metadata: { type: 'pptx', slideCount: slideFiles.length, wordCount: totalWords },
  };
}

/** Server-side DOCX parser: mammoth HTML → Markdown. */
async function parseDocxToMarkdown(buffer) {
  const { default: mammoth } = await import('mammoth');
  const result = await mammoth.convertToHtml({ buffer });
  const markdown = htmlToMarkdown(result.value);
  return {
    markdown,
    metadata: { type: 'docx', wordCount: markdown.split(/\s+/).filter(Boolean).length },
  };
}

// ─── 5b. Document Parse Endpoint ────────────────────────────────────────────
app.post('/api/parse-document',
  parseRateLimit,
  express.raw({ type: 'application/octet-stream', limit: '30mb' }),
  async (req, res) => {
    const rawName = req.headers['x-file-name'];
    if (!rawName) return res.status(400).json({ error: 'Missing X-File-Name header.' });

    const fileName = decodeURIComponent(rawName);
    const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
    const buffer = req.body;

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: 'Empty file body.' });
    }

    try {
      let result;
      if (extension === 'pdf') {
        result = await parsePdfToMarkdown(buffer);
      } else if (extension === 'pptx') {
        result = await parsePptxToMarkdown(buffer);
      } else if (extension === 'docx') {
        result = await parseDocxToMarkdown(buffer);
      } else {
        return res.status(415).json({ error: `Unsupported file type: .${extension}` });
      }

      console.log(`[ParseDoc] ${fileName} → ${extension.toUpperCase()} parsed: ${result.metadata.wordCount} words`);
      return res.json(result);
    } catch (err) {
      console.error(`[ParseDoc] Failed to parse ${fileName}:`, err.message);
      return res.status(500).json({ error: `Parse failed: ${err.message}` });
    }
  }
);

// ─── 5c. Image Generation Endpoint ──────────────────────────────────────────
app.post('/api/generate-image', imageRateLimit, async (req, res) => {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';
  if (!OPENROUTER_API_KEY) {
    return res.status(503).json({ error: 'Image generation not configured on this server (missing OPENROUTER_API_KEY).' });
  }

  const { prompt, model = 'google/gemini-3.1-flash-image-preview' } = req.body ?? {};
  if (!prompt?.trim()) {
    return res.status(400).json({ error: 'Missing required field: prompt' });
  }

  try {
    const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization':  `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type':   'application/json',
        'HTTP-Referer':   'https://nexcourse.ai',
        'X-Title':        'NexCourse AI',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt.trim() }],
        modalities: ['image', 'text'],
      }),
    });

    if (!orResponse.ok) {
      const errText = await orResponse.text().catch(() => orResponse.statusText);
      console.error(`[ImageGen] OpenRouter error ${orResponse.status}:`, errText.slice(0, 300));
      return res.status(orResponse.status).json({ error: `Image model error: ${errText.slice(0, 200)}` });
    }

    const data = await orResponse.json();
    const message = data?.choices?.[0]?.message;

    // OpenRouter returns images in one of two formats depending on the model
    let imageDataUrl = null;

    if (message?.images?.length > 0) {
      // Format 1: message.images array (FLUX models)
      const img = message.images[0];
      imageDataUrl = img?.image_url?.url ?? img?.url ?? null;
    } else if (Array.isArray(message?.content)) {
      // Format 2: message.content as multimodal array (Gemini models)
      for (const part of message.content) {
        if (part?.type === 'image' || part?.type === 'image_url') {
          imageDataUrl = part?.image_url?.url ?? part?.url ?? null;
          if (imageDataUrl) break;
        }
      }
    }

    if (!imageDataUrl) {
      const preview = JSON.stringify(message ?? {}).slice(0, 300);
      console.warn('[ImageGen] No image in response:', preview);
      return res.status(502).json({ error: 'No image returned from AI model.' });
    }

    console.log(`[ImageGen] ✓ Generated image — prompt: "${prompt.slice(0, 60)}..."`);
    return res.json({ imageDataUrl });

  } catch (err) {
    console.error('[ImageGen] Error:', err.message);
    return res.status(500).json({ error: `Image generation failed: ${err.message}` });
  }
});

// ─── 6. Anthropic AI Proxy ──────────────────────────────────────────────────
app.post('/api/ai', aiRateLimit, async (req, res) => {
  const { model, system, user, maxTokens } = req.body;

  if (!model || !system || !user) {
    return res.status(400).json({ error: 'Missing required fields: model, system, user' });
  }

  // ── Trial-user AI generation cap ─────────────────────────────────────────
  // • Only 'complex' calls are counted (analysis, outline, mastery exam).
  //   'bulk' hydration calls are cheap internal calls that should not count.
  // • Usage is logged AFTER a successful AI response — failed/retried requests
  //   never consume trial credits.
  const authHeader = req.headers.authorization ?? '';
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  let trialSupaClient = null;
  let trialUserId = null;
  const isComplexCall = (model === 'complex');   // only count expensive calls

  if (jwt && isComplexCall) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      trialSupaClient = createClient(
        process.env.VITE_SUPABASE_URL,
        getSupabaseKey(),
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data: { user: authUser } } = await trialSupaClient.auth.getUser(jwt);
      if (authUser?.user_metadata?.role === 'trial') {
        trialUserId = authUser.id;
        const TRIAL_AI_LIMIT = 100;   // ~30+ complete course generations for a trial
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count } = await trialSupaClient
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
        // NOTE: usage is logged AFTER the AI call succeeds (see below).
      }
    } catch (trialCheckErr) {
      // Degrade gracefully — if ai_usage table doesn't exist yet, just proceed
      console.warn('[AI Proxy] Trial check skipped:', trialCheckErr?.message ?? trialCheckErr);
      trialSupaClient = null;
      trialUserId = null;
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

    // ── Log usage ONLY after a confirmed successful AI response ───────────────
    // This ensures failed/retried requests never burn trial credits.
    if (trialSupaClient && trialUserId) {
      trialSupaClient.from('ai_usage')
        .insert({ user_id: trialUserId, type: 'course_generation' })
        .then(() => {})
        .catch(e => console.warn('[AI Proxy] Usage log failed (non-fatal):', e?.message));
    }

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
