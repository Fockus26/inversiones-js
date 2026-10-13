# D024 · Chatbot · Chatbot: cuenta de solo lectura + caché 60 s · Implementado

**Título original:** El chatbot lee con una cuenta de solo lectura y caché de 60 s

Cuenta de servicio aparte con `roles/datastore.viewer` (no la de Firebase Admin). Consulta
`productos where activo == true` con el Admin SDK. Recomendado: caché en memoria de 60 s
(cambios visibles en < 1 min, pocas lecturas); `onSnapshot` solo si el chatbot es un proceso
persistente. Detalle en `docs/chatbot.md`.
