# D041 · Chatbot · Agotados ocultos en la lista de precios · Implementado

**Decisión:** `textoListaDePrecios` oculta por defecto los productos con `cantidad == 0`
(`agotados: "ocultar"`). `"marcar"` sigue disponible como opción.
**Por qué:** lo pidió el cliente (2026-10-19). Además, así la lista coincide con la de Gaby, que ya
listaba los equipos sin agotados (`bot/src/flujo.ts`).
**Consecuencia:** hasta que se cargue el stock en el panel, la lista sale vacía (solo el título).
Reemplaza la parte de "agotados" de D021; la zona horaria de D021 sigue vigente.
