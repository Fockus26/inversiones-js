# D028 · Chatbot · `gaby on/off`, pausa por chat al escribir a mano, topes de envío · Implementado

**Título original:** Gaby se apaga con "gaby off" y se calla sola cuando escribe el dueño

**Contexto:** el dueño quiere alternar entre Gaby y atender a mano, y Gaby respondía encima
cuando él escribía. Además no había tope de mensajes (riesgo de baneo si otro bot le escribe).

**Decisión:** interruptor general persistido en SQLite (`ajustes.activa`), por comandos
`gaby on|off|estado` desde un número de `ASESOR_NUMEROS`, desde "Mensajes para mí" del
teléfono del negocio o con `scripts/gaby.sh`. Un mensaje `fromMe` que no mandó el bot (no está
en `RegistroEnvios` por id ni por texto) pausa ese chat `HORAS_PAUSA` (12 h); `gaby on` quita
todas las pausas. Apagada no marca leído. Los recordatorios de citas siguen saliendo.
Topes: `MAX_POR_CHAT_10MIN` (8) y `MAX_POR_HORA` (60) para las respuestas.
