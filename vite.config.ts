import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const isTauri = process.env.TAURI_ENV === "true";

  return {
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

      mode === "development" && componentTagger(),

      // 🔥 PWA só roda no web, NÃO no Tauri
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
        }),
    ].filter(Boolean),

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
