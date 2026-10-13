# D017 · Catálogo · Orden en cliente; nuevos al final (`orden` máx + 1) · Implementado

**Título original:** Orden en cliente y `orden` de los productos nuevos

`escucharProductos` escucha la colección entera y ordena en cliente por marca (alfabético,
D025) y luego `orden`: dos `orderBy` pedirían un índice compuesto en producción. Un producto
creado desde el panel recibe `orden = máximo actual + 1` (queda al final de su marca). Con
decenas de productos el costo es despreciable.
