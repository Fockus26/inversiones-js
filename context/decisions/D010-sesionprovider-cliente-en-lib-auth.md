# D010 · Auth · `SesionProvider` cliente en `lib/auth/`, montado en panel y login · Implementado

**Título original:** Sesión: `SesionProvider` de cliente en `lib/auth/`, montado por sección

`lib/auth/sesion.tsx` escucha `onAuthStateChanged` y lee `admins/{uid}`; expone
`{ estado: "cargando" | "fuera" | "sin-acceso" | "admin", usuario, motivoSalida, salir() }` con
`useSesion()`. Se monta en `app/(panel)/layout.tsx` y en `/login`, no en el layout raíz (la
raíz solo redirige). Si la lectura de `admins/{uid}` falla (red), se trata como "sin-acceso":
lo conservador es no dejar pasar. Alternativa descartada: provider en el layout raíz (cargaría
Firebase Auth en rutas que no lo necesitan y no evita remontar nada relevante).
