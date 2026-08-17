/**
 * worker.js — NexCourse AI Edge Worker
 *
 * Runs at Cloudflare's edge (nexcourse.ai). Responsibilities:
 *  - Proxy /api/* requests to the Render backend (server.js)
 *  - Serve all other requests from the static Vite build (via env.ASSETS)
 *  - SPA fallback: serve index.html for unknown paths (React Router)
 */

const RENDER_API = 'https://nexcourse-ai-api.onrender.com';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── Proxy all /api/* requests to Render backend ────────────────────────
    if (url.pathname.startsWith('/api/')) {
      const renderUrl = RENDER_API + url.pathname + url.search;

      const proxyInit = {
        method:  request.method,
        headers: request.headers,
        redirect: 'follow',
      };
      // Forward body for POST/PUT/PATCH — duplex required for streamed bodies (Stripe webhooks).
      if (!['GET', 'HEAD'].includes(request.method)) {
        proxyInit.body = request.body;
        proxyInit.duplex = 'half';
      }
      const proxyRequest = new Request(renderUrl, proxyInit);

      try {
        const renderRes = await fetch(proxyRequest);

        // If Render returns HTML (cold-start splash / error page), don't pretend JSON succeeded
        const contentType = renderRes.headers.get('content-type') ?? '';
        if (contentType.includes('text/html')) {
          const status = renderRes.status;
          const isWarmup = status === 502 || status === 503 || status === 520 || status === 521 || status === 522;
          return new Response(
            JSON.stringify({
              error: isWarmup
                ? 'Server is warming up — please wait 20–30 seconds and try again.'
                : `API error (${status}). If you were saving a draft, try Sync again.`,
              code: isWarmup ? 'COLD_START' : 'UPSTREAM_HTML',
              status,
            }),
            { status: isWarmup ? 503 : 502, headers: { 'Content-Type': 'application/json' } }
          );
        }

        return renderRes;
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
