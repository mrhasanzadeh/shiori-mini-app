import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // No proxy needed; app uses Supabase SDK directly
  },
  build: {
    outDir: "dist",
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
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
