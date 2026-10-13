# D032 — Clientes con financiamiento en `clientesCelulares` y `clientesRcv`

**Contexto:** el cliente quiere registrar a quién le vendió a crédito (celulares y pólizas RCV)
y marcar qué cuotas pagó cada uno. Es distinto de la agenda (citas en Google Calendar).

**Decisión:** dos colecciones, un documento por cliente con su plan de pagos embebido
(`pagos.cuotas`, a lo sumo 60). Las cuotas se generan desde la primera fecha y la frecuencia
(semanal = 7 días, quincenal = 15 días, mensual = mismo día del mes); al editar el plan se
regeneran conservando las ya pagadas por número. Fechas como `"AAAA-MM-DD"` del día de Caracas
(sin hora: no se corren por el huso y se comparan como texto). Página `/clientes` con pestañas
Celulares / Póliza RCV; las solicitudes del chat tienen «Registrar cliente» que rellena la ficha.
Reglas: solo admins, huella, límites de tamaño (las reglas no recorren listas).

**Por qué:** un cliente se lee y se escribe entero en una operación, el panel ya escucha en vivo
y no hace falta consultar subcolecciones para pintar la lista.

# D033 — Recordatorios de vencimiento de la póliza RCV desde el bot

**Contexto:** la póliza dura un año; el cliente quiere que se le escriba al cliente cuando falte
un mes y otra vez a los 3 días si no la renovó.

**Decisión:** `clientesRcv` guarda `emision`, `vence` (= emisión + 1 año), `recordatorio30` y
`recordatorio3`. El bot revisa cada hora (9:00–19:00 de Caracas), toma los que vencen en ≤ 30
días y manda el aviso que toque (`avisoPendiente` en `lib/financiamiento/poliza.ts`), marcando
antes en una transacción que verifica que `vence` no cambió. «Renovar» en el panel mueve las
fechas un año y reinicia los avisos, así que el de 3 días no sale si ya renovó. Vencida, el bot
ya no avisa. La cuenta del bot (Datastore User, D030) escribe esos dos campos.

**Por qué:** mismo patrón que los recordatorios de citas (marcar y luego enviar: mejor perder
un aviso que duplicarlo) y sin depender de Cloud Functions ni de un cron externo.

# D034 — Requisitos comunes a todos los vehículos; placas extranjeras sin planes

**Contexto:** los requisitos no dependen del tipo de vehículo (cédula, título/carnet de
circulación/certificado de origen, correo, teléfono, dirección). Placas extranjeras no tiene
precio fijo: se cotiza según el vehículo.

**Decisión:** `configuracion/rcv.requisitosGenerales` (una lista) reemplaza a `requisitos` por
categoría; el panel borra el campo viejo al guardar y las reglas lo siguen aceptando mientras
exista. Los planes solo llevan `publico`/`privado`; el plan `placas-extranjeras` sale del seed
(en producción hay que borrarlo a mano desde /rcv). En el chat, «Placas extranjeras» muestra
los requisitos, pide el vehículo y guarda la solicitud con `vehiculo` y precios `null`.

**Por qué:** el cliente edita una sola lista y el chat deja de inventar un «plan» para algo que
en realidad es una cotización.

# D035 — Panel como PWA y avisos Web Push de citas nuevas

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

# D036 — Tasas de dólares y pesos automáticas (mercado) o manuales

**Contexto:** el cliente quiere que 1 € en $ y en COP salgan solos, con el valor que muestra
Google al buscar "1 euro en dólares", y poder escribirlos a mano si prefiere.

**Decisión:** `configuracion/rcv` suma `fuenteUsd` y `fuenteCop` (`"mercado"` o `"manual"`; sin
el campo = manual). Google no tiene API (sus cifras son de proveedores de mercado), así que se
usa ExchangeRate-API (`open.er-api.com/v6/latest/EUR`, gratis, sin clave, actualiza a diario) y,
si falla, la currency-api de jsDelivr (`@fawazahmed0/currency-api`). Mismo esquema que el BCV
(D031): el panel la pide a `/api/tasa-mercado` (caché de CDN 15 min), el bot directo con caché
de 30 min, y `tasaUsd`/`tasaCop` quedan como respaldo que el panel refresca al abrirse.

**Por qué:** gratis, sin registro y con fuente de respaldo. Difiere de Google en céntimos porque
se actualiza una vez al día, no al minuto; para cotizar pólizas basta.

# D037 — Modo demo del panel con `?demo` (datos de ejemplo en memoria)

**Contexto:** el cliente quiere ver en producción cómo se ve la sección Clientes con casos
variados (al día, atrasados, pólizas por vencer…) sin cargar datos falsos en su base.

**Decisión:** abrir cualquier página del panel con `?demo` lo activa para esa pestaña
(`sessionStorage`; sobrevive al inicio de sesión). En modo demo, `lib/financiamiento/repositorio.ts`
desvía lecturas y escrituras de `clientesCelulares`/`clientesRcv` a un almacén en memoria
(`lib/financiamiento/demo.ts`) cargado con `datos-demo.ts`, los mismos casos del seed del
emulador. Se puede crear, editar, borrar y marcar cuotas; nada llega a Firestore y al recargar
vuelve al ejemplo. Una franja lo avisa y trae «Salir de la demo» (o `?demo=0`). Sigue exigiendo
sesión de admin; Celulares y Póliza RCV muestran los datos reales.

**Por qué:** cero riesgo de mezclar datos de prueba con los reales y no hace falta otro proyecto
de Firebase para enseñar la función.

# D038 — El service worker guarda en caché solo la página sin conexión

**Contexto:** el panel es una PWA (D035) y, sin red, el navegador mostraba su propio error.
La adenda de diseño pide una pantalla "Sin conexión" de la marca.

**Decisión:** `public/sin-conexion.html` es una página autocontenida (sin fuentes, CSS ni JS
externos; sigue el tema del sistema). `public/sw.js` la guarda al instalarse (`sin-conexion-v1`)
y, solo para navegaciones, va siempre a la red y la sirve si el `fetch` falla. Se recarga sola
al volver la conexión. Nada más del panel entra en caché.

**Por qué:** mantiene lo decidido en D035 (nunca una versión vieja del panel ni de los datos)
y da una pantalla útil sin red. Cambiar la página exige subir `CACHE` a `-v2`.
