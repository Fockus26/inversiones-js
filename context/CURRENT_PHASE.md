# Fase actual

**Migración Firebase → Postgres en el VPS** (pedida por César el 2026-11-10).
Plan: `context/plans/migrate-vps.md` · Rama: `feat/migrate-vps` (PR en borrador hasta el corte).

| Paso | Estado |
|---|---|
| Preparativos (Brevo, hash, permiso Vercel) | Hecho: variables en Vercel prod + preview |
| 0 Arranque (rama, Tech refs, D044 modelo) | Hecho · PR #26 (borrador) |
| 1 BD (3 bases en kit-vps, esquema, migración en _dev y _preview) | Hecho · PR #26 |
| 2 Auth (Better Auth, hash de Firebase, límites, correo, scripts) | Hecho · PR #26 |
| 3 Login + capa de datos (server actions con comoAdmin, sondeo, /restablecer) | Hecho · PR #26 |
| 4 Bot (bot/src/db.ts, Docker, CI, D045) | Hecho · PR #26 |
| 5 qa:local + seed sobre Postgres (probado en Docker) | Hecho · PR #26 |
| 6 Exportación ensayada: usuarios + 76 docs de Firestore en _dev, comparados | Hecho · PR #26 |
| 7 QA | Hecho (functional-qa: 12 hallazgos corregidos en e84a1af; QA en navegador no repetida) |
| 8 Corte con César | Hecho 2026-11-10 (PR #26 mergeado; cierre en PR #27; pendientes de César en D046) |

Antes: olas 0–1 (auth, catálogo, chatbot) y adendas mergeadas; sin PRs abiertos.
