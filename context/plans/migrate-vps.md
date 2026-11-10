# Plan: migrar Firebase → Postgres en el VPS

> 2026-11-10 · Guía del kit: `tech/migrate-firebase-vps.md` + `tech/vps-postgres.md`.
> Primer proyecto del kit que sale de Firebase: lo que se encuentre va a `KIT_FEEDBACK.md`.
> Rama `feat/migrate-vps`, **PR en borrador hasta el corte** (el merge despliega).
> Modelo recomendado: `opus · alto` (datos, auth y seguridad).

## Resultado

| Hoy | Después |
|---|---|
| Firestore (SDK cliente en el navegador) | Postgres 17 en `kit-vps` (BD `inversiones_js`) con **Drizzle** + `pg` vía PgBouncer |
| `firestore.rules` (D003) | Comprobación en el servidor por regla, en `lib/data/<entidad>.ts`, con un test por regla |
| Firebase Auth | **Better Auth** dentro de la app; uid de Firebase = id del `user` |
| Correo de Firebase (plantilla bloqueada) | Correo propio por **SMTP de Brevo** (cierra D040) |
| `onSnapshot` (5 repos + sesión) | Consultas periódicas (SWR/React Query, ~15 s + al volver al foco) |
| Bot con `firebase-admin` | Bot con Drizzle sobre la misma BD; sigue en `automation-net`, en el mismo VPS |

**Sin cambios:** Vercel sigue sirviendo el panel. Google Calendar sigue con la cuenta
`chatbot-lectura` (al final se le quita el rol Datastore). Se mantienen el SQLite del bot, Web
Push/VAPID (D035), el modo demo (D037) y las rutas `tasa-bcv` y `tasa-mercado`.

## Preparativos

| Qué | Estado |
|---|---|
| Bucket para los respaldos | ✅ No hace falta otro: `kit-db backup --all` corre cada noche y sube al bucket que ya tiene el VPS (`/etc/kit-vps/backup.env`). El proyecto no guarda imágenes ni archivos. Si algún día las guarda, ese es otro bucket con otra clave (decisión aparte) |
| Brevo (remitente + clave SMTP) | ✅ En Vercel: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` (prod + preview) |
| Parámetros del hash de Firebase | ✅ En Vercel: `FIREBASE_HASH_SIGNER_KEY`, `FIREBASE_HASH_SALT_SEPARATOR`, `FIREBASE_HASH_ROUNDS`, `FIREBASE_HASH_MEM_COST` |
| Permiso para secretos y despliegues en Vercel | ✅ César, 2026-11-10 |
| Login social | No hay: no hace falta cliente OAuth |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL` | Pendiente: los pone el agente en el corte (paso 5) |

Riesgo de entrega: el remitente es una dirección `@gmail.com`. Para el volumen de esta app
(solo restablecer contraseña) sirve, pero Gmail puede marcar como spam lo que manda un tercero
en su nombre. Si los correos no llegan, hay que pasar a un dominio del cliente con SPF/DKIM en Brevo.

## Inventario (paso 1 de la guía)

12 colecciones planas: sin subcolecciones, sin Storage, sin Cloud Functions. Hay 18 archivos
que importan Firebase.

| Colección | Tabla | Notas |
|---|---|---|
| `admins/{uid}` | `admins (user_id PK → user.id)` | Mismo patrón que D003; `admin:crear` inserta aquí |
| `productos` | `productos` | CHECK con los límites de `productoValido`; FK `marca → marcas.nombre` **diferida** (ver abajo) |
| `marcas/{nombre}` | `marcas (nombre PK)` | Renombrar = transacción: insertar nueva, `UPDATE productos`, borrar vieja (`ON UPDATE CASCADE` lo simplifica) |
| `configuracion/horario` | `configuracion (clave PK, valor jsonb)` | Lo lee el bot; el panel no lo edita hoy |
| `configuracion/rcv` | igual, `clave = 'rcv'` | O columnas propias: decidir en D-modelo |
| `planesRcv` | `planes_rcv` | `categorias text[]` con CHECK |
| `solicitudesRcv` / `…Celulares` / `…Citas` | 3 tablas | Las escribe solo el bot; el panel lee y borra |
| `clientesCelulares` / `clientesRcv` | 2 tablas | El plan de pagos (`pagos`, con cuotas embebidas) va en `jsonb` validado con el mismo esquema de `lib/financiamiento/validacion.ts`; el bot marca `recordatorio30/3` |
| `suscripcionesPush` | `suscripciones_push (endpoint único, user_id FK)` | El bot las lee y borra las caducadas |

Todas las tablas llevan huella: `actualizado_en timestamptz`, `actualizado_por text`. La pone el
servidor, igual que hoy `conHuella`.

**Productos de antes de D025:** algunos tienen una marca sin documento en `marcas`. El script de
exportación crea las marcas que falten antes de copiar los productos. Así la FK puede ser
estricta y desaparece la excepción de la regla `update`.

**Las 12 reglas → comprobaciones** (cada una con su test en PGlite: el admin puede, una
sesión que no es admin recibe 403/404, y sin sesión recibe 401):
1. `esAdmin()` en toda lectura y escritura del panel (`requireAdmin()` en `lib/data/acceso.ts`).
2. Validación de `productos`, `planes_rcv`, `configuracion/rcv`, `clientes_*` y `suscripciones_push`:
   los mismos validadores puros de `lib/*/validacion.ts` en el servidor, más CHECK en la BD.
3. `solicitudes*`: el panel solo tiene `listar` y `borrar` (no hay función de crear).
4. `marcas`: no se actualizan (la PK es el nombre); no se borra una marca con productos (FK `RESTRICT`).
5. `suscripciones_push.user_id` = el usuario de la sesión, nunca lo que mande el cliente.
6. Catch-all `deny`: solo existen las funciones de `lib/data/`; no hay endpoint genérico.

`runTransaction` / lotes: `renombrarMarca` (catálogo) y los seeds → `db.transaction` con
`.for('update')` sobre la marca.

## Pasos

### 0. Arranque
- `git-flow`: rama `feat/migrate-vps` desde `main` y PR en borrador.
- `CLAUDE.md`: en Tech refs, `vps-postgres` y `migrate-firebase-vps` (al final sale `firebase`).
- Decisión `D044-modelo-relacional.md` con la tabla de arriba.

### 1. Base de datos
- `ssh kit-vps kit-db create inversiones_js >/dev/null`, igual para `inversiones_js_preview` e
  `inversiones_js_dev`. Ya hay datos reales, así que se desarrolla sobre `_dev`.
- `scripts/vps-env.ts` del kit → `bun run vps:env inversiones_js_dev` → `.env.development.local`.
- `drizzle.config.ts`, `lib/db/{client,schema}.ts` (`pool.on('error')`, sin estado de sesión) y
  la primera migración.
- `vercel.json` con `"regions": ["fra1"]`.
- `drizzle/seed.sql` desde `seed-emulador` (sin datos personales).
- `qa:local --postgres`; el modo `--offline` se mantiene.

### 2. Auth
- Better Auth + `drizzleAdapter(db, { provider: 'pg' })`, tablas con `bunx auth@latest generate`.
- Allowlist en `app/api/auth/[...all]/route.ts`: `/sign-in/email`, `/sign-out`, `/get-session`,
  `/request-password-reset`, `/reset-password`.
- `password.verify`: si el hash es de Firebase, `firebase-scrypt` con las 4 variables
  `FIREBASE_HASH_*`; si no, el de Better Auth. `hash` queda por defecto.
- Límite de intentos: uno amplio por IP y otro por cuenta que solo cuenta fallos (≥ 5 en 15 min → 429).
- Mantener los mensajes que no revelan cuentas (D012) y el `siguiente` limitado a rutas internas (D011).
- `SesionProvider` (D010) sobre `authClient.useSession()` + `esAdmin` del servidor.
- Correo de restablecer contraseña: `docs/correos/password-reset.html` por SMTP (`nodemailer`),
  `EMAIL-TEMPLATES.md` § Better Auth.
- `scripts/crear-admin.ts` → `auth.api.signUpEmail` + fila en `admins` (con contraseña temporal, D022).

### 3. Capa de datos del panel
- `lib/data/{catalogo,marcas,rcv,clientes,solicitudes,push}.ts`: server actions con
  `requireAdmin()` + validación, que devuelven los mismos tipos de `lib/*/tipos.ts`. Así los
  componentes casi no cambian.
- Los `escuchar…` (`onSnapshot`) pasan a hooks con consulta periódica. Autoguardado de la
  cantidad (D015) sin cambios.
- Borrar `lib/firebase/`, los `repositorio.ts` y `firebase` de `package.json`.
  `grep -r firebase app lib components` debe dar 0.

### 4. Bot (`bot/`)
- `bot/src/google.ts` → separar `bot/src/db.ts` (Drizzle, mismo `lib/db/schema.ts`) de la parte de
  Calendar. Caché de 60 s (D024) igual.
- Conexión: `DATABASE_URL` de PgBouncer (`kit-db url inversiones_js`). El contenedor llega al host
  por `host.docker.internal` (`extra_hosts: host-gateway`) o por la IP pública con TLS: probarlo en el VPS.
- Rol de BD del bot: el mismo de la BD (kit-db da uno por proyecto). Las comprobaciones de qué
  escribe el bot están en su código (solo `solicitudes_*`, `recordatorio*` y borrar `suscripciones_push`).
- `bot/DESPLIEGUE.md` y `docs/chatbot.md` actualizados (contrato con el chatbot → decisión).

### 5. Tests
- `tests/rules/reglas.test.ts` (614 líneas) → `tests/data/*.test.ts` con PGlite
  (`drizzle-orm/pglite` + migraciones en memoria), una prueba por regla.
- Los tests de `tests/unit` no cambian (son puros).

### 6. Exportación (ensayo)
- `scripts/exportar-firestore.ts`: lee todas las colecciones con el Admin SDK y escribe en una
  transacción (todo o nada). Compara contenido documento a documento, no solo los totales.
- `firebase auth:export users.json --format=json` → `scripts/importar-usuarios.ts` (user +
  account con el hash de Firebase).
- Ensayo sobre `inversiones_js_dev`, y después login real con una cuenta importada.

### 7. QA
- `functional-qa` sobre todos los flujos con el build real (`qa:local --postgres`): login,
  restablecer contraseña, CRUD de catálogo y marcas, RCV, clientes, solicitudes, push. También
  Gaby contra `_dev`: lista de precios, cita, solicitud RCV y aviso de vencimiento.
- Migración aplicada a `inversiones_js_preview` y preview de Vercel en verde.

### 8. Corte (con César, en hora de poco tráfico)
1. `gaby off` y aviso de mantenimiento en el panel (escritura congelada).
2. `DATABASE_URL` (prod), `BETTER_AUTH_SECRET` y `BETTER_AUTH_URL` en Vercel.
3. `db:migrate` en producción por el túnel (con el sí de César).
4. Copia final de los datos + importación de usuarios; totales y contenido iguales en las dos puntas.
5. Desplegar el bot nuevo en el VPS → `gaby on` → probar en WhatsApp.
6. Marcar el PR como listo → César lo mergea → probar en producción: login de admin, una
   edición por sección, restablecer contraseña (César).
7. Firebase se queda **30 días** con reglas `deny` en escritura, sin borrar: es el plan de
   vuelta atrás. Lo borra César.
8. `D0NN-migracion-vps.md` (fecha, qué fue a dónde, cómo volver atrás), `PROJECT_CONTEXT.md` § Stack, Tech refs.

**Aviso al cliente:** los admins vuelven a iniciar sesión una vez con su misma contraseña, y
Gaby está pausada unos minutos durante el corte.

## Volver atrás
Hasta el paso 8.6: `gaby on` con el bot viejo y quitar el aviso; Firebase no se tocó.
Después: revertir el merge en Vercel (redeploy del anterior), devolver el bot a la imagen
anterior y reabrir la escritura en Firebase. Los datos escritos en Postgres desde el corte se
copian a mano (el volumen es bajo).

## Abierto
- `configuracion`: ¿`jsonb` por clave o columnas tipadas para `rcv`? (D044: decidido `jsonb`)
- Intervalo de las consultas periódicas en Solicitudes (¿15 s?): el push ya avisa al instante.
- ¿Dominio propio para el correo? (ver riesgo de entrega)
