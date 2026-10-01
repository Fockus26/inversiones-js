# D010 — Sesión: `SesionProvider` de cliente en `lib/auth/`, montado por sección

`lib/auth/sesion.tsx` escucha `onAuthStateChanged` y lee `admins/{uid}`; expone
`{ estado: "cargando" | "fuera" | "sin-acceso" | "admin", usuario, motivoSalida, salir() }` con
`useSesion()`. Se monta en `app/(panel)/layout.tsx` y en `/login`, no en el layout raíz (la
raíz solo redirige). Si la lectura de `admins/{uid}` falla (red), se trata como "sin-acceso":
lo conservador es no dejar pasar. Alternativa descartada: provider en el layout raíz (cargaría
Firebase Auth en rutas que no lo necesitan y no evita remontar nada relevante).

# D011 — Guard del panel solo en el cliente, sin middleware ni cookies

`lib/auth/guard-panel.tsx`: `cargando` → esqueleto; `fuera` → `/login?siguiente=<ruta>`;
`sin-acceso` → `signOut` y `/login?aviso=sin-acceso`; "Cerrar sesión" → `/login` a secas.
`?siguiente=` solo acepta rutas internas (`lib/auth/siguiente.ts`: empieza por `/`, no por `//`
ni `/\`, sin caracteres de control, no `/login`). Es comodidad: la barrera son las reglas (D003).

# D012 — Textos de error del login: no revelan qué correos existen

`auth/invalid-credential`, `auth/wrong-password` y `auth/user-not-found` → el mismo "Correo o
contraseña incorrectos." "¿Olvidaste tu contraseña?" responde siempre "Si ese correo tiene una
cuenta, te enviamos un enlace…" (también si no existe). Traducciones en `lib/auth/errores.ts`.

# D013 — Cabecera del panel sobre tinta con foco amarillo

`components/panel/cabecera.tsx`: fondo `bg-sidebar`, marca con barra y chip amarillos, correo
(segunda línea truncada en móvil), tema claro/oscuro/sistema (`components/panel/tema.tsx`) y
"Cerrar sesión" (solo ícono bajo 400 px, con nombre accesible). Sobre la tinta el anillo de foco
es amarillo (`sidebar-ring`, ≈11:1): el verde azulado no llega a 3:1 sobre `#1c1f26`.

# D014 — Tests de reglas con `bun test` y proyecto propio `demo-reglas-w1`

`tests/rules/reglas.test.ts` usa `@firebase/rules-unit-testing` contra el emulador que ya corre
en :8080, con `projectId` propio para no pisar las reglas ni los datos de `demo-inversiones-js`.
Corre bien bajo `bun test` (no hizo falta node). `clearFirestore()` solo limpia ese proyecto.
