# D022 · Chatbot · Alta de admins por script con contraseña temporal · Implementado

`bun run admin:crear <correo> (--emulador | --prod)`: crea o encuentra el usuario en Auth y crea
`admins/{uid}`. Si el usuario es nuevo, contraseña aleatoria (24 caracteres) impresa una sola
vez; si ya existía, su contraseña no se toca. Producción exige `--prod` y
`GOOGLE_APPLICATION_CREDENTIALS`; con emulador, el proyecto debe ser `demo-*`.
