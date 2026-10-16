# feat/chatbot-produccion (W3) — 2026-10-01

- `lib/catalogo/texto-lista.ts` + tests: lista de precios en formato del cliente (D020, D021).
- `docs/chatbot.md`: contrato de datos, lectura con firebase-admin (cuenta `roles/datastore.viewer`),
  lista, búsqueda por modelo, caché 60 s vs onSnapshot (D024). Snippets ejecutados contra el emulador.
- `scripts/crear-admin.ts` (`admin:crear`) y `scripts/seed-produccion.ts` (`seed:produccion`), con
  `--prod`/`--emulador` explícitos, `--proyecto`, `--forzar` (D022, D023). Probados en emulador (demo-w3).
- README en español con guía de puesta en producción.
- Pendiente con el cliente (filas 10–12 de CONTENT_CHECKLIST, no editadas por el worker):
  10 formato exacto de la lista (¿producto y precio en una o dos líneas?);
  11 zona horaria / país para la fecha (supuesto America/Caracas);
  12 agotados en el chatbot: ¿marcar "(agotado)" u ocultar?
