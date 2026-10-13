# D031 · Chatbot · Tasa Bs. del BCV (DolarAPI) o manual; tasa COP manual · Implementado

**Título original:** Tasa de bolívares del BCV (o manual) y tasa de pesos colombianos

**Contexto:** el cliente quiere cotizar los bolívares con la tasa oficial del euro del BCV, con
la opción de escribirla a mano, y vuelve a necesitar pesos colombianos (manuales, como los
dólares). Reemplaza la nota de D030 que dejaba fuera los COP.

**Decisión:** `configuracion/rcv` suma `fuenteBs` (`bcv`/`manual`) y `tasaCop`. La tasa BCV se
lee de DolarAPI (`ve.dolarapi.com/v1/euros/oficial`): gratis, sin clave, JSON; el BCV no tiene
API y raspar su web falla por su certificado. El panel la pide a `/api/tasa-bcv` (ruta de
Next con caché de CDN de 15 min, para no depender del CORS) y el bot directo, con caché de
30 min. Con BCV, `tasaBs` queda como respaldo: el panel la actualiza al abrirse si cambió.

**Por qué:** la tasa BCV cambia a diario y el cliente no tiene que acordarse de copiarla; si
DolarAPI se cae, el chat sigue cotizando con la última conocida. Alternativas vistas:
pydolarve.org (ha cambiado de API y pedido token), AllRatesToday (300 consultas/mes),
raspar bcv.org.ve.
