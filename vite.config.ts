import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { pwaPlugin } from './scripts/pwa-plugin.ts'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), pwaPlugin()],
})
