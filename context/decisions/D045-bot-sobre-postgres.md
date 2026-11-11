# D045 · Bot · Gaby lee y escribe Postgres del VPS; la cuenta de Google queda solo para Calendar · Implementado (corte 2026-11-10, D046)

**Contexto:** migración al VPS (D044). Gaby corría en el mismo VPS y leía Firestore con la
cuenta `chatbot-lectura` (D024, D030). Reemplaza en parte D005 (el chatbot lee Firestore directo).

**Decisión:**
- Todo el acceso a datos del bot en `bot/src/db.ts`, con el mismo esquema que el panel
  (`lib/db/schema.ts`) y `DATABASE_URL` de `kit-db url inversiones_js` (PgBouncer :6432, TLS).
  `bot/src/google.ts` queda solo para Calendar.
- El contenedor llega al PgBouncer por la IP pública del VPS: probado desde `gaby` en
  `automation-net` el 2026-11-10 (`host.docker.internal` no existe ahí; `172.17.0.1` también
  responde). No se toca la red de Docker.
- Mismo rol de BD que el panel (kit-db da uno por proyecto). Lo que escribe el bot se limita en
  su código (solo solicitudes, `recordatorio*` y borrar suscripciones push) y en los CHECK.
- `marcarAvisoRcv` pasa de transacción de Firestore a un `UPDATE … WHERE vence = $1 AND campo IS
  NOT TRUE`: atómico sin transacción.
- En la imagen, `lib/db` resuelve `drizzle-orm` y `pg` desde `/app/node_modules`, un enlace al
  `node_modules` del bot. Los operadores se importan de `lib/db/consultas.ts`, para que haya una
  sola copia de drizzle-orm.
- Caché de 60 s de las lecturas (D024), igual que antes.

**Por qué:** una sola base para el panel y el bot. La cuenta de Google ya no necesita permisos
sobre los datos.

**Alternativa descartada:** un rol de BD propio del bot con permisos solo sobre sus tablas.
`kit-db` no lo ofrece y el bot ya corre en el mismo servidor que la base. Se puede revisar si un
día el bot sale del VPS.

**Consecuencia:** el bot nuevo y el panel nuevo se despliegan juntos en el corte. Un bot viejo
contra datos nuevos, o al revés, deja solicitudes en una base que el otro no ve.
