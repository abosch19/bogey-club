import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import fs from 'node:fs'
import { createHash } from 'node:crypto'

/** Replaces __BUILD_ID__ in dist/sw.js with a digest of the app shell, so the
 *  service worker cache invalidates itself on every deploy that changes the
 *  shell (index.html embeds the asset hashes) — no manual version bumps.
 *  Identical rebuilds produce the same id, so unchanged deploys don't purge. */
function swBuildId(): Plugin {
  const SHELL = [
    'index.html',
    'manifest.json',
    'icon.svg',
    'pwa-192x192.png',
    'pwa-512x512.png',
    'apple-touch-icon-180x180.png',
  ]
  return {
    name: 'sw-build-id',
    apply: 'build',
    closeBundle() {
      const dist = path.resolve(__dirname, 'dist')
      const swPath = path.join(dist, 'sw.js')
      const sw = fs.readFileSync(swPath, 'utf8')
      if (!sw.includes('__BUILD_ID__')) throw new Error('sw.js: __BUILD_ID__ placeholder not found')
      const hash = createHash('sha256')
      for (const f of SHELL) hash.update(fs.readFileSync(path.join(dist, f)))
      fs.writeFileSync(swPath, sw.replaceAll('__BUILD_ID__', hash.digest('hex').slice(0, 8)))
    },
  }
}

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    tailwindcss(),
    swBuildId(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@convex': path.resolve(__dirname, './convex'),
    },
    // Ensure a single React instance (Legend State otherwise loads its own).
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      '@legendapp/state',
      '@legendapp/state/react',
      '@legendapp/state/sync',
      '@legendapp/state/persist-plugins/local-storage',
    ],
  },
  server: {
    port: 3000,
  },
})
