# D029 · Chatbot · RCV por categoría; planes y solicitudes tras `Servicios` (web pendiente) · Implementado

**Título original:** RCV por categoría con planes en `bot/src/rcv.ts` y solicitudes en SQLite (provisional)

**Contexto:** el cliente pidió que al elegir el tipo de transporte (público, privado o placas
extranjeras) se listen los vehículos de esa categoría con su precio y requisitos, y que se
tomen nombre, correo y teléfono. Precios y solicitudes vivirán en una página web que aún no
está definida.

**Decisión:** los planes son datos (`PlanRcv`, con `categorias` y `ofreceFinanciamiento`) y el
flujo los pide a `Servicios.planesRcv()`; las solicitudes salen por
`Servicios.guardarSolicitudRcv()`. Mientras no exista la web, la primera devuelve la tabla del
cliente y la segunda escribe en `solicitudes_rcv` (SQLite del bot). Los requisitos son
provisionales hasta que el cliente los confirme.

**Por qué:** al llegar la página web solo cambian esas dos funciones de `servicios.ts`; el
flujo y sus tests no se tocan.
