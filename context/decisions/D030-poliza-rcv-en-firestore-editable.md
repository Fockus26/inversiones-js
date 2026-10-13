# D030 · Chatbot · Póliza RCV en Firestore editable en `/rcv`; bot con Datastore User escribe `solicitudesRcv` · Implementado

**Título original:** Póliza RCV en Firestore, editable en el panel; el bot pasa a escribir solicitudes

**Contexto:** el cliente quiere editar los transportes de la póliza (agregar, editar, borrar)
y las tasas del día desde el panel, como el catálogo de celulares, y guardar los datos que
deja la gente en el chat. Reemplaza lo provisional de D029 (tabla fija y SQLite).

**Decisión:** `planesRcv` (precio fijo en €), `configuracion/rcv` (tasas € → $ y € → Bs.,
requisitos por tipo) y `solicitudesRcv`. Las dos primeras las escribe el panel con huella y
validación en reglas; `solicitudesRcv` solo la escribe el bot (reglas: el panel lee y borra).
La cuenta del bot sube de Datastore Viewer a **Datastore User**: IAM no permite limitarla a
una colección, así que el límite es el código (`guardarSolicitudRcv` es la única escritura).
Pesos colombianos fuera por ahora: el cliente solo pidió tasas de $ y Bs.

**Por qué:** un solo lugar para los datos (como el catálogo), el chat ve los cambios en < 1
min y el panel muestra las solicitudes sin otra base de datos.
