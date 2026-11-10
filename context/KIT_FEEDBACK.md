# Kit feedback — Inversiones JS

> Lo que el **web-agent-kit** hizo mal, de más o de menos en este proyecto, para mejorarlo.
> No es el diario del proyecto: es material para el kit. Se busca con `grep`, no se lee por
> defecto. Kit en el que arrancó / al que se actualizó: ver `.kit-version`.

## Cuándo se anota (lo hace el agente, sin que se lo pidan)

| Tipo | Señal |
|---|---|
| **Corrección** | César corrige algo que el agente hizo siguiendo el kit ("no, así no", "otra vez el…", revierte un cambio) |
| **Repetición** | César tuvo que pedir lo mismo por segunda vez, o hacer a mano un paso que el kit podría hacer |
| **Hueco** | El kit no decía qué hacer y el agente tuvo que improvisar o preguntar algo que debería estar resuelto |
| **Fricción** | Un paso del kit costó mucho para lo que aportó (tokens, tiempo, ceremonia), o una instrucción estaba mal |
| **Prevención** | La QA encontró una clase de defecto que no está en `reference/QA-PREVENTION.md` del kit: la regla que la habría evitado al construir |

No se anota: errores del agente que el kit ya prohíbe con claridad (eso es otra cosa), ni
preferencias de este proyecto solo (van a `decisions/`).

**Si ya existe una fila del mismo problema, no se duplica: se suma 1 a "Veces", se
actualiza la fecha y, si estaba marcada como enviada (`→ PR …`), se quita la marca** (así el
próximo envío la lleva con la cuenta nueva). Lo que se repite es lo que más vale arreglar.

## Registro

| # | Fecha | Tipo | Veces | Pieza del kit | Qué pasó (1 línea) | Propuesta (1 línea) |
|---|---|---|---|---|---|---|
| 1 | 2026-10-13 | Hueco | 1 | ACTUALIZACIONES.md 3.4.0 + reference/qa-scripts/qa-local.ts | La QA contra base local solo existe para Supabase en Docker; este proyecto usa Firebase y hubo que escribir `qa-local.ts` desde cero (emuladores, `Bearer owner`, `admins/{uid}`) | Añadir una implementación para proyectos con Firebase: `qa-local.firebase.ts` (emuladores + seed + cuentas por REST del emulador) y pasos de migración con rama Supabase / Firebase → informe 2026-10-16 |
| 2 | 2026-10-13 | Hueco | 1 | ACTUALIZACIONES.md 3.5.0 + reference/EMAIL-TEMPLATES.md | Los correos asumen React Email + `supabase/templates/`; con Firebase Auth la plantilla vive en la consola (HTML limitado, sin repo) y el emulador no la aplica | Sección Firebase en EMAIL-TEMPLATES.md: qué se puede personalizar en Authentication › Templates, cuándo pasar a un correo propio (Admin SDK `generatePasswordResetLink` + Resend) y cómo probarlo en el emulador → informe 2026-10-16 |
| 3 | 2026-10-13 | Hueco | 1 | ACTUALIZACIONES.md 3.1.0 / prompts/ACTUALIZAR-PROYECTO.md / git-flow | El kit asume que todo proyecto lleva versión con Changesets; un panel privado de un cliente no lo necesita y el único camino era "salta los pasos" | Un camino oficial "sin versión": flag en `nuevo-proyecto.ps1` (ya existe `-SinVersion`), línea en CLAUDE.md.template, git-flow sin changeset, y que la tabla de deducir versión no lo confunda con 3.0.0 → informe 2026-10-16 |
| 4 | 2026-10-13 | Fricción | 1 | ACTUALIZACIONES.md "Cómo saber la versión" | Las señales se contradicen en proyectos sin Changesets: tiene `PHASE_LOG/` (≥3.0.0) pero no el tope de 60 líneas; la tabla salta a 3.1.0 solo por `.changeset/` | Que la tabla tenga señales que no dependan de Changesets (pool `-wt` en CLAUDE.md, formato de decisiones) → informe 2026-10-16 |
| 5 | 2026-10-13 | Hueco | 1 | ACTUALIZACIONES.md 3.3.0 | Los pasos editan `context/PROJECT_CONTEXT.md` y `COLORS.md`, que este proyecto no tenía (arrancó como dashboard corto) | Decir qué hacer si faltan: crearlos solo con las secciones que pide la migración → informe 2026-10-16 |
| 6 | 2026-10-13 | Hueco | 1 | reference/DEPLOY.md | El despliegue ya lo había hecho César a mano en Vercel; la guía solo cubre crear el proyecto desde cero | Paso "adoptar un proyecto de Vercel existente": localizarlo (MCP/CLI), escribir `.vercel/project.json`, comprobar conexión git y previews → informe 2026-10-16 |
| 7 | 2026-10-13 | Fricción | 1 | reference/qa-scripts/qa-local.ts | En Windows `spawn(..., { shell: true })` + `kill()` mata solo la shell: el emulador (Java) quedó huérfano ocupando puertos y la siguiente corrida falló | Matar el árbol con `taskkill /PID <pid> /T /F` en win32 (el qa-local del kit tiene el mismo patrón en `arrancarDev`) → informe 2026-10-16 |
| 8 | 2026-10-16 | Hueco | 1 | reference/EMAIL-TEMPLATES.md (ver #2) | La consola de Firebase bloqueó la edición de plantillas del proyecto ("no se pueden actualizar las plantillas… comunícate con Asistencia de Firebase"); solo lo desbloquea soporte y configurar SMTP propio (Brevo) no lo quita. El diseño del correo quedó hecho pero sin poder aplicarse | Avisar en el kit que con Firebase Auth la plantilla puede no ser personalizable: comprobar en la consola antes de diseñar el correo y, si está bloqueada, pedir el desbloqueo a soporte o planear el envío propio (Admin SDK `generatePasswordResetLink` + proveedor como Brevo/Resend) → informe 2026-10-16 |
| 9 | 2026-10-16 | Fricción | 1 | UPDATES.md 3.7.0 + new-project.ps1 -Existing | La comprobación de piezas manda correr `new-project.ps1 -Existing`, que también crea `phases/`, `design/`, `ci.yml` y plantilla de PR; en un proyecto en marcha solo hacían falta scripts, deps y .gitignore y hubo que hacerlo a mano | Un modo `-OnlyPieces` (o separar la parte de piezas) que no copie fases ni CI → PR Fockus26/web-agent-kit#10 |
| 10 | 2026-10-16 | Hueco | 1 | reference/scripts/test-related.ts | El glob `tests/**` incluye `tests/rules` (necesita el emulador); al cambiar `package.json` corre todo y falla sin emulador | Parametrizar `TEST_GLOBS` (variable o `--dir`) o documentar el ajuste para proyectos con tests de integración → PR Fockus26/web-agent-kit#10 |
| 11 | 2026-10-22 | Fricción | 1 | new-project.ps1 -OnlyPieces | Añadió `* text=auto` a un `.gitattributes` que ya tenía `* text=auto eol=lf` (anula el LF) y su paso final `bunx biome` falló sin `bunx` en el PATH de pwsh, dejando `.claude/settings.json` sin formatear (lint rojo) | Solo añadir `*.sh text eol=lf` si no hay ya una regla `eol=lf` global; formatear con `bun x biome` → PR Fockus26/web-agent-kit#15 |
| 12 | 2026-10-22 | Fricción | 1 | reference/qa-scripts/qa-local (Firebase) + plantilla de tests de reglas | En frío (primera vez en la máquina) los emuladores tardan > 90 s y `qa-local` aborta; y `initializeTestEnvironment` en `beforeAll` pasa de los 5 s por defecto de bun, así que `emulators:test` falla la primera corrida | Esperar 240 s en `qa-local` y poner `beforeAll(..., 30_000)` en la plantilla de tests de reglas → PR Fockus26/web-agent-kit#15 |
| 13 | 2026-10-22 | Hueco | 1 | cloud-session + git-flow (cierre de unidad) | Seis PRs de funcionalidad (#7–#10, cloud) se mergearon sin functional-qa ni design-qa; nadie las lanzó y la deuda salió de golpe semanas después (3 altos de pérdida de datos) | Que el cierre en la nube (y git-flow) exija functional-qa/design-qa cuando la unidad cierra un flujo o una página, o lo deje anotado como pendiente en CURRENT_PHASE → PR Fockus26/web-agent-kit#15 |
| 14 | 2026-10-22 | Hueco | 1 | agents/wave-qa.md + CLAUDE.md del proyecto | La descripción de wave-qa y la frase "base de datos real con Docker" asumen Supabase; en un proyecto Firebase César creyó que hacía falta Docker para probar | Describir la QA local por stack (Supabase → Docker; Firebase → emuladores + Java) en wave-qa y en la plantilla de CLAUDE.md → PR Fockus26/web-agent-kit#15 |
| 15 | 2026-10-22 | Hueco | 1 | design-qa + frontend-build (pantallas de estado) | design-qa exige una galería `/estados?screen=…` que ninguna skill pide crear; la 500 quedó sin auditar hasta que se añadió a mano | Que frontend-build cree la galería (solo dev, 404 en producción) al implementar las pantallas de estado → PR Fockus26/web-agent-kit#15 |
| 16 | 2026-10-22 | Hueco | 1 | reference/DEPLOY + plantilla de proyecto con subcarpeta (bot/) | Un subproyecto con su propio package.json (bot/) nunca tuvo `bun install`: su typecheck fallaba en main sin que nadie lo viera (CI no lo corre) | Que la comprobación de piezas detecte package.json anidados y que CI corra su typecheck/test → PR Fockus26/web-agent-kit#15 |
| 17 | 2026-10-24 | Hueco | 1 | UPDATES.md 3.13.0 paso 2 + reference/scripts/qa-local.ts | El qa-local del kit pasa el proyecto demo solo en `GCLOUD_PROJECT`; un seed que lo lee de `NEXT_PUBLIC_FIREBASE_PROJECT_ID` recibe el real de `.env.local` (Bun lo carga) y aborta | Pasar también `<prefix>FIREBASE_PROJECT_ID` en `emulatorEnv` del seed, o decirlo en el paso "rename or wrapper" |
| 18 | 2026-10-24 | Hueco | 1 | kit-update › Piece check | La revisión de piezas mira el job de subproyectos en `ci.yml` pero no si `ci.yml` existe; este proyecto no tenía CI y nada lo marcaba | Fila "`.github/workflows/ci.yml` existe" en la revisión de piezas, con la plantilla del kit si falta |
| 19 | 2026-11-10 | Error | 1 | reference/scripts/qa-local.ts (3.21.0) | `env.NODE_ENV = "production"` en `--preview` rompe `tsc` en un proyecto Next (los tipos de Next hacen NODE_ENV de solo lectura); se parcheó con `Object.assign(env, { NODE_ENV: "production" })` | Usar `Object.assign` en el script del kit |
| 20 | 2026-11-10 | Fricción | 1 | new-project.ps1 -OnlyPieces / install-kit.ps1 -Project | Escriben en CRLF: tsconfig.json quedó en CRLF y sin el formato de Biome (lint rojo) y la copia del kit dejó 64 archivos `w/crlf`; el paso 3.21.0 de reescribir con `git reset --hard` lo bloquea el modo auto (y CLAUDE.md lo prohíbe) | Escribir con LF y formatear tsconfig.json con Biome; en UPDATES, convertir solo los `w/crlf` con `sed -i 's/$//'` en vez de `reset --hard` |
| 21 | 2026-11-10 | Hueco | 1 | CLAUDE.md (plantilla) › Tech refs | Al pedir "migrar la db al VPS" el agente preguntó qué motor usar: el CLAUDE.md del proyecto no apunta a `tech/migrate-firebase-vps.md`, que ya fija Postgres + Drizzle + Better Auth | En la tabla "Qué leer" de la plantilla, fila "migrar al VPS → `tech/migrate-<origen>-vps.md`" |
| 22 | 2026-11-10 | Hueco | 1 | tech/vps-postgres.md §4 + migrate-firebase-vps.md §3 | `bunx auth@latest generate` salió sin error ni archivo: la config importa `next/server` (`after` del correo) y la CLI no la carga; hubo que escribir las tablas de Better Auth a mano | Recomendar una fábrica `crearAuth(db)` en un archivo sin imports de Next (sirve también para probar con PGlite) y que la CLI apunte a ella; o dar el esquema base de Better Auth en Drizzle en el kit |
| 23 | 2026-11-10 | Fricción | 1 | reference/scripts/qa-local.ts (Postgres) | En un PC con HDD el `initdb` del contenedor `postgres:17` tardó más de 9 min: el script del kit espera 2 min y aborta, y el propio entrypoint de la imagen se rindió una vez (`server did not start in time`) dejando el contenedor detenido | Esperar más (o hasta que el contenedor salga) y, si el contenedor quedó `Exited` tras un init fallido, recrearlo en vez de `docker start` |
| 24 | 2026-11-10 | Error | 1 | EMAIL-TEMPLATES.md § Better Auth + qa-local.ts | El ejemplo de `lib/email/send.ts` usa `SMTP_PASS` y `EMAIL_FROM`, pero `qa-local` pasa `SMTP_PASS` y `SMTP_FROM` ("Nombre <dir>"); hubo que aceptar ambos nombres y ambos formatos de remitente | Un solo juego de nombres en el kit (`SMTP_PASS` + `EMAIL_FROM`) y que qa-local pase esos |

## Cómo se envía al kit

Cuando César lo pida (o al cerrar la fase 09): la skill **`kit-feedback`**
(`/kit-feedback`). Arma el informe con las filas sin enviar, agrupadas por pieza del kit y
con lo más repetido primero, y abre un PR en el repo del kit con la etiqueta `kit-feedback`.
Las filas enviadas se marcan con `→ PR <owner/repo#N>` en "Propuesta" (no se borran). Las
marcadas `→ informe <fecha>` ya cuentan como enviadas.
