/**
 * Solicitudes que deja la gente en el chat (D043). El bot ya no avisa por WhatsApp a los
 * asesores: guarda cada pedido aquí y el panel los muestra en /solicitudes, un tipo por
 * pestaña. Las de póliza RCV siguen en `solicitudesRcv` (lib/rcv/tipos.ts). Renombrar un campo
 * rompe al bot (ver docs/chatbot.md). Sin Firebase: lo importan el panel y `bot/`.
 *
 * - `solicitudesCelulares/{id}`: eligió un equipo de la lista (o no se le pudo mostrar).
 * - `solicitudesCitas/{id}`: cita de agencia de loterías, agendada o por cuadrar a mano.
 *
 * Solo las escribe el bot; el panel las lee y las borra.
 */

export const COLECCION_SOLICITUDES_CELULARES = "solicitudesCelulares";
export const COLECCION_SOLICITUDES_CITAS = "solicitudesCitas";

export interface SolicitudCelular {
  /** Nombre de perfil de WhatsApp (puede venir vacío). */
  nombre: string;
  /** Número de WhatsApp desde el que escribió (dígitos). */
  whatsapp: string;
  /** Equipo que eligió ("SAMSUNG A16 4/128"), o `null` si no se le pudo mostrar la lista. */
  equipo: string | null;
  creadoEn?: Date | null;
}

export interface SolicitudCelularConId extends SolicitudCelular {
  id: string;
}

/**
 * `agendada`: quedó en Google Calendar. Las otras dos hay que cuadrarlas con el cliente:
 * no había horarios libres, o la agenda no respondió (al leerla o al crear la cita).
 */
export const ESTADOS_CITA = [
  "agendada",
  "sin-horarios",
  "error-agenda",
] as const;
export type EstadoCita = (typeof ESTADOS_CITA)[number];

export const NOMBRES_ESTADO_CITA: Record<EstadoCita, string> = {
  agendada: "Agendada",
  "sin-horarios": "Sin horarios libres",
  "error-agenda": "La agenda falló",
};

export interface SolicitudCita {
  nombre: string;
  whatsapp: string;
  estado: EstadoCita;
  /** Horario elegido ("Viernes 02 3pm"), si llegó a elegirlo. */
  horario: string | null;
  /** Dirección y contacto que dejó, si llegó a escribirlos. */
  direccion: string | null;
  creadoEn?: Date | null;
}

export interface SolicitudCitaConId extends SolicitudCita {
  id: string;
}
