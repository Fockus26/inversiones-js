# Pendientes (después de la ola 1)

- Anillo de foco global: `components/ui/button.tsx` e `input.tsx` usan `focus-visible:ring-ring/50`, que no llega a 3:1 sobre blanco. Pasarlo a `ring-ring` en una unidad transversal (visto por W1).
- Extraer a un módulo común la elección emulador/producción, duplicada en `scripts/crear-admin.ts` y `scripts/seed-produccion.ts` (visto por W3).
- Misma unidad transversal: `Badge`/`Button` destructive en oscuro (texto 4.37:1), texto "Close" en inglés en `DialogContent`/`DialogFooter`, y `outline-ring/50` de la capa base en controles nativos. Al arreglarlo, quitar los parches locales de D019 (visto por W2).
- Probar el rollback + toast de la edición rápida de cantidad cuando Firestore rechaza (no verificado por W2).

# Adenda de diseño (PR #12)

Hechos en PR #12: pantallas 404 / 500 / sin conexión, `::selection`, scrollbar, Open Graph;
el apple touch icon ya existía.

- **PENDIENTE — Correo de restablecer contraseña con la marca.** Plantilla lista en
  `docs/correos/restablecer-contrasena.html` (asunto y preheader en el comentario del archivo).
  Bloqueado: la consola de Firebase no deja editar plantillas en este proyecto (2026-10-16).
  Siguiente paso, a elegir por César:
  1. Escribir a Asistencia de Firebase (https://firebase.google.com/support/troubleshooter/contact)
     pidiendo el desbloqueo; si lo dan, pegar la plantilla y poner el idioma en español.
  2. Envío propio: ruta `/api/restablecer` con `generatePasswordResetLink` (Admin SDK) + API
     transaccional de Brevo, respuesta siempre igual (no revela si el correo existe) y límite de
     intentos. Requiere dominio verificado en Brevo, `BREVO_API_KEY` y cuenta de servicio en Vercel.
  Mientras tanto: probar si al menos deja cambiar el idioma de la plantilla a español.

# Ideas para después (2026-10-19)

- **Flujo de Gaby en el panel:** primero una vista de solo lectura del flujo del bot (menús, pasos
  y textos reales de `bot/src/textos.ts`). Después, poder editarlo desde el panel. Para no
  reescribir el bot entonces, conviene extraer el flujo a datos declarativos en `lib/` que
  compartan el bot y el panel. No empezar sin el OK de César.
