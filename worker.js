/**
 * worker.js — NexCourse AI Edge Worker
 *
 * Runs at Cloudflare's edge (nexcourse.ai). Responsibilities:
 *  - Proxy /api/* requests to the Railway backend (server.js)
 *  - Serve all other requests from the static Vite build (via env.ASSETS)
 */

const RAILWAY_API = 'https://coursegen-ai-production.up.railway.app';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── Proxy all /api/* requests to Railway ────────────────────────────────
    if (url.pathname.startsWith('/api/')) {
      const railwayUrl = RAILWAY_API + url.pathname + url.search;

      const proxyRequest = new Request(railwayUrl, {
        method:  request.method,
        headers: request.headers,
        body:    ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'follow',
      });

      try {
        const response = await fetch(proxyRequest);
        // Pass response back with CORS headers intact from Railway's server.js
        return response;
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'API proxy error: ' + err.message }),
          { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // ── Serve static assets for all other routes (SPA) ──────────────────────
    return env.ASSETS.fetch(request);
  },
};
