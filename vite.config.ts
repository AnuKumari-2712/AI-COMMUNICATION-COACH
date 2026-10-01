import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Allows the dev server to respond when fronted by a tunnel (e.g.
    // cloudflared) whose Host header isn't localhost. Dev-only.
    allowedHosts: true,
  },
  preview: {
    allowedHosts: true,
  },
})
