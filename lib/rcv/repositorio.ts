"use client";

import type { ErrorDatos } from "@/lib/data/errores";
import * as acciones from "@/lib/data/rcv";
import { escribir, sondear } from "@/lib/data/sondeo";
import type {
  CamposPlanRcv,
  ConfigRcv,
  FuenteBs,
  FuenteMercado,
  PlanRcvConId,
  SolicitudRcvConId,
} from "./tipos";

/**
 * Acceso a la póliza RCV desde el panel (D030), sobre las server actions de `lib/data/rcv.ts`.
 * La huella la pone el servidor.
 */

const T_PLANES = "planes_rcv";
const T_CONFIG = "configuracion";
const T_SOLICITUDES = "solicitudes_rcv";

export function escucharPlanesRcv(
  alCambiar: (planes: PlanRcvConId[]) => void,
  alFallar: (error: ErrorDatos) => void,
): () => void {
  return sondear([T_PLANES], acciones.listarPlanesRcv, alCambiar, alFallar);
}

export function crearPlanRcv(
  campos: CamposPlanRcv,
  orden: number,
): Promise<void> {
  return escribir([T_PLANES], () => acciones.crearPlanRcv(campos, orden));
}

export function actualizarPlanRcv(
  id: string,
  cambios: Partial<CamposPlanRcv & { orden: number }>,
): Promise<void> {
  return escribir([T_PLANES], () => acciones.actualizarPlanRcv(id, cambios));
}

export function borrarPlanRcv(id: string): Promise<void> {
  return escribir([T_PLANES], () => acciones.borrarPlanRcv(id));
}

/** `configuracion/rcv`; `null` si todavía no existe. */
export function escucharConfigRcv(
  alCambiar: (config: ConfigRcv | null) => void,
  alFallar: (error: ErrorDatos) => void,
): () => void {
  return sondear([T_CONFIG], acciones.leerConfigRcv, alCambiar, alFallar);
}

/**
 * Cada tasa es la manual o, con fuente automática, la consultada en ese momento (queda de
 * respaldo para el bot). Si es `null` (API sin respuesta) no se toca la guardada.
 */
export function guardarTasas(tasas: {
  usd: number | null;
  bs: number | null;
  cop: number | null;
  fuenteBs: FuenteBs;
  fuenteUsd: FuenteMercado;
  fuenteCop: FuenteMercado;
}): Promise<void> {
  return escribir([T_CONFIG], () => acciones.guardarTasas(tasas));
}

/**
 * Con fuentes automáticas, actualiza los respaldos (`tasaBs`, `tasaUsd`, `tasaCop`) cuando la
 * API publica otro valor: así el bot cotiza con el más reciente aunque la API se caiga.
 */
export function guardarRespaldos(
  respaldos: Partial<Record<"tasaBs" | "tasaUsd" | "tasaCop", number>>,
): Promise<void> {
  return escribir([T_CONFIG], () => acciones.guardarRespaldos(respaldos));
}

/** Una lista para todos los vehículos (D034); borra la de por categoría de antes. */
export function guardarRequisitos(requisitos: string[]): Promise<void> {
  return escribir([T_CONFIG], () => acciones.guardarRequisitos(requisitos));
}

/** Últimas solicitudes (más nuevas primero). */
export function escucharSolicitudesRcv(
  alCambiar: (solicitudes: SolicitudRcvConId[]) => void,
  alFallar: (error: ErrorDatos) => void,
): () => void {
  return sondear(
    [T_SOLICITUDES],
    acciones.listarSolicitudesRcv,
    alCambiar,
    alFallar,
    15_000,
  );
}
