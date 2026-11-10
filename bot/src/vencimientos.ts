import { hoyCaracas, sumarDias } from "../../lib/financiamiento/fechas";
import {
  avisoPendiente,
  DIAS_AVISO_MES,
  whatsappDe,
} from "../../lib/financiamiento/poliza";
import { notificarPanel } from "./avisos-push";
import { textoAvisoVencimiento } from "./avisos-rcv";
import { clientesRcvPorVencer, marcarAvisoRcv } from "./db";
import { enviarTexto } from "./evolution";

/**
 * Recordatorios de vencimiento de la póliza RCV (D033). Cada hora mira en la base los
 * clientes cuya póliza vence en los próximos 30 días y le escribe a quien le toque el aviso
 * del mes o el de 3 días. Solo entre 9:00 y 19:00 (hora de Caracas). Como los recordatorios
 * de citas, sale aunque Gaby esté apagada: es un aviso que el dueño ya dejó programado.
 */

const INTERVALO_MS = 60 * 60_000;
const HORA_INICIO = 9;
const HORA_FIN = 19;

const horaEnCaracas = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Caracas",
  hour: "numeric",
  hourCycle: "h23",
});

export async function revisarVencimientos(ahora = new Date()): Promise<void> {
  const hora = Number(horaEnCaracas.format(ahora));
  if (hora < HORA_INICIO || hora >= HORA_FIN) return;
  const hoy = hoyCaracas(ahora);
  const clientes = await clientesRcvPorVencer(
    hoy,
    sumarDias(hoy, DIAS_AVISO_MES),
  );
  for (const c of clientes) {
    const aviso = avisoPendiente(c, hoy);
    if (!aviso || !c.vence) continue;
    const numero = whatsappDe(c.telefono);
    if (!numero) {
      console.warn(`Póliza de ${c.nombre}: teléfono "${c.telefono}" no válido`);
      continue;
    }
    try {
      // Marcar primero (como en las citas): mejor perder un aviso que mandarlo dos veces.
      const campo = aviso === "final" ? "recordatorio3" : "recordatorio30";
      if (!(await marcarAvisoRcv(c.id, c.vence, campo))) continue;
      await enviarTexto(
        `${numero}@s.whatsapp.net`,
        textoAvisoVencimiento(c, aviso, hoy),
      );
      console.log(`Aviso de vencimiento (${aviso}) enviado a ${c.nombre}`);
      // Aviso push al panel, no por WhatsApp a los asesores (D043).
      void notificarPanel({
        titulo: "🔔 Recordatorio de póliza enviado",
        cuerpo: `${c.nombre}${c.placa ? ` (${c.placa})` : ""} · vence el ${c.vence.split("-").reverse().join("/")}`,
        url: "/clientes/rcv",
        etiqueta: `vence-${c.id}`,
      });
      await Bun.sleep(5_000 + Math.random() * 10_000);
    } catch (e) {
      console.error("Falló un aviso de vencimiento", c.id, e);
    }
  }
}

export function iniciarVencimientos(): void {
  const correr = () =>
    revisarVencimientos().catch((e) =>
      console.error("Revisión de vencimientos falló", e),
    );
  setTimeout(correr, 60_000);
  setInterval(correr, INTERVALO_MS);
}
