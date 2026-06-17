import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

const isApiOnlyBuild = (mode: string, env: Record<string, string>) =>
  Boolean(String(env.VITE_SHIORI_API_URL ?? '').trim())

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '')
  const apiOnly = isApiOnlyBuild(mode, env)

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: process.env.NODE_ENV !== 'production',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return

            if (id.includes('@supabase/')) return 'supabase'
            if (id.includes('@tanstack/')) return 'query'
            if (id.includes('react-router') || id.includes('@remix-run/router')) return 'router'
            if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor'
            if (id.includes('swiper')) return 'swiper'
            if (id.includes('@radix-ui') || id.includes('radix-ui')) return 'radix'
            if (id.includes('lucide-react') || id.includes('hugeicons-react')) return 'icons'
            if (id.includes('date-fns')) return 'date-fns'
            if (id.includes('/services/supabase')) return 'supabase-legacy'
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(rootDir, 'src'),
        ...(apiOnly
          ? {
              '@supabase/supabase-js': path.resolve(rootDir, 'src/lib/supabase-stub.ts'),
            }
          : {}),
      },
    },
  }
})
