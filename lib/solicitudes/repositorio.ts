"use client";

import type { ErrorDatos } from "@/lib/data/errores";
import type { ColeccionSolicitudes } from "@/lib/data/nucleo/solicitudes";
import * as acciones from "@/lib/data/solicitudes";
import { escribir, sondear } from "@/lib/data/sondeo";
import type { SolicitudCelularConId, SolicitudCitaConId } from "./tipos";

/**
 * Solicitudes del chat en el panel (D043), sobre `lib/data/solicitudes.ts`. Las escribe el bot;
 * el aviso push llega al instante y esta lista se refresca cada 15 s. Las de póliza RCV se leen
 * en lib/rcv/repositorio.ts.
 */
export type { ColeccionSolicitudes };

const SONDEO_MS = 15_000;

export function escucharSolicitudesCelulares(
  alCambiar: (solicitudes: SolicitudCelularConId[]) => void,
  alFallar: (error: ErrorDatos) => void,
): () => void {
  return sondear(
    ["solicitudes_celulares"],
    acciones.listarSolicitudesCelulares,
    alCambiar,
    alFallar,
    SONDEO_MS,
  );
}

export function escucharSolicitudesCitas(
  alCambiar: (solicitudes: SolicitudCitaConId[]) => void,
  alFallar: (error: ErrorDatos) => void,
): () => void {
  return sondear(
    ["solicitudes_citas"],
    acciones.listarSolicitudesCitas,
    alCambiar,
    alFallar,
    SONDEO_MS,
  );
}

const TABLA: Record<ColeccionSolicitudes, string> = {
  solicitudesCelulares: "solicitudes_celulares",
  solicitudesCitas: "solicitudes_citas",
  solicitudesRcv: "solicitudes_rcv",
};

export function borrarSolicitud(
  coleccion: ColeccionSolicitudes,
  id: string,
): Promise<void> {
  return escribir([TABLA[coleccion]], () =>
    acciones.borrarSolicitud(coleccion, id),
  );
}
