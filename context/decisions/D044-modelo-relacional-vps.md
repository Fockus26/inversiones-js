# D044 · Datos · Modelo relacional en Postgres (VPS): una tabla por colección, `jsonb` en pagos y configuración · En curso

**Contexto:** migración Firebase → Postgres en el VPS (`context/plans/migrate-vps.md`, guía del kit
`tech/migrate-firebase-vps.md`). Las 12 colecciones son planas (sin subcolecciones).

**Decisión:**
- Una tabla por colección, en `snake_case`: `productos`, `marcas`, `admins`, `configuracion`,
  `planes_rcv`, `solicitudes_rcv`, `solicitudes_celulares`, `solicitudes_citas`,
  `clientes_celulares`, `clientes_rcv`, `suscripciones_push`. Esquema en `lib/db/schema.ts`.
- **Ids `text`:** se conservan los ids de Firestore (20 caracteres) y los uid de Firebase Auth
  (= `user.id` de Better Auth). Las filas nuevas llevan `gen_random_uuid()::text`.
- **`productos.marca` → FK a `marcas.nombre`** con `ON UPDATE CASCADE ON DELETE RESTRICT`:
  renombrar una marca es un `UPDATE` y no se puede borrar una marca con productos. Así se
  sustituyen `marcaRegistrada` y la comprobación que hoy hace el panel. La exportación crea las
  marcas que falten (productos de antes de D025).
- **`configuracion (clave text PK, valor jsonb)`** con las filas `horario` y `rcv`. Se queda
  igual que el documento: cada campo es opcional, y `normalizarHorario`/`ConfigRcv` ya toleran
  que falten campos.
- **`pagos` (plan de cuotas) en `jsonb`**, validado en el servidor con
  `lib/financiamiento/validacion.ts`. Las cuotas se leen y escriben siempre junto con su cliente:
  no hace falta otra tabla.
- **`categorias` de `planes_rcv` en `text[]`** con CHECK de los valores permitidos.
- **Límites de `firestore.rules` como CHECK** en la BD (longitudes, rangos, enums). Así se
  aplican también a lo que escribe el bot, que hoy no pasa por las reglas.
- **Huella** `actualizado_en timestamptz` + `actualizado_por text`, la pone siempre el servidor;
  `creado_en` en las solicitudes y en `suscripciones_push`.
- **Fechas de clientes (`emision`, `vence`, `cuotas[].vence`) en `"AAAA-MM-DD"`**: columnas
  `date` para `emision`/`vence` (los avisos del bot filtran por ellas); en `jsonb` quedan como texto.

**Por qué:** el modelo de datos es un contrato con el bot (`lib/*/tipos.ts`). Con una tabla por
colección y los mismos tipos, los componentes y `bot/` cambian solo en la capa de acceso.

**Alternativa descartada:** cuotas en una tabla `cuotas` con FK. Sería más normal, pero ninguna
consulta filtra por cuota y obligaría a reescribir los formularios de pagos y sus tests. Si un
día hace falta reportar cuotas vencidas de todos los clientes, se migra.
