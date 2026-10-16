# D040 · Auth · Proveedor de correos: Brevo por SMTP, con envío propio vía Admin SDK · Pendiente

**Decisión:** los correos de la app (restablecer contraseña y los que vengan) se envían con
Brevo por SMTP. Como la consola de Firebase tiene bloqueada la edición de plantillas, el
enlace se genera con el Admin SDK (`generatePasswordResetLink`) y el correo lo manda la app.
**Por qué:** default del kit; Firebase no deja personalizar ni cambiar la plantilla de este
proyecto y configurar SMTP propio en la consola no lo desbloquea (ver `KIT_FEEDBACK.md` #8).
**Alternativa descartada:** Resend (misma arquitectura; se eligió Brevo por defecto del kit).
