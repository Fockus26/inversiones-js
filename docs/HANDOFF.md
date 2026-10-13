# HANDOFF — Inversiones JS (panel)

## Adenda: estados, selección, iconos, OG y correo

Diseño: lienzo "Inversiones JS · Adenda" (Claude Design). Sin estilos nuevos: todo sale de
los tokens de `app/globals.css` (D001). WCAG 2.1 AA; ningún estado solo por color.

### 1. Pantallas de estado

Una sola plantilla con 5 variantes (`variante`): `404-sesion`, `404-invitado`,
`500-codigo`, `500`, `sin-conexion`. Todas funcionan en claro y oscuro.

**Estructura:** cabecera mínima (logo + "Inversiones JS", enlace al inicio) → `<main>` con
etiqueta (chip con ícono + texto) → `<h1>` → línea explicativa → [lista / código] → acciones.

| Token | Claro | Oscuro |
|---|---|---|
| Fondo | `--background` #fafaf7 | #14161b |
| Cabecera | `--sidebar` #1c1f26 | #0f1115 |
| Título | `--foreground` #1c1f26 | #f4f4f1 |
| Línea | `--muted-foreground` #5b5f6a (6.3:1) | #a6a9b2 (7.9:1) |
| Chip | `--muted` + `--border` | #23262e + #2f333d |
| Botón principal | `--primary` #fec922 / texto #1c1f26 (10.6:1) | igual |
| Botón secundario | transparente, borde `--input`, texto `--foreground` | borde #5a5f6b |
| Foco | anillo 3 px `--ring` + offset 2 px | anillo amarillo |

**Medidas**

| | Desktop (≥ 768) | Mobile (< 768, probado 390 y 320) |
|---|---|---|
| Cabecera | 64 px, padding x 40 | 56 px, padding x 16 |
| Contenido | centrado vertical, `max-width: 560px` | arriba, padding 48 / 16 / 32 |
| H1 | 44 / 1.1 / 800, tracking −0.02em | 30 / 1.1 / 800 |
| Línea | 18 / 1.55 | 16 / 1.55 |
| Gap vertical | 16 px | 16 px |
| Botones | fila, gap 12, alto 48, radio 10, 600 16 px | columna, ancho 100 % |

A 320 px: el bloque del código hace `flex-wrap` (código arriba, botón "Copiar código" abajo)
y el código usa `overflow-wrap: anywhere`. Sin scroll horizontal.

**Copy**

| Variante | Etiqueta | Título | Línea | Acciones |
|---|---|---|---|---|
| 404 con sesión | Error 404 | No encontramos esta página | Puede que el enlace esté mal escrito o que la página ya no exista. Tu catálogo no se ha tocado. | **Ir al catálogo** |
| 404 invitado | Error 404 | No encontramos esta página | Puede que el enlace esté mal escrito o que la página ya no exista. Entra para ver y editar tu catálogo. | **Entrar** · Ir al inicio |
| 500 con código | Error 500 | Algo falló de nuestro lado | No es tu culpa. Vuelve a intentarlo; si se repite, envíale este código a soporte. | **Reintentar** · Ir al inicio |
| 500 sin código | Error 500 | Algo falló de nuestro lado | No es tu culpa. Espera unos segundos y vuelve a intentarlo. | **Reintentar** · Ir al inicio |
| Sin conexión | Sin conexión | No hay internet en este momento | Lo que ya guardaste está a salvo. Los cambios que no alcanzaste a guardar no se enviaron: revísalos al volver. Comprueba: wifi o datos activados · modo avión apagado · que otras páginas abran. | **Reintentar** |

En negrita, el botón principal (amarillo). El 500 sin código muestra el mismo layout sin el bloque.

**Estados / comportamiento**

- Código 500: `<code>` en Geist Mono 17 px con `user-select: all`, etiqueta "Código para soporte"
  (`aria-labelledby`). Botón "Copiar código" (44 px) → `navigator.clipboard.writeText`; la
  etiqueta pasa a "Copiado" durante 2 s dentro de `aria-live="polite"`. El código viene de
  `error.digest` (`app/error.tsx`); si no hay `digest`, se usa la variante sin código.
- "Reintentar" en 500 llama a `reset()`/`unstable_retry`; en sin conexión recarga y,
  si `navigator.onLine` sigue en `false`, no hace nada más (el botón no se deshabilita).
- Sin conexión: la sirve el service worker (`public/sw.js`) como fallback de navegación.
  Debe ser autocontenida (sin fuentes externas: cae a `system-ui`).
- 404 elige variante según haya sesión de Firebase Auth (en cliente; mientras carga, invitado).
- Ícono del chip distinto por tipo (lupa, triángulo, wifi tachado) + texto: el estado nunca
  depende solo del color. Íconos `aria-hidden`.
- `<title>`: "Página no encontrada · Inversiones JS", "Error · Inversiones JS",
  "Sin conexión · Inversiones JS". 404 y 500 con `robots: noindex`.

### 2. Selección de texto (`::selection`)

```css
::selection { background: #fec922; color: #1c1f26; }        /* claro: 10.6:1 */
.dark ::selection { background: #f4f4f1; color: #14161b; }  /* oscuro: 16.9:1 */
```

- Claro: relleno amarillo ≠ foco (anillo verde azulado) ≠ enlace (texto verde azulado subrayado).
- Oscuro: el foco es amarillo, por eso la selección es un relleno claro invertido; ≠ enlace #4fd1c0.
- Proponer como tokens `--selection` / `--selection-foreground` en ambos temas.

### 2b. Scrollbar

```css
:root { scrollbar-color: #8a877c #f1f0ea; }                 /* Firefox: pulgar / riel */
.dark, [data-sidebar] { scrollbar-color: #6b707c #1c1f26; }
::-webkit-scrollbar { width: 14px; height: 14px; }
::-webkit-scrollbar-track { background: #f1f0ea; }
::-webkit-scrollbar-thumb { background: #8a877c; border-radius: 999px; border: 3px solid #f1f0ea; }
::-webkit-scrollbar-thumb:hover { background: #5b5f6a; }
.dark ::-webkit-scrollbar-track { background: #1c1f26; }
.dark ::-webkit-scrollbar-thumb { background: #6b707c; border-color: #1c1f26; }
.dark ::-webkit-scrollbar-thumb:hover { background: #a6a9b2; }
```

- Pulgar visible de 8 px (14 − 2 × 3 de borde), con forma de píldora. Contraste pulgar/riel ≥ 3:1
  (claro 3.2:1, oscuro 3.3:1; hover 5.6:1 y 7.0:1), según 1.4.11.
- Sin amarillo ni verde azulado, para no confundirse con el foco, la selección o los enlaces.
- La barra lateral (tinta) usa la variante oscura también en el tema claro.
- En el teléfono se deja la barra nativa superpuesta del sistema: no se estiliza.
- No se oculta nunca (`scrollbar-width: none` prohibido en zonas con contenido).
- Contenedores con scroll propio: `tabindex="0"` + `aria-label`, para poder desplazarlos con el teclado.
- Proponer tokens `--scrollbar-track` / `--scrollbar-thumb` / `--scrollbar-thumb-hover`.

### 3. Apple touch icon

- 180 × 180 PNG **opaco** (sin canal alfa), fondo #fec922 a sangre, esquinas rectas (iOS aplica la máscara).
- Mismo dibujo que `/icono/[tamano]`: barra tinta 6 % × 36 %, "JS" 40 % peso 800, gap 5 %.
- Ya implementado: la ruta `/icono/180` (D035) y `metadata.icons.apple = "/icono/180"` en `app/layout.tsx`.

### 4. Imagen Open Graph

- 1200 × 630, fondo tinta #1c1f26, franja amarilla de 16 px a la izquierda.
- Margen de seguridad 80 px por lado (zona útil 1040 × 470; recorte cuadrado centrado conserva el título).
- Logo 120 × 120 (radio 26) arriba-izquierda; título "Inversiones JS · Panel" 76 / 1.05 / 800
  (#f4f4f1, punto en amarillo); subtítulo "Catálogo de equipos a crédito" 30 px #a6a9b2 (7.9:1).
- `app/opengraph-image.tsx` con `ImageResponse` (igual que los íconos), `alt = "Inversiones JS · Panel"`.

### 5. Correo: restablecer contraseña (Firebase Auth)

- **Asunto:** Restablece tu contraseña de Inversiones JS
- **Preheader:** El enlace vence en 1 hora. Si no lo pediste, ignora este correo.
  (span oculto al inicio del cuerpo: `display:none; max-height:0; overflow:hidden`)
- **Cuerpo:** H1 "Restablece tu contraseña" · "Hola, recibimos una solicitud para cambiar la
  contraseña del panel de Inversiones JS asociada a %EMAIL%." · "Toca el botón para elegir una
  nueva. El enlace funciona una sola vez y vence en 1 hora." · botón **Crear nueva contraseña**
  (`%LINK%`) · "¿El botón no funciona? Copia y pega este enlace en tu navegador:" + `%LINK%` en
  texto · "Si no pediste este cambio, ignora este correo: tu contraseña seguirá igual." ·
  pie "Inversiones JS · Panel administrativo / Este es un correo automático, no lo respondas."
- **Maquetación:** tablas `role="presentation"`, 600 px de ancho (fluido hasta 360), estilos
  en línea, Arial/Helvetica. Padding 40 px (24 a 360). Cabecera tinta + barra amarilla 4 px.
- **Sin imágenes:** el logo es una celda amarilla con "JS" en texto → se lee con imágenes bloqueadas.
- **Botón:** celda #fec922, enlace `display:block`, padding 16 × 28, 17 px bold, alto ≥ 52 px
  (≥ 44 px), borde 2 px #1c1f26 para que siga visible si el cliente invierte el fondo. A 360 px, ancho 100 %.
- **Oscuro forzado:** cabecera ya oscura; texto y fondo se invierten sin perder contraste; el
  botón amarillo con texto tinta mantiene 10.6:1; enlaces en verde azulado subrayados.
- Texto 16 px #1c1f26 sobre #fff (16:1); secundario 14 px #5b5f6a (6.3:1).
- Nota: Firebase solo deja editar el cuerpo de esta plantilla si el proyecto tiene dominio
  personalizado de envío; sin él, solo asunto y remitente. Verificarlo en la consola.

### Archivos exportados

| Archivo | Medidas | Formato | Peso (build) |
|---|---|---|---|
| `/icono/180` (apple touch icon) | 180 × 180 | PNG opaco | 3.0 KB |
| `/opengraph-image` (`app/opengraph-image.tsx`) | 1200 × 630 | PNG, Geist 800/400 | 36.8 KB |
| `public/sin-conexion.html` | fluido, 320 → 1440 | HTML autocontenido | 3.7 KB |
| `docs/correos/restablecer-contrasena.html` | 600 px, fluido a 360 | HTML con estilos en línea | 3.7 KB (Gmail corta a 102 KB) |
