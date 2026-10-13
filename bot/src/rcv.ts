import {
  cotizar,
  type Precios,
  planesDe,
  textoPrecio,
} from "../../lib/rcv/cotizacion";
import type { CategoriaRcv, PlanRcvConId, TasasRcv } from "../../lib/rcv/tipos";

/**
 * Póliza RCV en el chat (D029, D030). Transportes, tasas y requisitos se editan en el panel
 * (/rcv) y el bot los lee de Firestore con `Servicios.rcv()`.
 */

/** Lo que el bot necesita de Firestore para el flujo RCV. */
export interface DatosRcvFirestore {
  planes: PlanRcvConId[];
  /** `null` si el cliente aún no guardó tasas: el chat muestra solo euros. */
  tasas: TasasRcv | null;
  /** Los mismos para todo vehículo (D034). */
  requisitos: string[];
}

/** Plan tal como se le mostró al cliente, con el precio del momento. */
export interface PlanMostrado {
  id: string;
  clase: string;
  descripcion: string;
  precios: Precios | null;
  financiamiento: boolean;
}

export const TELEFONO_RCV = "0414-7221091";

export function planesMostrados(
  datos: DatosRcvFirestore,
  categoria: CategoriaRcv,
): PlanMostrado[] {
  return planesDe(datos.planes, categoria).map((p) => ({
    id: p.id,
    clase: p.clase,
    descripcion: p.descripcion,
    precios: cotizar(p.precioEur, datos.tasas),
    financiamiento: p.financiamiento,
  }));
}

export { textoPrecio };
