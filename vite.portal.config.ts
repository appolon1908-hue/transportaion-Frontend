import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@portal': fileURLToPath(new URL('./src/portal', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist-portal',
    emptyOutDir: true,
    sourcemap: false,
    manifest: true,
    rollupOptions: {
      input: fileURLToPath(new URL('./portal.html', import.meta.url)),
    },
  },
})
