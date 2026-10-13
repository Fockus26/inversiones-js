# Índice de decisiones

| ID | Archivo | Resumen |
|---|---|---|
| D001 | decisions/01-base.md | Paleta amarillo + tinta + verde azulado |
| D002 | decisions/01-base.md | Modelo: colección `productos`, doc por equipo |
| D003 | decisions/01-base.md | Acceso: Auth + `admins/{uid}` en reglas |
| D004 | decisions/01-base.md | SDK cliente + emuladores en desarrollo |
| D005 | decisions/01-base.md | El chatbot lee Firestore directo |
| D010 | decisions/02-auth.md | `SesionProvider` cliente en `lib/auth/`, montado en panel y login |
| D011 | decisions/02-auth.md | Guard de cliente, sin middleware; `siguiente` solo rutas internas |
| D012 | decisions/02-auth.md | Errores de login que no revelan cuentas |
| D013 | decisions/02-auth.md | Cabecera sobre tinta con foco amarillo |
| D014 | decisions/02-auth.md | Tests de reglas con bun y proyecto `demo-reglas-w1` |
| D015 | decisions/03-catalogo.md | Cantidad: autoguardado (800 ms / al salir / Enter) |
| D016 | decisions/03-catalogo.md | Lista: tarjetas en móvil, tabla desde `md` |
| D017 | decisions/03-catalogo.md | Orden en cliente; nuevos al final (`orden` máx + 1) |
| D018 | decisions/03-catalogo.md | Montos: coma o punto al escribir, `125,50$` al mostrar |
| D019 | decisions/03-catalogo.md | Foco a opacidad completa en el catálogo (local) |
| D020 | decisions/04-chatbot.md | Texto de lista de precios en el formato del cliente |
| D021 | decisions/04-chatbot.md | Agotados marcados por defecto; fecha en hora de Caracas |
| D022 | decisions/04-chatbot.md | Alta de admins por script con contraseña temporal |
| D023 | decisions/04-chatbot.md | Seed de producción que no pisa ediciones |
| D024 | decisions/04-chatbot.md | Chatbot: cuenta de solo lectura + caché 60 s |
| D025 | decisions/05-marcas.md | Marcas editables en `marcas/{nombre}`; renombrar en lote |
| D026 | decisions/05-marcas.md | Select propio (Base UI) en vez del `<select>` nativo |
| D027 | decisions/04-chatbot.md | Bot propio en `bot/`; horario en Firestore, citas en Calendar |
| D028 | decisions/04-chatbot.md | `gaby on/off`, pausa por chat al escribir a mano, topes de envío |
| D029 | decisions/04-chatbot.md | RCV por categoría; planes y solicitudes tras `Servicios` (web pendiente) |
| D030 | decisions/04-chatbot.md | Póliza RCV en Firestore editable en `/rcv`; bot con Datastore User escribe `solicitudesRcv` |
| D031 | decisions/04-chatbot.md | Tasa Bs. del BCV (DolarAPI) o manual; tasa COP manual |
| D032 | decisions/06-financiamiento.md | Clientes con financiamiento (`clientesCelulares`, `clientesRcv`), cuotas embebidas |
| D033 | decisions/06-financiamiento.md | Bot avisa vencimiento de póliza a 30 y 3 días; renovar reinicia avisos |
| D034 | decisions/06-financiamiento.md | Requisitos RCV en una lista común; placas extranjeras = cotización sin planes |
| D035 | decisions/06-financiamiento.md | Panel PWA + Web Push (VAPID) de citas nuevas |
| D036 | decisions/06-financiamiento.md | Tasas $ y COP automáticas (ExchangeRate-API, respaldo jsDelivr) o manuales |
| D037 | decisions/06-financiamiento.md | Modo demo `?demo`: clientes de ejemplo en memoria, sin tocar Firestore |
