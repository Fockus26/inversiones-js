"use client";

import {
  collection,
  deleteDoc,
  doc,
  type FirestoreError,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import { escribir } from "@/lib/firebase/escritura";
import { conTextos } from "@/lib/firebase/normalizar";
import type { COLECCION_SOLICITUDES_RCV } from "@/lib/rcv/tipos";
import {
  COLECCION_SOLICITUDES_CELULARES,
  COLECCION_SOLICITUDES_CITAS,
  ESTADOS_CITA,
  type SolicitudCelularConId,
  type SolicitudCitaConId,
} from "./tipos";

/**
 * Solicitudes del chat en el panel (D043). Las escribe el bot: si falta un campo, la lista no
 * se cae (ver lib/firebase/normalizar.ts). Las de póliza RCV se leen en lib/rcv/repositorio.ts.
 */

export type ColeccionSolicitudes =
  | typeof COLECCION_SOLICITUDES_CELULARES
  | typeof COLECCION_SOLICITUDES_CITAS
  | typeof COLECCION_SOLICITUDES_RCV;

const aFecha = (v: unknown) => (v instanceof Timestamp ? v.toDate() : null);
const textoONulo = (v: unknown) =>
  typeof v === "string" && v.trim() ? v : null;

/** Últimas `maximo` (más nuevas primero). `orderBy` de un campo: índice automático. */
function escuchar<T>(
  coleccion: ColeccionSolicitudes,
  convertir: (datos: Record<string, unknown>, id: string) => T,
  alCambiar: (solicitudes: T[]) => void,
  alFallar: (error: FirestoreError) => void,
  maximo = 200,
): () => void {
  return onSnapshot(
    query(
      collection(firestore(), coleccion),
      orderBy("creadoEn", "desc"),
      limit(maximo),
    ),
    (snap) => alCambiar(snap.docs.map((d) => convertir(d.data(), d.id))),
    alFallar,
  );
}

export function escucharSolicitudesCelulares(
  alCambiar: (solicitudes: SolicitudCelularConId[]) => void,
  alFallar: (error: FirestoreError) => void,
): () => void {
  return escuchar(
    COLECCION_SOLICITUDES_CELULARES,
    (d, id) => ({
      ...(conTextos(d, ["nombre", "whatsapp"]) as {
        nombre: string;
        whatsapp: string;
      }),
      equipo: textoONulo(d.equipo),
      id,
      creadoEn: aFecha(d.creadoEn),
    }),
    alCambiar,
    alFallar,
  );
}

export function escucharSolicitudesCitas(
  alCambiar: (solicitudes: SolicitudCitaConId[]) => void,
  alFallar: (error: FirestoreError) => void,
): () => void {
  return escuchar(
    COLECCION_SOLICITUDES_CITAS,
    (d, id) => ({
      ...(conTextos(d, ["nombre", "whatsapp"]) as {
        nombre: string;
        whatsapp: string;
      }),
      // Un estado desconocido (versión futura del bot) se muestra como "por cuadrar".
      estado: ESTADOS_CITA.find((e) => e === d.estado) ?? "error-agenda",
      horario: textoONulo(d.horario),
      direccion: textoONulo(d.direccion),
      id,
      creadoEn: aFecha(d.creadoEn),
    }),
    alCambiar,
    alFallar,
  );
}

export async function borrarSolicitud(
  coleccion: ColeccionSolicitudes,
  id: string,
): Promise<void> {
  await escribir(deleteDoc(doc(firestore(), coleccion, id)));
}
