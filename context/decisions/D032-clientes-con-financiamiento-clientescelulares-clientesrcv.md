# D032 · Financiamiento · Clientes con financiamiento (`clientesCelulares`, `clientesRcv`), cuotas embebidas · Implementado

**Título original:** Clientes con financiamiento en `clientesCelulares` y `clientesRcv`

**Contexto:** el cliente quiere registrar a quién le vendió a crédito (celulares y pólizas RCV)
y marcar qué cuotas pagó cada uno. Es distinto de la agenda (citas en Google Calendar).

**Decisión:** dos colecciones, un documento por cliente con su plan de pagos embebido
(`pagos.cuotas`, a lo sumo 60). Las cuotas se generan desde la primera fecha y la frecuencia
(semanal = 7 días, quincenal = 15 días, mensual = mismo día del mes); al editar el plan se
regeneran conservando las ya pagadas por número. Fechas como `"AAAA-MM-DD"` del día de Caracas
(sin hora: no se corren por el huso y se comparan como texto). Página `/clientes` con pestañas
Celulares / Póliza RCV; las solicitudes del chat tienen «Registrar cliente» que rellena la ficha.
Reglas: solo admins, huella, límites de tamaño (las reglas no recorren listas).

**Por qué:** un cliente se lee y se escribe entero en una operación, el panel ya escucha en vivo
y no hace falta consultar subcolecciones para pintar la lista.
