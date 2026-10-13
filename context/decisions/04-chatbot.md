# D020 — Texto de la lista: mismo formato que el cliente manda por chat

`lib/catalogo/texto-lista.ts` (puro, sin Firebase) arma `Lista de precios actualizada (DD/MM)`,
una línea en blanco, y un bloque por marca (alfabético desde D025, en mayúsculas, marcas vacías se
omiten). Por producto dos líneas: `<nombre> <variante>` y `Inic 125$.   6 quincenas 63# D020 — Texto de la lista: mismo formato que el cliente manda por chat

`lib/catalogo/texto-lista.ts` (puro, sin Firebase) arma `Lista de precios actualizada (DD/MM)`,

(tres espacios, "quincenas" en minúscula). Una línea en blanco entre productos y dos entre
marcas, como en el texto original del cliente (29/09). Dentro de la marca, por `orden`. Montos
con hasta 2 decimales. Los nombres salen como están en Firestore (normalizados en el seed).

# D021 — Agotados marcados por defecto; fecha en hora de Caracas

`activo == false` se omite siempre. `cantidad == 0`: `{ agotados: "marcar" }` (por defecto) añade
` (agotado)`; `"ocultar"` lo quita. Se marca por defecto porque ocultar un equipo hace que el
chatbot diga "no lo tenemos" cuando sí se trabaja. Ojo: el seed arranca con `cantidad = 0`.
El `DD/MM` usa `America/Caracas` por defecto (supuesto: precios en USD y pago quincenal); el
servidor del chatbot suele estar en UTC. Ambos son parámetros.

# D022 — Alta de admins por script con contraseña temporal

`bun run admin:crear <correo> (--emulador | --prod)`: crea o encuentra el usuario en Auth y crea
`admins/{uid}`. Si el usuario es nuevo, contraseña aleatoria (24 caracteres) impresa una sola
vez; si ya existía, su contraseña no se toca. Producción exige `--prod` y
`GOOGLE_APPLICATION_CREDENTIALS`; con emulador, el proyecto debe ser `demo-*`.

# D023 — Seed de producción que no pisa ediciones

`bun run seed:produccion --prod` crea solo los productos del catálogo inicial que no existen
(por id estable); `--forzar` los reescribe enteros. `--emulador --proyecto=demo-x` permite
ensayarlo sin tocar los datos de desarrollo. Mismas salvaguardas que D022.

# D024 — El chatbot lee con una cuenta de solo lectura y caché de 60 s

Cuenta de servicio aparte con `roles/datastore.viewer` (no la de Firebase Admin). Consulta
`productos where activo == true` con el Admin SDK. Recomendado: caché en memoria de 60 s
(cambios visibles en < 1 min, pocas lecturas); `onSnapshot` solo si el chatbot es un proceso
persistente. Detalle en `docs/chatbot.md`.

# D027 — Bot propio (Bun) en `bot/` en vez de n8n; horario en Firestore, citas en Calendar

**Contexto:** el flujo de WhatsApp necesita estado por conversación, leer el catálogo y agendar
citas contra Google Calendar. El documento inicial proponía n8n.

**Decisión:** servicio Bun/TS en `bot/` del mismo repo, en Docker junto a Evolution API
(red `automation-net`). Estado en SQLite (volumen). Reusa `lib/catalogo` y `lib/horario`.
El horario de atención es configuración del negocio → `configuracion/horario` en Firestore
(editable desde el panel). Las citas viven en Google Calendar (el dueño las ve y mueve desde
el teléfono); los recordatorios se marcan en el propio evento para no duplicarse.
Una sola cuenta de servicio (`chatbot-lectura`) para Firestore (lectura) y Calendar (por
compartir el calendario).

**Por qué:** versionado y testeado como el panel, sin copiar lógica a nodos de n8n, y el
estado de conversación queda resuelto sin una tabla externa.

# D028 — Gaby se apaga con "gaby off" y se calla sola cuando escribe el dueño

**Contexto:** el dueño quiere alternar entre Gaby y atender a mano, y Gaby respondía encima
cuando él escribía. Además no había tope de mensajes (riesgo de baneo si otro bot le escribe).

**Decisión:** interruptor general persistido en SQLite (`ajustes.activa`), por comandos
`gaby on|off|estado` desde un número de `ASESOR_NUMEROS`, desde "Mensajes para mí" del
teléfono del negocio o con `scripts/gaby.sh`. Un mensaje `fromMe` que no mandó el bot (no está
en `RegistroEnvios` por id ni por texto) pausa ese chat `HORAS_PAUSA` (12 h); `gaby on` quita
todas las pausas. Apagada no marca leído. Los recordatorios de citas siguen saliendo.
Topes: `MAX_POR_CHAT_10MIN` (8) y `MAX_POR_HORA` (60) para las respuestas.

# D029 — RCV por categoría con planes en `bot/src/rcv.ts` y solicitudes en SQLite (provisional)

**Contexto:** el cliente pidió que al elegir el tipo de transporte (público, privado o placas
extranjeras) se listen los vehículos de esa categoría con su precio y requisitos, y que se
tomen nombre, correo y teléfono. Precios y solicitudes vivirán en una página web que aún no
está definida.

**Decisión:** los planes son datos (`PlanRcv`, con `categorias` y `ofreceFinanciamiento`) y el
flujo los pide a `Servicios.planesRcv()`; las solicitudes salen por
`Servicios.guardarSolicitudRcv()`. Mientras no exista la web, la primera devuelve la tabla del
cliente y la segunda escribe en `solicitudes_rcv` (SQLite del bot). Los requisitos son
provisionales hasta que el cliente los confirme.

**Por qué:** al llegar la página web solo cambian esas dos funciones de `servicios.ts`; el
flujo y sus tests no se tocan.

# D030 — Póliza RCV en Firestore, editable en el panel; el bot pasa a escribir solicitudes

**Contexto:** el cliente quiere editar los transportes de la póliza (agregar, editar, borrar)
y las tasas del día desde el panel, como el catálogo de celulares, y guardar los datos que
deja la gente en el chat. Reemplaza lo provisional de D029 (tabla fija y SQLite).

**Decisión:** `planesRcv` (precio fijo en €), `configuracion/rcv` (tasas € → $ y € → Bs.,
requisitos por tipo) y `solicitudesRcv`. Las dos primeras las escribe el panel con huella y
validación en reglas; `solicitudesRcv` solo la escribe el bot (reglas: el panel lee y borra).
La cuenta del bot sube de Datastore Viewer a **Datastore User**: IAM no permite limitarla a
una colección, así que el límite es el código (`guardarSolicitudRcv` es la única escritura).
Pesos colombianos fuera por ahora: el cliente solo pidió tasas de $ y Bs.

**Por qué:** un solo lugar para los datos (como el catálogo), el chat ve los cambios en < 1
min y el panel muestra las solicitudes sin otra base de datos.


# D031 — Tasa de bolívares del BCV (o manual) y tasa de pesos colombianos

**Contexto:** el cliente quiere cotizar los bolívares con la tasa oficial del euro del BCV, con
la opción de escribirla a mano, y vuelve a necesitar pesos colombianos (manuales, como los
dólares). Reemplaza la nota de D030 que dejaba fuera los COP.

**Decisión:** `configuracion/rcv` suma `fuenteBs` (`bcv`/`manual`) y `tasaCop`. La tasa BCV se
lee de DolarAPI (`ve.dolarapi.com/v1/euros/oficial`): gratis, sin clave, JSON; el BCV no tiene
API y raspar su web falla por su certificado. El panel la pide a `/api/tasa-bcv` (ruta de
Next con caché de CDN de 15 min, para no depender del CORS) y el bot directo, con caché de
30 min. Con BCV, `tasaBs` queda como respaldo: el panel la actualiza al abrirse si cambió.

**Por qué:** la tasa BCV cambia a diario y el cliente no tiene que acordarse de copiarla; si
DolarAPI se cae, el chat sigue cotizando con la última conocida. Alternativas vistas:
pydolarve.org (ha cambiado de API y pedido token), AllRatesToday (300 consultas/mes),
raspar bcv.org.ve.
