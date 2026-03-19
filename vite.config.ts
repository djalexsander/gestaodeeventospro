import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  // 🔥 Detecta se é build para Tauri
  const isTauri = process.env.TAURI_ENV === "true";

  return {
    // 🔥 ESSENCIAL para Tauri
    base: "./",

    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },

    plugins: [
      react(),

      // Só no dev
      mode === "development" && componentTagger(),

      // 🔥 PWA NÃO roda no Tauri (corrige o bug dos /assets)
      !isTauri &&
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

            // 🔥 IMPORTANTE
            start_url: "./",

            icons: [
              {
                src: "pwa-192x192.png",
                sizes: "192x192",
                type: "image/png",
              },
              {
                src: "pwa-192x192.png",
                sizes: "512x512",
                type: "image/png",
              },
              {
                src: "pwa-192x192.png",
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
    ].filter(Boolean),

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
