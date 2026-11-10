@AGENTS.md

# Inversiones JS — panel administrativo

Panel web privado para que el cliente (tienda de celulares a crédito) edite su catálogo:
nombre, variante, inicial, cuota quincenal y cantidad de cada equipo. El **chatbot** del
cliente lee la misma colección de Firestore, así que lo que se guarda aquí es lo que el
chatbot responde.

**Tipo:** dashboard · **Cliente:** Inversiones JS · **Modo git:** ver `context/GIT_STATE.md`
**Kit:** web-agent-kit, versión en `.kit-version` (se actualiza con `/kit-update`) ·
**Despliegue:** Vercel `inversiones-js` · preview por PR, producción al mergear a `main`

## Qué leer

**Siempre:** este archivo + `context/CURRENT_PHASE.md`.

| Si la tarea… | Lee además |
|---|---|
| toca UI | `context/DESIGN_RULES.md` (colores y reglas de contraste) |
| toca despliegue, assets o correos | `context/PROJECT_CONTEXT.md` |
| toca datos, auth o reglas | `lib/catalogo/tipos.ts` + `firestore.rules` + `context/decisions/` (grep) |
| toca lo que lee el chatbot | `docs/chatbot.md` |
| llega con un prompt de orquestador | **solo** lo que el prompt cite |

Buscar, no leer: `grep -rh "^# D" context/decisions/`.
**El `reference/…` del kit** = `~/.claude/kit-reference/…` (o `.claude/kit-reference/…`).
**Tech refs:** firebase, vercel → su `tech/<nombre>.md` cuando la tarea lo toque; solo estos.

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

**Servidor de desarrollo:** lo levanta César. Excepciones: los agentes de QA (`wave-qa`,
`functional-qa`) siempre, y los workers si César lo autoriza para una tanda (cada uno en su
puerto, en segundo plano). Build, typecheck, lint y tests sí se corren sin preguntar.

**QA contra base local:** `bun run qa:local -- --port <p>` levanta los **emuladores de
Firebase** (Java, sin Docker; proyecto `demo-inversiones-js`), carga `seed-emulador`, crea
las cuentas de `.env.test.local` (`ADMIN_…` con `admins/{uid}`, `EMAIL_TEST` sin acceso) y
arranca el servidor sobre ellos. Nunca contra el proyecto real. Sin ellos: `--offline`.

Playwright, si se usa, se corre con `node`, no con `bun` (en Windows se cuelga).
Antes de usar una API de Next 16 o de Firebase: Context7 o `node_modules/next/dist/docs/`.

**Modelo por tarea:** antes de cada una, `Modelo recomendado: <modelo · esfuerzo>` (kit
`TOKEN-ECONOMY.md` §12; riesgo → `opus`); los subagentes llevan ambos en `Agent(...)`.

## Reglas del proyecto

- Textos de UI en **español** (tuteo neutro). Montos en USD, formato `125$` como usa el cliente.
- `components/ui/` es código de shadcn: no se edita a mano salvo arreglos puntuales.
- El modelo de datos (`lib/catalogo/tipos.ts`) es un contrato con el chatbot: cambiar o
  renombrar un campo exige actualizar `docs/chatbot.md` y anotarlo como decisión.
- Nunca commitear `.env*` (salvo `.env.example`) ni claves de cuenta de servicio.

## Git y worktrees

- Modo `pr`: en tu rama se commitea y empuja sin pedir permiso; **nunca** push a `main`,
  nunca `gh pr merge`, nunca auto-merge. Nada destructivo (`reset --hard`, `push --force`).
- **Sesión en la nube** (`CLAUDE_CODE_REMOTE=true`): skill `cloud-session` al empezar y al
  cerrar. Anula las dos reglas de arriba: cada unidad termina mergeada en `main` (PR + CI verde).
- **Sin versión:** el proyecto no lleva `version` ni `CHANGELOG.md` ni changesets (D038).
- Lo local (gitignored): `CURRENT_PHASE`, `CONTENT_CHECKLIST`, `PHASE_LOG/`, `plans/` — respaldo: `bun run context:backup`.
  `.env.local` se baja de Vercel, nunca se edita a mano (`vercel env pull`; `reference/DEPLOY.md` §2c del kit).
  Los slots del pool de worktrees (`orchestrate`, `..\inversiones-js-wt\wtN`) traen los
  `.env*` copiados, pero **no** `context/` local: se lee en la carpeta principal (primera
  línea de `git worktree list`). Desde un worktree (slot del pool o `.claude/worktrees/`)
  puede faltar permiso de escritura ahí: devuelve los cambios de `context/` en tu informe.

## Feedback para el kit

Cuando César corrija algo que hiciste siguiendo el kit, te pida lo mismo por segunda vez,
haga a mano un paso que el kit podría hacer, o el kit no diga qué hacer: fila en
`context/KIT_FEEDBACK.md` (o +1 en "Veces" si ya está). Sin preguntar y sin anunciarlo
más que en una línea. Se envía al kit con `/kit-feedback`.

## Puertas de calidad

| Skill / agente | Cuándo |
|---|---|
| `a11y` | Siempre que se toque UI, antes de pedir revisión |
| `git-flow` | Al abrir y al cerrar cada unidad |
| `orchestrate` | Llega una lista, o una fase se hace en olas (una ola por sesión) |
| `wave-qa` | `orchestrate`, tras una ola con flujos de riesgo (usa `qa:local`) |
| `functional-qa` | Cierra un flujo de riesgo (auth, datos guardados, pagos) · QA de versión |
| `design-qa` | Solo en la QA de versión (fase 09 / PR de release) |
