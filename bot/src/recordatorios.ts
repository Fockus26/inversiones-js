import { etiquetaTurno, horaCorta } from "../../lib/horario/turnos";
import { enviarTexto } from "./evolution";
import { citasEntre, marcarEvento } from "./google";
import * as T from "./textos";

/**
 * Recordatorios por WhatsApp de las citas que agendó Gaby: uno ~24 h antes y otro ~2 h antes.
 * Lee del calendario cada 10 minutos; lo enviado queda marcado en el propio evento
 * (`r24`/`r2`), así no se duplica aunque el bot se reinicie. Si el dueño mueve la cita en
 * Google Calendar, el recordatorio usa la hora nueva; si la borra, no se envía.
 */

const HORA_MS = 3_600_000;
const INTERVALO_MS = 10 * 60_000;

function nombreDe(privado: Record<string, string>): Record<string, string> {
  const primero = (privado.nombre ?? "").trim().split(/\s+/)[0] ?? "";
  return {
    nombre:
      /^[\p{L}]{2,20}$/u.test(primero) && primero !== "Cliente"
        ? ` ${primero}`
        : "",
  };
}

export async function revisarRecordatorios(): Promise<void> {
  const ahora = Date.now();
  const citas = await citasEntre(
    new Date(ahora),
    new Date(ahora + 25 * HORA_MS),
  );
  for (const cita of citas) {
    const privado = { ...(cita.extendedProperties?.private ?? {}) };
    if (!cita.start.dateTime || !privado.jid) continue;
    const inicio = new Date(cita.start.dateTime);
    const horas = (inicio.getTime() - ahora) / HORA_MS;
    let texto: string | null = null;
    if (horas <= 2.1 && privado.r2 !== "1") {
      texto = T.elegir(T.RECORDATORIO_2H, {
        ...nombreDe(privado),
        hora: horaCorta(inicio),
      });
      privado.r2 = "1";
      privado.r24 = "1";
    } else if (horas <= 24 && horas > 2.5 && privado.r24 !== "1") {
      texto = T.elegir(T.RECORDATORIO_24H, {
        ...nombreDe(privado),
        turno: etiquetaTurno(inicio),
      });
      privado.r24 = "1";
    }
    if (!texto) continue;
    try {
      // Marcar primero: preferimos perder un recordatorio a mandarlo dos veces.
      await marcarEvento(cita.id, privado);
      await enviarTexto(privado.jid, texto);
      console.log(`Recordatorio enviado (${cita.summary ?? cita.id})`);
      // Espaciar envíos: nunca en ráfaga.
      await Bun.sleep(5_000 + Math.random() * 10_000);
    } catch (e) {
      console.error("Fallo un recordatorio", cita.id, e);
    }
  }
}

export function iniciarRecordatorios(): void {
  const correr = () =>
    revisarRecordatorios().catch((e) =>
      console.error("Revisión de recordatorios falló", e),
    );
  setTimeout(correr, 30_000);
  setInterval(correr, INTERVALO_MS);
}
