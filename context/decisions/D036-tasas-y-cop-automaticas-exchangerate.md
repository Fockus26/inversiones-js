# D036 · Financiamiento · Tasas $ y COP automáticas (ExchangeRate-API, respaldo jsDelivr) o manuales · Implementado

**Título original:** Tasas de dólares y pesos automáticas (mercado) o manuales

**Contexto:** el cliente quiere que 1 € en $ y en COP salgan solos, con el valor que muestra
Google al buscar "1 euro en dólares", y poder escribirlos a mano si prefiere.

**Decisión:** `configuracion/rcv` suma `fuenteUsd` y `fuenteCop` (`"mercado"` o `"manual"`; sin
el campo = manual). Google no tiene API (sus cifras son de proveedores de mercado), así que se
usa ExchangeRate-API (`open.er-api.com/v6/latest/EUR`, gratis, sin clave, actualiza a diario) y,
si falla, la currency-api de jsDelivr (`@fawazahmed0/currency-api`). Mismo esquema que el BCV
(D031): el panel la pide a `/api/tasa-mercado` (caché de CDN 15 min), el bot directo con caché
de 30 min, y `tasaUsd`/`tasaCop` quedan como respaldo que el panel refresca al abrirse.

**Por qué:** gratis, sin registro y con fuente de respaldo. Difiere de Google en céntimos porque
se actualiza una vez al día, no al minuto; para cotizar pólizas basta.
