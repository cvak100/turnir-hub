import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    host: "0.0.0.0",
    proxy: {
      // Vse naprave (LAN/internet) kličejo samo :3000; Vite forwarda na Django
      "/api": {
        target: "http://127.0.0.1:61106",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://127.0.0.1:61106",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
