# D003 · Auth · Acceso: Auth + `admins/{uid}` en reglas · Implementado

**Título original:** Acceso: Firebase Auth + lista `admins/{uid}` aplicada en las reglas

Login con correo y contraseña. Solo puede leer/escribir el panel quien tenga documento en
`admins/{uid}`. El chequeo del front (redirigir a /login) es comodidad; la barrera real son
las reglas de Firestore. El registro público no existe en la UI y se desactiva en consola.
Las cuentas y los documentos `admins` los crea el dueño del proyecto (script o consola).
