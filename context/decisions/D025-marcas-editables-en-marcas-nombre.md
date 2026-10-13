# D025 · Marcas · Marcas editables en `marcas/{nombre}`; renombrar en lote · Implementado

**Título original:** Marcas editables en la colección `marcas` (id = nombre)

Las marcas dejan de ser una lista fija en código (`MARCAS`) y en `firestore.rules`: viven en
`marcas/{nombre}` (`{ nombre, actualizadoEn, actualizadoPor }`) y el cliente las agrega,
renombra y borra desde el botón «Marcas» de /productos.

- **Id = nombre en mayúsculas** (`HONOR`). La regla de `productos` exige
  `existsAfter(marcas/<marca>)` al crear o al cambiar de marca, y la de `marcas` solo deja
  *crear* (no sobrescribir), así que no hay duplicados. Patrón compartido por
  `lib/catalogo/marcas.ts` y la regla: `^[A-Z0-9ÁÉÍÓÚÜÑ][A-Z0-9ÁÉÍÓÚÜÑ &.+-]*$`, ≤ 30.
- **Los productos siguen guardando el nombre** en `marca` (no un id): el contrato con el
  chatbot no cambia de forma, solo deja de ser una lista cerrada.
- **Renombrar** = un lote: crea la nueva, actualiza `marca` en todos sus productos (con
  huella) y borra la vieja. Todo o nada.
- **Borrar** solo si no tiene productos (lo comprueba el panel con una consulta; las reglas no
  pueden). Si tiene, se pide moverlos o borrarlos antes.
- **Orden alfabético** (`compararMarcas`) en el panel y en `textoListaDePrecios`: con las
  marcas iniciales da el mismo orden que la lista fija. Sin campo `orden` en marcas.
- **Datos de antes:** si la marca de un producto no tiene documento, el producto se sigue
  editando mientras no cambie de marca, y el diálogo «Marcas» la muestra como «Sin
  registrar» con un botón para registrarla. `seed:produccion` registra las que falten.

Alternativas descartadas: id automático + `marcaId` en productos (rompe el contrato con el
chatbot y obliga a un join); dejar la lista en las reglas (cada marca nueva exigiría deploy).
