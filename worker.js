/**
 * worker.js — NexCourse AI Edge Worker
 *
 * Runs at Cloudflare's edge (nexcourse.ai). Responsibilities:
 *  - Proxy /api/* requests to the Render backend (server.js)
 *  - Serve all other requests from the static Vite build (via env.ASSETS)
 *  - SPA fallback: serve index.html for unknown paths (React Router)
 */

const RENDER_API = 'https://nexcourse-ai-api.onrender.com';

/** Headers that cause Cloudflare↔Render loops, 429s, or a stuck Host. */
const HOP_BY_HOP = /^(host|connection|keep-alive|proxy-connection|transfer-encoding|upgrade|cf-connecting-ip|cf-ipcountry|cf-ray|cf-visitor|cf-ew-via|cdn-loop|true-client-ip|x-forwarded-proto|x-forwarded-for|x-real-ip|accept-encoding|content-length)$/i;

/** Fast Render/HTML cold starts only. Do not retry 429 (burns the limiter) or 524 (re-runs a 90s image gen). */
const COLD_START_STATUSES = new Set([502, 503, 520, 521, 522]);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildProxyHeaders(request) {
  const headers = new Headers();
  for (const [key, value] of request.headers) {
    if (HOP_BY_HOP.test(key)) continue;
    headers.set(key, value);
  }
  const clientIp =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (clientIp) headers.set('x-forwarded-for', clientIp);
  return headers;
}

function htmlUpstreamResponse(status, pathnameSearch = '') {
  const isWarmup = status === 502 || status === 503 || status === 520 || status === 521 || status === 522;
  const isRateLimit = status === 429;
  const isTimeout = status === 524 || status === 504;
  const isImage = String(pathnameSearch).startsWith('/api/generate-image');
  return new Response(
    JSON.stringify({
      error: isWarmup
        ? 'Server is warming up — please wait 20–30 seconds and try again.'
        : isRateLimit
          ? (isImage
            ? 'The image API is rate-limited right now. Wait a minute, then click AI again.'
            : 'Too many requests right now. Wait a moment, then try again.')
          : isTimeout
            ? (isImage
              ? 'The image request timed out. Wait a minute, then try Generate AI images again.'
              : 'The request timed out. Try again in a moment.')
            : `API error (${status}). Try again in a moment.`,
      code: isWarmup ? 'COLD_START' : isRateLimit ? 'UPSTREAM_RATE_LIMIT' : isTimeout ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_HTML',
      status: isWarmup ? 503 : isRateLimit ? 429 : isTimeout ? 504 : 502,
      retryAfterMs: isRateLimit ? 20000 : isTimeout ? 15000 : 0,
    }),
    {
      status: isWarmup ? 503 : isRateLimit ? 429 : isTimeout ? 504 : 502,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

async function proxyToRender(request, pathnameSearch) {
  const method = request.method;
  const headers = buildProxyHeaders(request);
  const hasBody = !['GET', 'HEAD'].includes(method);
  // Buffer so HTML 503 retries can resend the same POST (streams are one-shot).
  const body = hasBody ? await request.arrayBuffer() : undefined;
  let lastHtmlStatus = 0;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(4000 * attempt);
    const started = Date.now();
    const renderRes = await fetch(RENDER_API + pathnameSearch, {
      method,
      headers,
      body: hasBody ? body : undefined,
      redirect: 'follow',
    });
    const contentType = renderRes.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const wrapNonJson =
      !isJson && (
        contentType.includes('text/html')
        || renderRes.status === 429
        || renderRes.status === 524
        || renderRes.status === 504
        || (String(pathnameSearch).startsWith('/api/generate-image') && renderRes.status >= 400)
      );
    if (!wrapNonJson) return renderRes;
    lastHtmlStatus = renderRes.status;
    const elapsed = Date.now() - started;
    const retryable = COLD_START_STATUSES.has(renderRes.status) && elapsed < 8000;
    if (!retryable || attempt === 2) {
      return htmlUpstreamResponse(renderRes.status, pathnameSearch);
    }
  }

  return htmlUpstreamResponse(lastHtmlStatus || 502, pathnameSearch);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── Proxy all /api/* requests to Render backend ────────────────────────
    if (url.pathname.startsWith('/api/')) {
      try {
        return await proxyToRender(request, url.pathname + url.search);
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'API proxy error', message: err.message }),
          { status: 502, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }

    // ── Serve static assets ───────────────────────────────────────────────────
    const assetResponse = await env.ASSETS.fetch(request);

    // ── SPA fallback: if asset not found, serve index.html ───────────────────
    // Never rewrite /scorm-player/* — Publish fetches those URLs, and a 200 HTML
    // fallback would overwrite course_data.js / scorm_bridge.js in the zip.
    if (assetResponse.status === 404) {
      if (url.pathname.startsWith('/scorm-player/')) {
        return assetResponse;
      }
      // Never serve index.html for hashed bundles — Mermaid's dynamic import
      // fails with "Failed to fetch dynamically imported module" if a missing
      // /assets/*.js is rewritten to HTML.
      if (
        url.pathname.startsWith('/assets/')
        || /\.(js|mjs|css|map|woff2?|png|jpe?g|gif|webp|svg|json)$/i.test(url.pathname)
      ) {
        return assetResponse;
      }
      const indexUrl = new URL('/', url);
      return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
    }

    return assetResponse;
  },
};
