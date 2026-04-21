/**
 * worker.js — NexCourse AI Edge Worker
 *
 * Runs at Cloudflare's edge (nexcourse.ai). Responsibilities:
 *  - Proxy /api/* requests to the Railway backend (server.js)
 *  - Serve all other requests from the static Vite build (via env.ASSETS)
 *  - SPA fallback: serve index.html for unknown paths (React Router)
 */

const RAILWAY_API = 'https://coursegen-ai-production.up.railway.app';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── Proxy all /api/* requests to Railway ─────────────────────────────────
    if (url.pathname.startsWith('/api/')) {
      const railwayUrl = RAILWAY_API + url.pathname + url.search;

      const proxyRequest = new Request(railwayUrl, {
        method:  request.method,
        headers: request.headers,
        body:    ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'follow',
      });

      try {
        return await fetch(proxyRequest);
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'API proxy error', message: err.message }),
          { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // ── Serve static assets ───────────────────────────────────────────────────
    const assetResponse = await env.ASSETS.fetch(request);

    // ── SPA fallback: if asset not found, serve index.html ───────────────────
    if (assetResponse.status === 404) {
      const indexUrl = new URL('/', url);
      return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
    }

    return assetResponse;
  },
};
