import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    headers: {
      // Required for SharedArrayBuffer (used by snarkjs wasm threading)
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // snarkjs needs these Node shims in the browser
      stream: "stream-browserify",
      "path-browserify": "path-browserify",
    },
  },
  optimizeDeps: {
    include: ["snarkjs"],
    esbuildOptions: {
      target: "esnext",
      // snarkjs uses BigInt which requires esnext
    },
  },
  build: {
    target: "esnext",
  },
}));
