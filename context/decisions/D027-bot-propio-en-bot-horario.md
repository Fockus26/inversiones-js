# D027 · Chatbot · Bot propio en `bot/`; horario en Firestore, citas en Calendar · Implementado

**Título original:** Bot propio (Bun) en `bot/` en vez de n8n; horario en Firestore, citas en Calendar

**Contexto:** el flujo de WhatsApp necesita estado por conversación, leer el catálogo y agendar
citas contra Google Calendar. El documento inicial proponía n8n.

**Decisión:** servicio Bun/TS en `bot/` del mismo repo, en Docker junto a Evolution API
(red `automation-net`). Estado en SQLite (volumen). Reusa `lib/catalogo` y `lib/horario`.
El horario de atención es configuración del negocio → `configuracion/horario` en Firestore
(editable desde el panel). Las citas viven en Google Calendar (el dueño las ve y mueve desde
el teléfono); los recordatorios se marcan en el propio evento para no duplicarse.
Una sola cuenta de servicio (`chatbot-lectura`) para Firestore (lectura) y Calendar (por
compartir el calendario).

**Por qué:** versionado y testeado como el panel, sin copiar lógica a nodos de n8n, y el
estado de conversación queda resuelto sin una tabla externa.
