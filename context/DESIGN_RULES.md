# Reglas de diseño — Inversiones JS

Tokens en `app/globals.css` (claro y `.dark`). Usa las clases de Tailwind de los tokens
(`bg-primary`, `text-muted-foreground`, `bg-sidebar`…), nunca hex sueltos en componentes.

| Rol | Color | Uso |
|---|---|---|
| Primario | `#fec922` amarillo | fondo de botón principal, chip de marca activa, barra de acento. Texto encima: tinta `#1c1f26` |
| Secundario | `#1c1f26` tinta | barra lateral/cabecera, texto fuerte |
| Acento | `#0f766e` verde azulado | anillo de foco, enlaces, estado "guardado", cantidad > 0 |
| Destructivo | `#c0262d` | eliminar, errores, "agotado" |
| Selección (`::selection`) | PENDIENTE (claro y oscuro) | fondo y texto del texto seleccionado; contraste ≥ 4.5:1 verificado |

**Contraste:** el amarillo sobre fondo claro mide ~1.5:1. **Nunca** como color de texto, de
ícono suelto ni de borde de foco sobre claro. Sobre la tinta (`#1c1f26`) sí (≈11:1).

- Mobile-first: el cliente edita desde el teléfono. Debe funcionar a 320 px sin scroll horizontal.
- Objetivos táctiles ≥ 44 px. Inputs numéricos con `inputMode="decimal"`.
- Estados no solo por color: "Agotado" lleva texto/ícono, no solo rojo.
- Modo claro y oscuro (next-themes, `system` por defecto).
