import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
    // ── Security: DO NOT inject API keys into the client bundle ──────────────
    // Previously GEMINI_API_KEY was inlined here — this has been removed.
    // All AI/TTS calls now route through /api/* on the Express proxy server (server.js)
    // where keys are stored securely as server-side environment variables only.
    define: {},
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
        'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // ── Development proxy: forward /api/* to the Express server ─────────
      // Run "node server.js" alongside "npm run dev" in development.
      proxy: {
        '/api': {
          target: `http://localhost:${env.PORT ?? 3001}`,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
