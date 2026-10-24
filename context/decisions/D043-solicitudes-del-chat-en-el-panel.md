# D043 · Bot · Gaby no escribe a los asesores: cada flujo deja una solicitud en /solicitudes · Implementado

**Decisión:** el bot ya no manda mensajes de WhatsApp a `ASESOR_NUMEROS` (cita agendada o por
cuadrar, equipo elegido, póliza RCV, planes o lista que no cargaron, recordatorio de vencimiento
enviado). Cada flujo guarda una solicitud en Firestore (`solicitudesCelulares`,
`solicitudesCitas`, `solicitudesRcv`) y avisa por push al panel instalado (D035). El panel suma
la pestaña **Solicitudes** con una subpestaña por tipo (Celulares, Póliza RCV, Citas); las de
RCV salen de `/rcv`. `ASESOR_NUMEROS` queda solo para `gaby on`/`gaby off`.
**Por qué:** César (2026-10-23): mensajes salientes del número del negocio a los teléfonos de
los admin suben el riesgo de baneo de WhatsApp.
**Alternativa descartada:** una sola colección `solicitudes` con campo `tipo`: filtrar por tipo y
ordenar por fecha exige índice compuesto; una colección por tipo sigue el patrón de
`clientesCelulares`/`clientesRcv` (D032) y deja `solicitudesRcv` como estaba (contrato con el bot).
**Consecuencia:** si guardar falla, la solicitud solo queda en el log del bot (antes el
WhatsApp al asesor hacía de respaldo). Sin la campana activada en un teléfono, nadie se entera
hasta abrir el panel.
