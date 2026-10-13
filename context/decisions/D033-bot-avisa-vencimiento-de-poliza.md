# D033 · Financiamiento · Bot avisa vencimiento de póliza a 30 y 3 días; renovar reinicia avisos · Implementado

**Título original:** Recordatorios de vencimiento de la póliza RCV desde el bot

**Contexto:** la póliza dura un año; el cliente quiere que se le escriba al cliente cuando falte
un mes y otra vez a los 3 días si no la renovó.

**Decisión:** `clientesRcv` guarda `emision`, `vence` (= emisión + 1 año), `recordatorio30` y
`recordatorio3`. El bot revisa cada hora (9:00–19:00 de Caracas), toma los que vencen en ≤ 30
días y manda el aviso que toque (`avisoPendiente` en `lib/financiamiento/poliza.ts`), marcando
antes en una transacción que verifica que `vence` no cambió. «Renovar» en el panel mueve las
fechas un año y reinicia los avisos, así que el de 3 días no sale si ya renovó. Vencida, el bot
ya no avisa. La cuenta del bot (Datastore User, D030) escribe esos dos campos.

**Por qué:** mismo patrón que los recordatorios de citas (marcar y luego enviar: mejor perder
un aviso que duplicarlo) y sin depender de Cloud Functions ni de un cron externo.
