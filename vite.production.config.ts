import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: "dist-production",
    emptyOutDir: true,
    sourcemap: false,
    manifest: true,
    target: "es2022",
    cssCodeSplit: true,
    reportCompressedSize: true,
    rollupOptions: {
      input: "index.production.html",
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
        manualChunks: {
          vue: ["vue", "vue-router", "pinia"],
        },
      },
    },
  },
  define: {
    __BUILD_SHA__: JSON.stringify(process.env.GITHUB_SHA ?? "development"),
  },
});
