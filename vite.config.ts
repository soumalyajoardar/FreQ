import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'

// Single source of truth for the version shown in the title bar.
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'))

// Release notes are shown per build, not per version, so a rebuilt/reuploaded
// release still announces itself. Falls back to the version outside git.
function buildId(): string {
  try {
    const sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
    return sha ? `${pkg.version}+${sha}` : `${pkg.version}+local`
  } catch {
    return `${pkg.version}+local`
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_ID__: JSON.stringify(buildId()),
  },
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
