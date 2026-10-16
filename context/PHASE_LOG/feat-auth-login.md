# feat/auth-login (W1) — 2026-10-01

PR: https://github.com/Fockus26/inversiones-js/pull/2 · slot wt1 · puerto 4301

- `/login` (correo+contraseña, sin registro, restablecer neutro), `SesionProvider`/`useSesion`
  en `lib/auth/`, guard de cliente en `app/(panel)/layout.tsx`, cabecera tinta+amarillo con tema
  y cerrar sesión. Decisiones D010–D014 (`context/decisions/02-auth.md`).
- Tests: 10 unit, 17 de reglas (`bun run emulators:test`, proyecto `demo-reglas-w1`, corre con bun).
- Verificado con Playwright (27 checks) + axe claro/oscuro + 320 px + teclado.
- Pendiente manual: desactivar alta pública en consola; crear cuenta del cliente + `admins/{uid}`.
- Visto de paso: el anillo de foco de shadcn (`ring-ring/50`) no llega a 3:1 en claro; W1 lo
  sobrescribe en el login, el resto del panel (W2) lo hereda.
