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
    rollupOptions: {
      output: {
        manualChunks: (id: string) =>
          id.includes('node_modules/three/') ? 'three' : id.includes('node_modules/@react-three/') ? 'r3f' : id.includes('node_modules/recharts') || id.includes('node_modules/d3-') ? 'charts' : undefined,
      },
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
