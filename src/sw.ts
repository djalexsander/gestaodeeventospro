/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { clientsClaim } from "workbox-core";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Assume o controle dos clientes já abertos assim que ativar (essencial no
// Android, onde o processo do PWA permanece vivo entre "fechamentos").
clientsClaim();

self.addEventListener("activate", () => {
  console.info("[SW] activated", self.registration.scope);
});

// Navegações (HTML) sempre NetworkFirst — nunca cache-first, para o app
// perceber novas versões assim que voltar a ter rede.
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: "html-navigations",
      networkTimeoutSeconds: 10,
      plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 })],
    }),
    { denylist: [/^\/~oauth/] },
  ),
);

registerRoute(
  ({ url }) => /\.supabase\.co$/i.test(url.hostname),
  new NetworkFirst({
    cacheName: "supabase-api",
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 300 })],
  }),
);

self.addEventListener("message", (event) => {
  if ((event.data as { type?: string })?.type === "SKIP_WAITING") {
    console.info("[SW] SKIP_WAITING received");
    void self.skipWaiting();
  }
});

interface PushPayload {
  title?: string;
  body?: string;
  type?: string;
  eventId?: string;
  url?: string;
  notificationId?: string | null;
}

self.addEventListener("push", (event) => {
  let payload: PushPayload = {};
  try {
    payload = event.data ? (event.data.json() as PushPayload) : {};
  } catch {
    payload = { title: "Gestão de Eventos Pro", body: event.data?.text() ?? "" };
  }

  const title = payload.title || "Gestão de Eventos Pro";
  const url = payload.url || (payload.eventId ? `/#/eventos/${payload.eventId}` : "/#/eventos");

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      tag: payload.eventId ? `event-${payload.eventId}-${payload.type ?? ""}` : undefined,
      renotify: !!payload.eventId,
      data: { url, eventId: payload.eventId ?? null, notificationId: payload.notificationId ?? null },
    } as NotificationOptions),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data as { url?: string })?.url || "/#/eventos";

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const scopeUrl = new URL(self.registration.scope);
      const absolute = new URL(target, scopeUrl).href;

      for (const client of clientsList) {
        if (new URL(client.url).origin === scopeUrl.origin) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(absolute);
            } catch {
              client.postMessage({ type: "NAVIGATE", url: target });
            }
          }
          return;
        }
      }
      await self.clients.openWindow(absolute);
    })(),
  );
});