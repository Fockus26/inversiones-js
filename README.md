# Inversiones JS — panel administrativo

Panel web privado para que Inversiones JS (tienda de celulares a crédito) edite su catálogo:
nombre, variante, inicial, cuota quincenal, número de cuotas y cantidad de cada equipo. El
**chatbot** del cliente (Gaby, en [`bot/`](bot/)) lee la misma base, así que lo que se guarda
aquí es lo que el chatbot responde. Contrato con el chatbot: [`docs/chatbot.md`](docs/chatbot.md).

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 + shadcn/ui ·
Postgres en el VPS (Drizzle) · Better Auth (correo y contraseña) · correos por SMTP de Brevo ·
bun · Biome.

## Desarrollo local

Requisitos: [bun](https://bun.sh) y acceso SSH al VPS con el alias `kit-vps` (kit
`reference/VPS-POSTGRES.md`). Para la QA local, además, Docker Desktop abierto.

```bash
bun install
bun run vps:env inversiones_js_dev   # escribe DATABASE_URL/DIRECT_URL en .env.development.local
bun run dev                          # http://localhost:3000
```

Se desarrolla contra `inversiones_js_dev`, nunca contra producción (`inversiones_js`). Las URLs
llevan la contraseña: `vps:env` las escribe sin mostrarlas. Para entrar al panel en local,
crea tu cuenta en esa base: `bun run admin:crear <correo> --base=inversiones_js_dev`.

**QA con datos de prueba** (Postgres y Mailpit en Docker; nunca toca el VPS):

```bash
bun run qa:local -- --port 4301
```

Carga el catálogo, la póliza RCV, clientes de ejemplo y las cuentas de `.env.test.local`
(`ADMIN_…` entra al panel; `EMAIL_TEST` tiene sesión pero no acceso). Los correos se ven en
Mailpit (la URL sale en la consola).

### Comandos

| Comando | Qué hace |
|---|---|
| `bun run dev` | Servidor de desarrollo |
| `bun run typecheck` | Tipos (incluye `next typegen`) |
| `bun run lint` / `bun run format` | Biome |
| `bun run test` | Tests (`tests/unit`; la base, con PGlite en memoria) |
| `bun run build` | Build de producción |
| `bun run qa:local -- --port <p>` | Servidor sobre una base de QA en Docker (`--db-only`: solo la base) |
| `bun run db:generate` | Migración nueva en `drizzle/` tras cambiar `lib/db/schema.ts` |
| `bun run db:migrate` | Aplica las migraciones (con el túnel: `ssh -N -L 5433:127.0.0.1:5432 kit-vps`) |
| `bun run admin:crear <correo> --base=<base>` | Da acceso al panel a un correo (ver abajo) |
| `bun run usuarios:importar <archivo> --base=<base>` | Importa usuarios exportados de Firebase Auth (migración) |

## Cómo funciona el acceso

- Solo entra quien tenga cuenta (Better Auth) **y** una fila en `admins`.
- La barrera real está en el servidor: toda server action de `lib/data/` pasa por `comoAdmin()`.
  Sin sesión responde "inicia sesión"; sin fila en `admins`, "sin acceso". Los límites de cada
  dato son CHECK en la base.
- No hay registro público. Las cuentas se crean con `bun run admin:crear`; quien la recibe
  cambia la contraseña temporal con "¿Olvidaste tu contraseña?".

## Producción

- **Base:** `inversiones_js` en el VPS (`kit-db`), con respaldo nocturno automático al bucket
  del VPS. Migraciones a producción antes de mergear y con el sí de César (kit
  `tech/vps-postgres.md` › Migrations).
- **Vercel** (región `fra1`, cerca del VPS): `DATABASE_URL`, `BETTER_AUTH_SECRET`,
  `BETTER_AUTH_URL`, `SMTP_*`, `EMAIL_FROM`, `FIREBASE_HASH_*` (usuarios importados de Firebase)
  y `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. La lista con su descripción: [`.env.example`](.env.example).
- **Dar acceso a alguien:** `bun run admin:crear correo@del-cliente.com --base=inversiones_js`.
  Si el usuario es nuevo, imprime **una sola vez** una contraseña temporal: pásala por un canal
  privado. Para quitar el acceso, borra su fila de `admins`.

## Bot de WhatsApp (Gaby) en el VPS

Gaby corre en Docker en el VPS. Despliegue completo: [`bot/DESPLIEGUE.md`](bot/DESPLIEGUE.md).

**Entrar a la terminal del VPS** (desde PowerShell o Git Bash en tu PC):

```bash
ssh root@178.238.238.7
```

Pide la contraseña: está en `.env.vps` en la raíz del repo (`VPS_PASSWORD`). Ese archivo es
solo tuyo, está ignorado por git y **no se sube nunca**. Si no lo tienes, créalo así:

```bash
VPS_HOST=178.238.238.7
VPS_USUARIO=root
VPS_PASSWORD=
```

Ya dentro, todo se corre desde la carpeta del bot:

```bash
cd /opt/inversiones-js/bot
```

| Para… | Comando |
|---|---|
| Ver los logs | `docker compose logs -f --tail 100 gaby` (Ctrl+C para salir) |
| Ver los números de asesores que usa Gaby | `docker compose exec gaby printenv ASESOR_NUMEROS` |
| Ver los asesores del archivo `.env` | `grep ASESOR_NUMEROS .env` |
| Aplicar un cambio del `.env` | `docker compose up -d gaby` |
| Encender / apagar / ver estado | `./scripts/gaby.sh on` · `./scripts/gaby.sh off` · `./scripts/gaby.sh estado` |
| Salir del VPS | `exit` |

### Mejoras recomendadas después

- Dominio propio para el remitente de los correos (SPF/DKIM en Brevo): desde `@gmail.com`
  Gmail puede mandarlos a spam.
- Probar una restauración de respaldo cada cierto tiempo (`kit-db restore` sobre una base de
  prueba).
