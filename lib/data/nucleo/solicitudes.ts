import { desc, eq } from "drizzle-orm";
import {
  solicitudesCelulares,
  solicitudesCitas,
  solicitudesRcv,
} from "@/lib/db/schema";
import type { Db } from "@/lib/db/tipos";
import { COLECCION_SOLICITUDES_RCV } from "@/lib/rcv/tipos";
import {
  COLECCION_SOLICITUDES_CELULARES,
  COLECCION_SOLICITUDES_CITAS,
  ESTADOS_CITA,
  type SolicitudCelularConId,
  type SolicitudCitaConId,
} from "@/lib/solicitudes/tipos";
import { exigir, exigirId } from "../validar";

/** Solicitudes del chat (D043): las escribe el bot; el panel solo lista y borra. */

export type ColeccionSolicitudes =
  | typeof COLECCION_SOLICITUDES_CELULARES
  | typeof COLECCION_SOLICITUDES_CITAS
  | typeof COLECCION_SOLICITUDES_RCV;

const TABLAS = {
  [COLECCION_SOLICITUDES_CELULARES]: solicitudesCelulares,
  [COLECCION_SOLICITUDES_CITAS]: solicitudesCitas,
  [COLECCION_SOLICITUDES_RCV]: solicitudesRcv,
} as const;

const textoONulo = (v: unknown) =>
  typeof v === "string" && v.trim() ? v : null;

export async function listarSolicitudesCelulares(
  db: Db,
  maximo = 200,
): Promise<SolicitudCelularConId[]> {
  const filas = await db
    .select()
    .from(solicitudesCelulares)
    .orderBy(desc(solicitudesCelulares.creadoEn))
    .limit(maximo);
  return filas.map((f) => ({ ...f, equipo: textoONulo(f.equipo) }));
}

export async function listarSolicitudesCitas(
  db: Db,
  maximo = 200,
): Promise<SolicitudCitaConId[]> {
  const filas = await db
    .select()
    .from(solicitudesCitas)
    .orderBy(desc(solicitudesCitas.creadoEn))
    .limit(maximo);
  return filas.map((f) => ({
    ...f,
    // Un estado desconocido (versión futura del bot) se muestra como "por cuadrar".
    estado: ESTADOS_CITA.find((e) => e === f.estado) ?? "error-agenda",
    horario: textoONulo(f.horario),
    direccion: textoONulo(f.direccion),
  }));
}

export async function borrarSolicitud(
  db: Db,
  coleccion: unknown,
  id: unknown,
): Promise<void> {
  // `Object.hasOwn`: con `in`, "toString" o "__proto__" pasaban y acababan en error inesperado.
  exigir(typeof coleccion === "string" && Object.hasOwn(TABLAS, coleccion));
  const t = TABLAS[coleccion as ColeccionSolicitudes];
  await db.delete(t).where(eq(t.id, exigirId(id)));
}
