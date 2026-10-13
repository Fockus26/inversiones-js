# D002 · Datos · Modelo: colección `productos`, doc por equipo · Implementado

**Título original:** Modelo: colección `productos`, un documento por equipo

Campos en `lib/catalogo/tipos.ts`: marca, nombre, variante ("8/256"), inicial, cuota,
numeroCuotas (6), cantidad, activo, orden, actualizadoEn, actualizadoPor. Precios como número
(no texto) para que el chatbot pueda calcular/ordenar. Id estable `marca-nombre-variante`
para el seed; los productos nuevos creados desde el panel usan id automático.
`cantidad` arranca en 0: la lista del cliente no la traía.
