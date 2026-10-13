# D035 · Financiamiento · Panel PWA + Web Push (VAPID) de citas nuevas · Implementado

**Título original:** Panel como PWA y avisos Web Push de citas nuevas

**Contexto:** el dueño quiere el panel como app en el teléfono y enterarse al momento cuando
Gaby agenda una cita.

**Decisión:** `app/manifest.ts` + íconos generados con `ImageResponse` (`/icono/[tamano]`) +
`public/sw.js` (solo push, sin caché de páginas: los datos son en vivo). Web Push estándar con
VAPID (librería `web-push` en el bot), no Firebase Cloud Messaging: no exige configurar FCM ni
permisos extra en la cuenta del bot y funciona igual en iPhone instalado. La campana guarda la
suscripción en `suscripcionesPush` (id = SHA-256 del endpoint); el bot avisa tras crear la cita
sin esperar la respuesta y borra las suscripciones dadas de baja (404/410).

**Por qué:** menos piezas que FCM, misma cobertura (Chrome/Edge/Firefox, Safari 16+, iOS 16.4+
instalado). Alternativa vista: FCM con `firebase/messaging` (SDK extra en el cliente y otro
service worker con nombre fijo).
