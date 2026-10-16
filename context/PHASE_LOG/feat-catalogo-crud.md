# feat/catalogo-crud (W2) — 2026-10-01

PR: https://github.com/Fockus26/inversiones-js/pull/3 · slot wt2 · puerto 4302

## Hecho
- `/productos` mobile-first: buscador, chips por marca con contador, resumen, grupos por marca
  (tarjetas < md, tabla ≥ md), cantidad rápida con autoguardado, diálogo editar/crear, borrar
  con alternativa "Ocultar", estados de carga/vacío/sin sesión/sin acceso/sin resultados.
- `lib/catalogo/validacion.ts` (puro, 37 tests) y `lib/catalogo/repositorio.ts` (huella
  actualizadoPor + serverTimestamp, orden en cliente).
- Decisiones D015–D019 en `context/decisions/03-catalogo.md`.

## Verificado
typecheck, lint, test, build; Playwright (29 comprobaciones) contra el emulador; axe 0
violaciones claro/oscuro a 320 y 1280 px; foco ≥ 5.2:1 en 32 controles.

## Pendiente / no verificado
- Rollback + toast cuando Firestore rechaza el guardado de cantidad (no se pudo provocar sin
  tocar datos compartidos).
- Quitar `FOCO` y `dark:bg-destructive/10` locales cuando llegue el arreglo global de foco/badge.
- Datos del emulador: HONOR 600 Elite quedó con sus valores del seed, salvo
  `actualizadoPor` / `actualizadoEn`, que ahora son del admin de prueba.
