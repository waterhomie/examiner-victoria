import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const proxy = {
  "/api": {
    target: process.env.VITE_PROXY_TARGET || "http://127.0.0.1:8010",
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: true,
    proxy,
  },
  preview: {
    port: 5173,
    allowedHosts: true,
    proxy,
  },
});
