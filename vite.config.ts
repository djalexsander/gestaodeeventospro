import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const isTauri = process.env.TAURI_PLATFORM === "true";

  const plugins = [react(), mode === "development" && componentTagger()].filter(Boolean);

  if (!isTauri) {
    plugins.push(
      VitePWA({
        registerType: "prompt",
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
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "supabase-api",
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 300,
                },
              },
            },
          ],
        },
      }),
    );
  }

  return {
    base: isTauri ? "./" : "/", // 🔥 ESSENCIAL

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
    },

    plugins,

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
