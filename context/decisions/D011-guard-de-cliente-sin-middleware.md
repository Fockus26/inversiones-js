# D011 · Auth · Guard de cliente, sin middleware; `siguiente` solo rutas internas · Implementado

**Título original:** Guard del panel solo en el cliente, sin middleware ni cookies

`lib/auth/guard-panel.tsx`: `cargando` → esqueleto; `fuera` → `/login?siguiente=<ruta>`;
`sin-acceso` → `signOut` y `/login?aviso=sin-acceso`; "Cerrar sesión" → `/login` a secas.
`?siguiente=` solo acepta rutas internas (`lib/auth/siguiente.ts`: empieza por `/`, no por `//`
ni `/\`, sin caracteres de control, no `/login`). Es comodidad: la barrera son las reglas (D003).
