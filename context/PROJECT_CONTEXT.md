# Project Context — Inversiones JS

> Creado al migrar al kit 3.3.0 (el proyecto arrancó antes de que existiera este archivo).
> Solo tiene las secciones que pide el kit; el resto del contexto vive en `CLAUDE.md`.
> Lo que no existe todavía dice `PENDIENTE`.

## Stack técnico

- Framework: Next.js 16 (App Router) · TypeScript estricto · shadcn/ui (base-nova) + Tailwind v4
- Gestor de paquetes: **bun** · Lint: Biome
- Base de datos: Postgres 17 en el VPS (`kit-vps`, base `inversiones_js`) con Drizzle; server actions en `lib/data/` (D044). Firestore sin escrituras hasta el 2026-12-10 (D046)
- Autenticación: Better Auth (correo + contraseña, sin registro), admins en la tabla `admins` (D003, D044)
- Pagos: N/A
- Correo: SMTP de Brevo, solo el de restablecer contraseña
- Despliegue: Vercel
- Dominio: PENDIENTE (hoy `inversiones-js.vercel.app`)

## Repo y despliegue

- Repo: https://github.com/Fockus26/inversiones-js (público a propósito, modo `pr`; el respaldo de `context/` no se sube: `context:backup` se niega en un repo público)
- Vercel: proyecto `alejandrorey2654gmailcoms-projects/inversiones-js`, en la cuenta de César,
  conectado al repo
- Producción: https://inversiones-js.vercel.app · Previews: uno por PR (con Vercel
  Authentication activo: piden sesión de Vercel)
- DNS gestionado por: no aplica todavía (sin dominio propio)
- Mantenimiento: no aplica
- El chatbot (`bot/`) se despliega aparte; ver `docs/chatbot.md`.

## Assets de marca

| Pieza | Estado | Dónde / nota |
|---|---|---|
| Logo | PENDIENTE (confirmar si el cliente tiene uno en vector) | `context/plans/pendientes.md` |
| Icono / isotipo | Existe, generado por código | `app/icono/` (192 y 512 para la PWA) |
| Favicon | Existe | `app/favicon.ico` |
| Apple touch icon | Hay que crearlo | `context/plans/pendientes.md` |
| Imagen Open Graph | Hay que crearla | `context/plans/pendientes.md` |

Detalle de tamaños y archivos: `reference/BRAND-ASSETS.md` del kit.

## Correos

| Correo | Lo manda | Destinatario | Estado |
|---|---|---|---|
| Restablecer contraseña | Firebase Auth (`sendPasswordResetEmail` en `app/login/formulario-login.tsx`) | admin del panel | PENDIENTE: diseñado (`docs/correos/password-reset.html`, HANDOFF §5) pero la consola de Firebase tiene bloqueada la edición de plantillas del proyecto; sigue saliendo la de Firebase |

La app no manda otros correos: las altas de admin dan una contraseña temporal por
`admin:crear` (D022) y el bot habla por WhatsApp. La plantilla se edita en la consola de
Firebase (Authentication › Templates: remitente, asunto, cuerpo HTML limitado y idioma `es`);
el emulador no la aplica, solo deja el enlace en su UI.

**Bloqueo de plantillas (2026-10-16):** la consola muestra "Por el momento, no se pueden actualizar
las plantillas de correo electrónico de este proyecto". Solo lo quita Asistencia de Firebase; un
SMTP propio (Brevo) cambia el envío pero no desbloquea el editor. Caminos: (1) pedir el
desbloqueo a soporte y pegar la plantilla; (2) envío propio desde el panel con
`generatePasswordResetLink` + API de Brevo (necesita dominio verificado, `BREVO_API_KEY` y la
cuenta de servicio en Vercel). Detalle en `context/plans/pendientes.md`.

Remitente: PENDIENTE (`noreply@<proyecto>.firebaseapp.com` por defecto) · Dominio verificado
(SPF/DKIM): no aplica hasta tener dominio propio. Detalle: `reference/EMAIL-TEMPLATES.md` del kit
(escrito para React Email + Supabase; aquí solo aplican las reglas de diseño).

## Funcionalidad más allá de lo estático

- [x] Autenticación de usuarios — destino principal con sesión: el catálogo (`/`)
- [x] Persistencia de datos (Firestore)
- [ ] Pagos
- [x] Dashboard
- [x] Formularios con envío real (catálogo, RCV, clientes)
- [x] Correos que manda la app (ver § "Correos")
- [x] PWA con avisos Web Push
