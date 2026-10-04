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

# D027 — Bot de WhatsApp con Baileys en `chatbot/`, flujo por menú y frenos anti-baneo

Paquete aparte (`chatbot/`, sus propias dependencias) que se despliega en un VPS con pm2. Se
conecta como dispositivo vinculado con Baileys (no oficial: riesgo de baneo asumido por el
cliente; la API oficial es la salida si crece). Importa `lib/catalogo/tipos.ts` y
`texto-lista.ts` del repo (bun build los empaqueta) y lee como D024. Flujo determinista, sin
IA: menú 1 lista / 2 modelo / 3 asesor; pedir asesor o escribir el dueño desde el teléfono
calla al bot en ese chat 12 h. Solo responde, nunca inicia; cola global con "escribiendo…",
pausas al azar y topes por chat y por hora. Estado de chats en `datos/chats.json`.
