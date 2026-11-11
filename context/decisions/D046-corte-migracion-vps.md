# D046 · Datos · Corte de Firebase a Postgres del VPS (2026-11-10) y vuelta atrás · Implementado

**Contexto:** cierre de la migración (D044 datos, D045 Gaby; plan `context/plans/migrate-vps.md`,
guía del kit `tech/migrate-firebase-vps.md` §5).

**Qué se movió (2026-11-10):**
- Datos: Firestore `inversiones-js` → Postgres `inversiones_js` en `kit-vps` (respaldo nocturno del
  VPS). 76 documentos copiados y comparados por contenido con `firestore:exportar`; conteos iguales
  en las dos puntas. Se omitió `admins/WePC8EbtwGWfByvDPr0C0egmVzH2` (su usuario ya no existía en Auth).
- Auth: Firebase Auth → Better Auth. 3 usuarios con su uid y su contraseña (hash `firebase-scrypt`,
  variables `FIREBASE_HASH_*` en Vercel). Al cambiar la contraseña pasa al hash propio de Better Auth.
- Panel: PR #26 (merge `77c2c07`) desplegado en `https://inversiones-js.vercel.app` con
  `DATABASE_URL`, `BETTER_AUTH_SECRET` y `BETTER_AUTH_URL` en Vercel.
- Gaby: imagen nueva en `/opt/inversiones-js/bot` (rama `main`), `DATABASE_URL` en `bot/.env`.

**Vuelta atrás (hasta el 2026-12-10):** Firestore queda intacto y sin escrituras (`firestore.rules`:
solo lectura para admins). Para volver: revertir el merge del PR #26 en `main` (Vercel redespliega),
volver a abrir las reglas anteriores (`git show 77c2c07^:firestore.rules`), desplegar el bot de
`3d5f864` y copiar a Firestore lo escrito en Postgres desde el corte. Pasado el plazo, César compara
los datos y decide borrar el proyecto de Firebase.

**Pendiente de César:** quitar el rol de Datastore a `chatbot-lectura` en `inversiones-js` (Gaby solo
usa Calendar), revocar la clave de admin usada para exportar y verificar el remitente en Brevo.
