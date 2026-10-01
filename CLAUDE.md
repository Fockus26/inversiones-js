@AGENTS.md

# Inversiones JS — panel administrativo

Panel web privado para que el cliente (tienda de celulares a crédito) edite su catálogo:
nombre, variante, inicial, cuota quincenal y cantidad de cada equipo. El **chatbot** del
cliente lee la misma colección de Firestore, así que lo que se guarda aquí es lo que el
chatbot responde.

**Tipo:** dashboard · **Cliente:** Inversiones JS · **Modo git:** ver `context/GIT_STATE.md`

## Qué leer

**Siempre:** este archivo + `context/CURRENT_PHASE.md`.

| Si la tarea… | Lee además |
|---|---|
| toca UI | `context/DESIGN_RULES.md` (colores y reglas de contraste) |
| toca datos, auth o reglas | `lib/catalogo/tipos.ts` + `firestore.rules` + `context/decisions/` (grep) |
| toca lo que lee el chatbot | `docs/chatbot.md` |
| llega con un prompt de orquestador | **solo** lo que el prompt cite |

Buscar, no leer: `grep -rh "^# D" context/decisions/`.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript estricto · Tailwind v4 + shadcn/ui (base-nova)
- **bun** para todo (nunca npm/yarn/pnpm) · Biome para lint y formato
- Firebase: Auth (correo + contraseña) y Firestore, **SDK cliente** en el navegador.
  La seguridad vive en `firestore.rules`, no en el front (D003).
- Desarrollo local contra los **emuladores** (proyecto `demo-inversiones-js`, no toca nada real).

```bash
bun install
bun run emulators          # Auth :9099, Firestore :8080, UI :4000 (necesita Java)
bun run dev                # usa .env.local (NEXT_PUBLIC_USE_EMULATORS=true)
bun run typecheck
bun run lint
bun run test               # tests puros en tests/unit
bun run emulators:test     # tests de reglas en tests/rules contra el emulador
bun run build
```

Playwright, si se usa, se corre con `node`, no con `bun` (en Windows se cuelga).
Antes de usar una API de Next 16 o de Firebase: Context7 o `node_modules/next/dist/docs/`.

## Reglas del proyecto

- Textos de UI en **español** (tuteo neutro). Montos en USD, formato `125$` como usa el cliente.
- `components/ui/` es código de shadcn: no se edita a mano salvo arreglos puntuales.
- El modelo de datos (`lib/catalogo/tipos.ts`) es un contrato con el chatbot: cambiar o
  renombrar un campo exige actualizar `docs/chatbot.md` y anotarlo como decisión.
- Nunca commitear `.env*` (salvo `.env.example`) ni claves de cuenta de servicio.
