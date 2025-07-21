// vite.config.js
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";

const path = fileURLToPath(import.meta.url);
const root = join(dirname(path), "client");

export default {
  root,
  plugins: [react()],
  build: {
    outDir: join(root, "../dist/client"), 
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false
      }
    }
  }
};
