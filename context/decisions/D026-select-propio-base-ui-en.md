# D026 · Marcas · Select propio (Base UI) en vez del `<select>` nativo · Implementado

**Título original:** Select propio (Base UI) en vez del `<select>` del navegador

El campo Marca usa `components/catalogo/selector-marca.tsx`, sobre `Select` de
`@base-ui/react` (el mismo primitivo que usaría el `select` de shadcn base-nova; el registro de
shadcn no estaba accesible). Botón con rol `combobox` nombrado por su `<Label htmlFor>`,
opciones de 44 px, ✓ en la elegida, teclado (flechas, Enter, Escape, escribir para saltar) y
lista con scroll. Vive en `components/catalogo/`, no en `components/ui/`, porque no es el
archivo generado por shadcn.
