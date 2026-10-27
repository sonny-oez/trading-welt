import fs from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import type { Connect, Plugin } from 'vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const deskFile = path.resolve('src/data/desk-status.json');

function deskStatusPlugin(): Plugin {
  const serve: Connect.NextHandleFunction = (req, res, next) => {
    const url = (req.url ?? '').split('?')[0];
    if (!url.endsWith('/desk-status.json')) {
      next();
      return;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    fs.createReadStream(deskFile).pipe(res);
  };

  return {
    name: 'desk-status',
    configureServer(server) {
      server.middlewares.use(serve);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serve);
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'desk-status.json',
        source: fs.readFileSync(deskFile),
      });
    },
  };
}

export default defineConfig({
  base: '/trading-welt/',
  plugins: [
    react(),
    deskStatusPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'Trading-Welt',
        short_name: 'Trading-Welt',
        description: 'Recherche-Desk und öffentlicher Hyperliquid-Markt. Kein Handel.',
        lang: 'de',
        dir: 'ltr',
        id: '/trading-welt/',
        start_url: '/trading-welt/',
        scope: '/trading-welt/',
        display: 'standalone',
        background_color: '#07080d',
        theme_color: '#07080d',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        globIgnores: ['**/desk-status.json'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/desk-status\.json$/],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.hyperliquid\.xyz\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /desk-status\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'desk-status',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 2, maxAgeSeconds: 120 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2022',
  },
});
