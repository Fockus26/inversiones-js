# Orquestación del 2026-10-01 — brief común para los workers

> Lo lee **cada worker** antes de empezar. Su prompt trae solo lo específico de su unidad.
> Carpeta principal del repo: `C:\Users\Admin\Documents\Work\inversiones-js` (ahí viven los
> archivos locales/gitignored: `context/CURRENT_PHASE.md`, `context/CONTENT_CHECKLIST.md`,
> `context/PHASE_LOG/`, `context/plans/`, `.env.local`).

## Unidades y orden

| # | Rama | Qué | Ola |
|---|---|---|---|
| W1 | `feat/auth-login` | Login, sesión, guard admin, cabecera del panel | 1 |
| W2 | `feat/catalogo-crud` | Lista por marca + editar/crear/borrar productos | 1 |
| W3 | `feat/chatbot-produccion` | Texto de lista para el chatbot, doc de integración, alta de admin y guía de producción | 1 |

Slot y puerto: los da `wt take`; el mensaje con el que te lanzan los repite.
Las tres van en paralelo: no comparten archivos (ver "Dueños de archivos").

## Ya está en `main` (ola 0) — no lo rehagas

- Next 16 + Tailwind v4 + shadcn (base-nova) con `button input label card table dialog
  alert-dialog badge sonner dropdown-menu skeleton separator` en `components/ui/`.
- Tokens de color en `app/globals.css` (D001; reglas en `context/DESIGN_RULES.md` — **léelo si tocas UI**).
- `app/layout.tsx`: `lang="es"`, ThemeProvider (next-themes, clase `.dark`) y `<Toaster />` de sonner.
- Modelo `lib/catalogo/tipos.ts` (D002), catálogo `lib/catalogo/catalogo-inicial.ts`.
- `lib/firebase/client.ts`: `firebaseAuth()`, `firestore()` (conectan solos al emulador si
  `NEXT_PUBLIC_USE_EMULATORS=true`).
- `firestore.rules` **definitivas** (D003): `productos` solo para admins; create/update exigen
  campos válidos + `actualizadoPor == request.auth.uid` + `actualizadoEn == request.time`
  (→ en el cliente: `actualizadoEn: serverTimestamp()`).
- `scripts/seed-emulador.ts` (`bun run seed:emulador`): 23 productos + cuentas de prueba
  `CUENTAS_EMULADOR` (admin y una sin acceso; credenciales en ese archivo, no las copies al PR).

## Decisiones del dueño para esta tanda

- Proyecto nuevo; stack del kit; el chatbot lee Firestore directo; acceso por lista de admins.
- **Emulador compartido:** ya hay UNO corriendo desde la carpeta principal (Auth 127.0.0.1:9099,
  Firestore 127.0.0.1:8080, UI :4000, proyecto `demo-inversiones-js`, ya con datos).
  **No arranques otro emulador** (chocan los puertos). Si no responde, dilo en el informe.
  Los datos son compartidos con los otros workers: no borres productos del seed; crea los tuyos
  con nombre que empiece por `W2 prueba` / `W1 prueba` y bórralos al terminar.
- **Servidor de desarrollo autorizado:** `bun run dev -- --port <tu puerto>` en segundo plano,
  en tu slot. Apágalo al terminar.
- Nada contra un proyecto Firebase real: no existe todavía. Todo es emulador.

## Dueños de archivos (no toques lo de otro)

| Unidad | Es dueña de |
|---|---|
| W1 | `app/login/**`, `app/(panel)/layout.tsx`, `lib/auth/**`, `components/panel/cabecera*.tsx`, `components/panel/tema*.tsx`, `tests/rules/**` |
| W2 | `app/(panel)/productos/**`, `lib/catalogo/repositorio.ts`, `lib/catalogo/validacion.ts`, `components/catalogo/**` |
| W3 | `lib/catalogo/texto-lista.ts`, `docs/**`, `scripts/crear-admin.ts`, `scripts/seed-produccion.ts`, `README.md` |

Si de verdad necesitas tocar algo compartido (`package.json` para una dependencia, `tipos.ts`),
hazlo mínimo y dilo en el PR. `firestore.rules` no se toca salvo bug (W1 lo prueba).

## Números reservados

| Unidad | Archivo de decisiones | IDs | Filas de `CONTENT_CHECKLIST` |
|---|---|---|---|
| W1 | `context/decisions/02-auth.md` | D010–D014 | 4–6 |
| W2 | `context/decisions/03-catalogo.md` | D015–D019 | 7–9 |
| W3 | `context/decisions/04-chatbot.md` | D020–D024 | 10–12 |

`context/decisions/` va en git (el `.gitignore` solo excluye CURRENT_PHASE, CONTENT_CHECKLIST,
PHASE_LOG y plans). Agrega tus filas al final de `context/DECISIONS_INDEX.md`.

## Reglas de la tanda (además de `CLAUDE.md`)

1. **Lee solo** `CLAUDE.md` y lo que tu prompt cite. Lo demás, con `grep`.
2. **Slot y rama:** trabajas SOLO en la ruta de tu slot (`..\inversiones-js-wt\wtN`), ya con tu
   rama, `node_modules` y `.env.local`. No crees ni borres worktrees, no corras `wt`, no cambies de rama.
3. **Archivos locales compartidos:** no edites `CURRENT_PHASE.md` ni `CONTENT_CHECKLIST.md`.
   Escribe `context/PHASE_LOG/<tu-rama-con-guiones>.md` en la carpeta principal; si no puedes,
   entrégalo en tu informe.
4. **Changeset:** no hay changesets configurados en este repo todavía: ninguno.
5. **Navegador:** crea tu propia pestaña y pasa su `tabId`. Verifica midiendo el DOM.
   Playwright, si lo usas, con `node`.
6. **Tests:** `bun run test` (puros) y, si tocas reglas o acceso, `bun run emulators:test`.
7. **Verificación mínima antes del PR:** `bun run typecheck`, `bun run lint`, `bun run test`,
   `bun run build`; si tocaste UI, skill `a11y` (claro y oscuro, 320 px, teclado).
8. **Sin poder preguntar:** ante un dato que falte, lo conservador + "Decisión tomada /
   alternativa" en el PR. No te bloquees.
9. **Copy nuevo = provisional** solo si dudas; tutea en español neutro.
10. **Cierre:** commits Conventional (solo tus archivos), push de tu rama, `gh pr create`
    (base `main`, cuerpo en español con: qué cambia, cómo se verificó, decisiones, acciones
    manuales). Deja `git status` vacío. **Nunca** `gh pr merge`, push a `main`, force-push ni
    amend de lo empujado.
11. **Informe final** (breve): URL del PR, slot, verificado / no verificado, decisiones abiertas,
    acciones manuales, bugs vistos de paso, y tu PHASE_LOG si no pudiste escribirlo.
