import {
  etiquetaTurno,
  type Turno,
  turnosDisponibles,
} from "../../lib/horario/turnos";
import { NOMBRES_CATEGORIA, type SolicitudRcv } from "../../lib/rcv/tipos";
import {
  NOMBRES_ESTADO_CITA,
  type SolicitudCelular,
  type SolicitudCita,
} from "../../lib/solicitudes/tipos";
import { notificarPanel } from "./avisos-push";
import type { Contacto, DatosCita, Servicios } from "./flujo";
import * as google from "./google";
import {
  crearEvento,
  leerCatalogo,
  leerHorario,
  leerRcv,
  ocupados,
} from "./google";

/**
 * `Servicios` reales del flujo: Firestore, Google Calendar y avisos push al panel. Nada sale
 * por WhatsApp hacia los asesores (D043): cada solicitud se guarda y avisa al panel instalado.
 */

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
  const evento = await crearEvento({
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
  // Aviso push a los teléfonos del panel (D035). Sin await: la respuesta al cliente no espera.
  void notificarPanel({
    titulo: "📅 Nueva cita agendada",
    cuerpo: `${nombre} · ${etiquetaTurno(inicio)}`,
    url: evento.enlace ?? "/",
    etiqueta: `cita-${evento.id}`,
  });
  return true;
}

const quien = (nombre: string, whatsapp: string) =>
  nombre || (whatsapp ? `+${whatsapp}` : "Cliente");

async function guardarSolicitudRcv(s: SolicitudRcv): Promise<void> {
  await google.guardarSolicitudRcv(s);
  void notificarPanel({
    titulo: "🚗 Nueva solicitud de póliza RCV",
    cuerpo: `${quien(s.nombre, s.whatsapp)} · ${s.vehiculo ?? NOMBRES_CATEGORIA[s.categoria]}`,
    url: "/solicitudes/rcv",
  });
}

async function guardarSolicitudCelular(s: SolicitudCelular): Promise<void> {
  await google.guardarSolicitudCelular(s);
  void notificarPanel({
    titulo: "📱 Nueva solicitud de celular",
    cuerpo: `${quien(s.nombre, s.whatsapp)} · ${s.equipo ?? "no pudo ver la lista"}`,
    url: "/solicitudes/celulares",
  });
}

async function guardarSolicitudCita(s: SolicitudCita): Promise<void> {
  await google.guardarSolicitudCita(s);
  // La cita agendada ya avisó al crear el evento (arriba): solo las que hay que cuadrar a mano.
  if (s.estado === "agendada") return;
  void notificarPanel({
    titulo: "📅 Cita por cuadrar",
    cuerpo: `${quien(s.nombre, s.whatsapp)} · ${NOMBRES_ESTADO_CITA[s.estado]}`,
    url: "/solicitudes/citas",
  });
}

export const servicios: Servicios = {
  catalogo: leerCatalogo,
  turnosDisponibles: turnos,
  agendar,
  rcv: leerRcv,
  guardarSolicitudRcv,
  guardarSolicitudCelular,
  guardarSolicitudCita,
  ahora: () => new Date(),
  azar: Math.random,
};
