# Project Context — Inversiones JS

> Creado al migrar al kit 3.3.0 (el proyecto arrancó antes de que existiera este archivo).
> Solo tiene las secciones que pide el kit; el resto del contexto vive en `CLAUDE.md`.
> Lo que no existe todavía dice `PENDIENTE`.

## Stack técnico

- Framework: Next.js 16 (App Router) · TypeScript estricto · shadcn/ui (base-nova) + Tailwind v4
- Gestor de paquetes: **bun** · Lint: Biome
- Base de datos: Firestore (SDK cliente, reglas en `firestore.rules`)
- Autenticación: Firebase Auth (correo + contraseña), admins en `admins/{uid}`
- Pagos: N/A
- Correo: Firebase Auth (restablecer contraseña); la app no manda otros
- Despliegue: Vercel
- Dominio: PENDIENTE (hoy `inversiones-js.vercel.app`)

## Repo y despliegue

- Repo: https://github.com/Fockus26/inversiones-js (privado, modo `pr`)
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

## Funcionalidad más allá de lo estático

- [x] Autenticación de usuarios — destino principal con sesión: el catálogo (`/`)
- [x] Persistencia de datos (Firestore)
- [ ] Pagos
- [x] Dashboard
- [x] Formularios con envío real (catálogo, RCV, clientes)
- [x] PWA con avisos Web Push
