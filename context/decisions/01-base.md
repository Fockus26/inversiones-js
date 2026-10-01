# D001 — Paleta: amarillo de marca + tinta + verde azulado

Primario `#fec922` (pedido del cliente). Secundario tinta `#1c1f26` y acento `#0f766e`, elegidos
por contraste: el amarillo no sirve para texto ni foco sobre claro, así que el foco y los
estados usan el verde azulado. Detalle en `context/DESIGN_RULES.md`.

# D002 — Modelo: colección `productos`, un documento por equipo

Campos en `lib/catalogo/tipos.ts`: marca, nombre, variante ("8/256"), inicial, cuota,
numeroCuotas (6), cantidad, activo, orden, actualizadoEn, actualizadoPor. Precios como número
(no texto) para que el chatbot pueda calcular/ordenar. Id estable `marca-nombre-variante`
para el seed; los productos nuevos creados desde el panel usan id automático.
`cantidad` arranca en 0: la lista del cliente no la traía.

# D003 — Acceso: Firebase Auth + lista `admins/{uid}` aplicada en las reglas

Login con correo y contraseña. Solo puede leer/escribir el panel quien tenga documento en
`admins/{uid}`. El chequeo del front (redirigir a /login) es comodidad; la barrera real son
las reglas de Firestore. El registro público no existe en la UI y se desactiva en consola.
Las cuentas y los documentos `admins` los crea el dueño del proyecto (script o consola).

# D004 — SDK cliente + emuladores para desarrollo

El panel usa el SDK web de Firebase desde el navegador (sin servidor propio). Desarrollo y
verificación contra los emuladores (`demo-inversiones-js`): ningún worker toca un proyecto real.

# D005 — El chatbot lee Firestore directo

El chatbot consulta `productos` (filtrando `activo == true`) con el Admin SDK desde su
servidor. Contrato y ejemplo en `docs/chatbot.md` (W3).
