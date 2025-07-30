import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Reduce chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Enable minification (using default esbuild)
    minify: true,
    // Enable source maps for debugging
    sourcemap: false, // Set to true if you need source maps
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'framer-motion',
      'react-hook-form',
      '@hookform/resolvers',
      'firebase/app',
      'firebase/firestore',
      'firebase/auth',
    ],
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
