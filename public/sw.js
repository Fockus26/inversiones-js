/**
 * Service worker del panel (D035). Solo avisos push: no guarda páginas en caché (los datos
 * vienen en vivo de Firestore y una versión vieja del panel haría más daño que bien).
 *
 * El bot manda un JSON { titulo, cuerpo, url, etiqueta } (lib/notificaciones/tipos.ts).
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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
