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
| 9 | 2026-10-16 | Fricción | 1 | UPDATES.md 3.7.0 + new-project.ps1 -Existing | La comprobación de piezas manda correr `new-project.ps1 -Existing`, que también crea `phases/`, `design/`, `ci.yml` y plantilla de PR; en un proyecto en marcha solo hacían falta scripts, deps y .gitignore y hubo que hacerlo a mano | Un modo `-OnlyPieces` (o separar la parte de piezas) que no copie fases ni CI |
| 10 | 2026-10-16 | Hueco | 1 | reference/scripts/test-related.ts | El glob `tests/**` incluye `tests/rules` (necesita el emulador); al cambiar `package.json` corre todo y falla sin emulador | Parametrizar `TEST_GLOBS` (variable o `--dir`) o documentar el ajuste para proyectos con tests de integración |

## Cómo se envía al kit

Cuando César lo pida (o al cerrar la fase 09): la skill **`kit-feedback`**
(`/kit-feedback`). Arma el informe con las filas sin enviar, agrupadas por pieza del kit y
con lo más repetido primero, y abre un PR en el repo del kit con la etiqueta `kit-feedback`.
Las filas enviadas se marcan con `→ PR <owner/repo#N>` en "Propuesta" (no se borran). Las
marcadas `→ informe <fecha>` ya cuentan como enviadas.
