# D039 · PWA · El service worker guarda en caché solo `sin-conexion.html` y la sirve si falla una navegación · Implementado

**Contexto:** el panel es una PWA (D035) y, sin red, el navegador mostraba su propio error. La
adenda de diseño (`docs/HANDOFF.md` §1) pide una pantalla "Sin conexión" de la marca.

**Decisión:** `public/sin-conexion.html` es autocontenida (sin fuentes, CSS ni JS externos; sigue
el tema del sistema). `public/sw.js` la guarda al instalarse (`sin-conexion-v1`) y, solo para
navegaciones, va siempre a la red y la sirve si el `fetch` falla. Se recarga sola al volver la
conexión. Nada más del panel entra en caché.

**Por qué:** respeta D035 (nunca una versión vieja del panel ni de los datos) y da una pantalla
útil sin red. Cambiar la página exige subir `CACHE` a `-v2`.

**Alternativa descartada:** una ruta de Next (`/sin-conexion`) en caché: depende de chunks JS y
CSS que no están en caché, y cachearlos rompería D035.
