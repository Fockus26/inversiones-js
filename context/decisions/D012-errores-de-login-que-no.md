# D012 · Auth · Errores de login que no revelan cuentas · Implementado

**Título original:** Textos de error del login: no revelan qué correos existen

`auth/invalid-credential`, `auth/wrong-password` y `auth/user-not-found` → el mismo "Correo o
contraseña incorrectos." "¿Olvidaste tu contraseña?" responde siempre "Si ese correo tiene una
cuenta, te enviamos un enlace…" (también si no existe). Traducciones en `lib/auth/errores.ts`.
