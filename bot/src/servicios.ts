import {
  etiquetaTurno,
  type Turno,
  turnosDisponibles,
} from "../../lib/horario/turnos";
import { avisarAsesores } from "./evolution";
import type { Contacto, DatosCita, Servicios } from "./flujo";
import {
  crearEvento,
  guardarSolicitudRcv,
  leerCatalogo,
  leerHorario,
  leerRcv,
  ocupados,
} from "./google";

/** `Servicios` reales del flujo: Firestore, Google Calendar y avisos por WhatsApp. */

const DIA_MS = 86_400_000;

async function turnos(): Promise<Turno[]> {
  const horario = await leerHorario();
  const ahora = new Date();
  const hasta = new Date(ahora.getTime() + (horario.diasAdelante + 1) * DIA_MS);
  return turnosDisponibles(horario, ahora, await ocupados(ahora, hasta));
}

async function agendar(
  turno: Turno,
  contacto: Contacto,
  datos: DatosCita,
): Promise<boolean> {
  const inicio = new Date(turno.inicio);
  const fin = new Date(turno.fin);
  // Volver a mirar justo antes de crear: otro cliente pudo tomar el hueco mientras tanto.
  if ((await ocupados(inicio, fin)).length > 0) return false;
  const nombre = contacto.nombre.trim() || "Cliente";
  const telefono = contacto.telefono ? `+${contacto.telefono}` : contacto.jid;
  const dentroDe24h = inicio.getTime() - Date.now() < DIA_MS;
  await crearEvento({
    inicio: turno.inicio,
    fin: turno.fin,
    titulo: `Cita agencia de loterías — ${nombre} (${telefono})`,
    descripcion: [
      `Cliente: ${nombre}`,
      `WhatsApp: ${telefono}`,
      `Dirección y contacto: ${datos.direccion}`,
      "",
      `Agendada por Gaby (bot de WhatsApp) para el ${etiquetaTurno(inicio)}.`,
    ].join("\n"),
    ubicacion: datos.direccion.slice(0, 500),
    privado: {
      origen: "gaby",
      jid: contacto.jid,
      nombre: nombre.slice(0, 100),
      // Si la cita es en menos de 24 h no tiene sentido el recordatorio "mañana".
      r24: dentroDe24h ? "1" : "0",
      r2: "0",
    },
  });
  return true;
}

export const servicios: Servicios = {
  catalogo: leerCatalogo,
  turnosDisponibles: turnos,
  agendar,
  rcv: leerRcv,
  guardarSolicitudRcv,
  avisarAsesor: avisarAsesores,
  ahora: () => new Date(),
  azar: Math.random,
};
