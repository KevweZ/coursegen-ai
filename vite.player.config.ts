process.env.NODE_ENV = 'production';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** Replace game templates with a stub so SCORM player.js does not ship unused game source. */
function stubScormGames(): Plugin {
  const stub = path.resolve(__dirname, 'src/components/game-templates/core/GameContainer.scorm-stub.tsx');
  return {
    name: 'stub-scorm-games',
    enforce: 'pre',
    resolveId(source) {
      if (
        source.includes('game-templates/core/GameContainer') &&
        !source.includes('GameContainer.scorm-stub')
      ) {
        return stub;
      }
      return null;
    },
  };
}

// Always production: a development React build inlines jsxDEV + absolute fileName
// paths (local username, repo folders) into the SCORM player.js that LMS users can open.
export default defineConfig(() => {
  process.env.NODE_ENV = 'production';
  return {
    mode: 'production',
    base: './',
    plugins: [
      stubScormGames(),
      react({ jsxRuntime: 'automatic' }),
      tailwindcss(),
      viteSingleFile({ removeViteModuleLoader: true }),
    ],
    build: {
      outDir: 'public/scorm-player',
      emptyOutDir: false,
      copyPublicDir: false,
      cssCodeSplit: false,
      modulePreload: false,
      minify: 'esbuild',
      sourcemap: false,
      cssMinify: true,
      reportCompressedSize: false,
    },
    esbuild: {
      legalComments: 'none',
      jsxDev: false,
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env.GEMINI_API_KEY': JSON.stringify(''),
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
        'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
      },
    },
  };
});
