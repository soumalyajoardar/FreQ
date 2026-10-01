import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // Build outputs churn constantly (packager staging, dist rebuilds) —
      // watching them exhausts file handles and crashes the dev server.
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/dist-electron/**',
        '**/release/**',
        '**/electron-dist/**',
        '**/build/yt-dlp.exe',
      ],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})
