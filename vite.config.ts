import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync } from "fs";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig(({ mode }) => {
  const isTauri = process.env.TAURI_ENV_PLATFORM === "windows" || process.env.TAURI_ENV_PLATFORM === "darwin";

  const plugins = [react(), mode === "development" && componentTagger()].filter(Boolean);

  if (!isTauri) {
    plugins.push(
      VitePWA({
        registerType: "prompt",
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        injectManifest: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        },
        includeAssets: ["favicon.ico", "pwa-192x192.png"],
        manifest: {
          name: "Gestão de Eventos Pro",
          short_name: "Eventos Pro",
          description: "Plataforma de gestão de eventos",
          theme_color: "#6366f1",
          background_color: "#0f172a",
          display: "standalone",
          start_url: "./",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
      }),
    );
  }

  return {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },

    base: "./", // 🔥 FORÇADO PARA TAURI

    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },

    build: {
      outDir: "dist",
      assetsDir: "assets",
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom"],
            supabase: ["@supabase/supabase-js"],
            ui: ["@radix-ui/react-dialog", "@radix-ui/react-popover", "@radix-ui/react-select", "@radix-ui/react-tabs"],
            charts: ["recharts", "d3-shape", "d3-scale", "d3-interpolate"],
            motion: ["framer-motion"],
          },
        },
      },
    },

    plugins,

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        // Tauri builds disable vite-plugin-pwa, so the virtual module does not
        // exist. Point it at a no-op stub so rollup can resolve the import.
        ...(isTauri
          ? { "virtual:pwa-register": path.resolve(__dirname, "./src/lib/pwa-register-stub.ts") }
          : {}),
      },
    },
  };
});