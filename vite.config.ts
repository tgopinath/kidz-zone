import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      // Map Explorer was a Next.js app: its "@/…" imports and next/link + next/navigation map onto small shims.
      { find: /^@\//, replacement: here('./src/worlds/maps/') },
      { find: /^next\/link$/, replacement: here('./src/worlds/maps/next-shim/link.tsx') },
      { find: /^next\/navigation$/, replacement: here('./src/worlds/maps/next-shim/navigation.ts') },
    ],
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rolldownOptions: {
      output: {
        // React and its small shared helpers form one chunk. Heavy libraries (three.js and React Three Fiber for the
        // Shop's 3D store, recharts for the grown-ups and Puzzle Quest charts) are left to Rolldown's automatic
        // splitting, so they load only with the lazy worlds that import them, never on Home. (Manual groups for
        // them captured shared React internals and made Home preload 1.4 MB.)
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|react-is|use-sync-external-store|zustand)[\\/]/, priority: 30 },
          ],
        },
      },
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
