/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin, type ResolvedConfig } from 'vite';

function collectDistFiles(dir: string, baseDir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectDistFiles(full, baseDir));
    } else if (entry.isFile()) {
      const rel = path.relative(baseDir, full).replace(/\\/g, '/');
      if (rel === 'sw.js' || rel.endsWith('.map')) continue;
      results.push(rel);
    }
  }
  return results;
}

function offlinePwaPlugin(): Plugin {
  let resolvedConfig: ResolvedConfig;
  return {
    name: 'mikrotik-offline-pwa',
    apply: 'build',
    configResolved(cfg) {
      resolvedConfig = cfg;
    },
    closeBundle() {
      const outDir = path.resolve(resolvedConfig.root, resolvedConfig.build.outDir);
      if (!fs.existsSync(outDir)) return;

      const assets = collectDistFiles(outDir, outDir).sort();
      const fingerprint = crypto.createHash('sha256');
      for (const rel of assets) {
        const stat = fs.statSync(path.join(outDir, rel));
        fingerprint.update(`${rel}:${stat.size};`);
      }
      const cacheVersion = fingerprint.digest('hex').slice(0, 10);

      const swSource = `// Auto-generated offline precache service worker (${cacheVersion})
const CACHE_PREFIX = 'mt-hotspot-cache-';
const CACHE_NAME = CACHE_PREFIX + ${JSON.stringify(cacheVersion)};
const FONT_CACHE = 'mt-hotspot-fonts-v1';
const PRECACHE_FILES = ${JSON.stringify(assets, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const scope = self.registration.scope;
      const existingKeys = await caches.keys();
      const isFirstInstall = !existingKeys.some((k) => k.startsWith(CACHE_PREFIX));
      const urls = Array.from(new Set([scope, ...PRECACHE_FILES.map((file) => new URL(file, scope).toString())]));
      await Promise.all(
        urls.map(async (u) => {
          const response = await fetch(new Request(u, { cache: 'reload' }));
          if (!response.ok) throw new Error('Precache fetch failed for ' + u);
          await cache.put(u, response);
        })
      );
      if (isFirstInstall) {
        await self.skipWaiting();
      }
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const scope = self.registration.scope;

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const indexUrl = new URL('index.html', scope).toString();
        const cached = (await cache.match(indexUrl)) || (await cache.match(scope));
        if (cached) return cached;
        return fetch(req);
      })()
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        if (cached) return cached;
        const response = await fetch(req);
        if (response && response.ok) {
          cache.put(req, response.clone());
        }
        return response;
      })()
    );
    return;
  }

  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(FONT_CACHE);
        const cached = await cache.match(req);
        const networkPromise = fetch(req)
          .then((res) => {
            if (res && (res.ok || res.type === 'opaque')) {
              cache.put(req, res.clone());
            }
            return res;
          })
          .catch(() => null);
        if (cached) return cached;
        const netRes = await networkPromise;
        return netRes || new Response('', { status: 204 });
      })()
    );
  }
});
`;
      fs.writeFileSync(path.join(outDir, 'sw.js'), swSource, 'utf8');
    },
  };
}

export default defineConfig(({ command }) => {
  return {
    base: command === 'serve' ? '/' : (process.env.GITHUB_BASE_PATH || './'),
    plugins: [react(), tailwindcss(), offlinePwaPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/lucide-react')) {
              return 'lucide-icons';
            }
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')
            ) {
              return 'react-vendor';
            }
          },
        },
      },
    },
  };
});
