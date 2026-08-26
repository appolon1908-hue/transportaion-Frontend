import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: "e2e-app",
  plugins: [vue()],
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
    fs: {
      allow: [projectRoot],
    },
  },
  define: {
    __BUILD_SHA__: JSON.stringify(process.env.GITHUB_SHA ?? "e2e"),
  },
});
