# feat/pantallas-estado-y-marca

Adenda de diseño (docs/HANDOFF.md §1–§5): pantallas 404 / 500 / sin conexión, `::selection`,
scrollbar, imagen Open Graph y plantilla del correo de restablecer contraseña.

**Verificado:** typecheck, lint, 103 tests, build. En navegador: 404 de invitado en claro
(desktop) y en oscuro a 320 px sin scroll horizontal; sin conexión a 320 px en oscuro; el SW
guarda `sin-conexion.html` en caché; OG a 1200×630 con Geist.

**No verificado:** 500 en pantalla (no hay ruta que falle a propósito); 404 con sesión
(emuladores apagados); el correo en clientes reales (Gmail/Outlook); `global-error`.
