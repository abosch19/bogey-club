import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    tailwindcss(),
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
