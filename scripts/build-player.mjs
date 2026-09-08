/**
 * SCORM player must be a production React build.
 * Vite sets isProduction from process.env.NODE_ENV === "production" only;
 * without that, esbuild emits jsxDEV + absolute fileName paths into player.js.
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

process.env.NODE_ENV = 'production';

const root = path.dirname(fileURLToPath(new URL('.', import.meta.url)));
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');

const child = spawn(
  process.execPath,
  [viteBin, 'build', '--mode', 'production', '-c', 'vite.player.config.ts'],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' },
  },
);

child.on('exit', (code) => {
  if (code !== 0) process.exit(code ?? 1);
  const html = readFileSync(path.join(root, 'public', 'scorm-player', 'index.html'), 'utf8');
  const leaks = [];
  if (/fileName:\s*["'][A-Za-z]:[\\/]/.test(html) || /fileName:\s*["']\/Users\//.test(html)) {
    leaks.push('React DEV absolute fileName paths');
  }
  if (/[A-Za-z]:\/Users\/[^"'\\s]+/.test(html) || /\/Users\/[^"'\\s]+\/(?:Desktop|Documents)\//.test(html)) {
    leaks.push('absolute local user paths');
  }
  if (/MillionaireGame\.tsx/.test(html) || /game-templates\/templates\//.test(html)) {
    leaks.push('unused game template source paths');
  }
  if (leaks.length) {
    console.error('[build:player] Refusing to ship a leaky SCORM player:', leaks.join(', '));
    process.exit(1);
  }
  console.log('[build:player] Production player OK (no local paths / game source paths).');
  process.exit(0);
});
