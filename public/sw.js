/**
 * Service worker del panel (D035). Avisos push y una sola página en caché: la de sin conexión
 * (D039). No guarda el panel en caché (los datos vienen en vivo de Firestore y una versión
 * vieja del panel haría más daño que bien); si una navegación falla por red, sirve esa página.
 *
 * El bot manda un JSON { titulo, cuerpo, url, etiqueta } (lib/notificaciones/tipos.ts).
 */

const CACHE = "sin-conexion-v1";
const PAGINA_SIN_CONEXION = "/sin-conexion.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.add(new Request(PAGINA_SIN_CONEXION, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const nombre of await caches.keys()) {
        if (nombre !== CACHE) await caches.delete(nombre);
      }
      await self.clients.claim();
    })(),
  );
});

// Solo navegaciones: red siempre; si no hay red, la página sin conexión.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(async () => {
      const pagina = await caches.match(PAGINA_SIN_CONEXION, {
        cacheName: CACHE,
      });
      return pagina || Response.error();
    }),
  );
});

self.addEventListener("push", (event) => {
  let aviso = {};
  try {
    aviso = event.data ? event.data.json() : {};
  } catch {
    aviso = { cuerpo: event.data ? event.data.text() : "" };
  }
  const titulo = aviso.titulo || "Inversiones JS";
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: aviso.cuerpo || "",
      icon: "/icono/192",
      badge: "/icono/96",
      tag: aviso.etiqueta || undefined,
      lang: "es",
      data: { url: aviso.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(
    event.notification.data?.url || "/",
    self.location.origin,
  );
  event.waitUntil(
    (async () => {
      // Enlaces externos (Google Calendar) en una ventana nueva; rutas del panel, en la abierta.
      if (url.origin === self.location.origin) {
        const ventanas = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        for (const v of ventanas) {
          if (new URL(v.url).origin === url.origin) {
            await v.focus();
            return v.navigate(url.href);
          }
        }
      }
      return self.clients.openWindow(url.href);
    })(),
  );
});
