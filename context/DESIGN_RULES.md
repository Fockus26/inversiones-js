# Reglas de diseño — Inversiones JS

Tokens en `app/globals.css` (claro y `.dark`). Usa las clases de Tailwind de los tokens
(`bg-primary`, `text-muted-foreground`, `bg-sidebar`…), nunca hex sueltos en componentes.

| Rol | Color | Uso |
|---|---|---|
| Primario | `#fec922` amarillo | fondo de botón principal, chip de marca activa, barra de acento. Texto encima: tinta `#1c1f26` |
| Secundario | `#1c1f26` tinta | barra lateral/cabecera, texto fuerte |
| Acento | `#0f766e` verde azulado | anillo de foco, enlaces, estado "guardado", cantidad > 0 |
| Destructivo | `#c0262d` | eliminar, errores, "agotado" |
| Selección (`::selection`) | claro `#fec922` / texto `#1c1f26` (10.6:1) · oscuro `#f4f4f1` / texto `#14161b` (16.9:1) | tokens `--selection` y `--selection-foreground`; distinta del foco y de los enlaces |
| Scrollbar | pulgar `#8a877c` / riel `#f1f0ea` · oscuro `#6b707c` / `#1c1f26` (≥ 3:1) | tokens `--scrollbar-*`; nunca oculta |

**Contraste:** el amarillo sobre fondo claro mide ~1.5:1. **Nunca** como color de texto, de
ícono suelto ni de borde de foco sobre claro. Sobre la tinta (`#1c1f26`) sí (≈11:1).

- Mobile-first: el cliente edita desde el teléfono. Debe funcionar a 320 px sin scroll horizontal.
- Objetivos táctiles ≥ 44 px. Inputs numéricos con `inputMode="decimal"`.
- Estados no solo por color: "Agotado" lleva texto/ícono, no solo rojo.
- El anillo de foco toma el color de tinta del componente que rodea (por `--ring`), ≥ 3:1
  contra lo que lo rodea: sobre la tinta, amarillo (D013); un solo anillo en todo el panel se
  ve ajeno sobre un botón rojo.
- Texto de placeholder ≥ **4.5:1**: el de por defecto (el texto al 50 %) da 3.25:1 en claro, y
  axe no lo revisa.
- Una acción dentro de un aviso (el "Reintentar" de un toast) usa el color de ese aviso, no el primario.
- `::selection` dentro de un componente con fondo propio (botón primario, aviso de color) usa
  su par invertido: el par global se pierde ahí.
- Modo claro y oscuro (next-themes, `system` por defecto).
