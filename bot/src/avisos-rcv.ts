import {
  diasEntre,
  type Fecha,
  fechaLarga,
} from "../../lib/financiamiento/fechas";
import type { Aviso } from "../../lib/financiamiento/poliza";
import type { ClienteRcv } from "../../lib/financiamiento/tipos";
import * as T from "./textos";

/**
 * Texto del recordatorio de vencimiento de la póliza RCV (D033). Puro, para los tests; el envío
 * está en `vencimientos.ts`.
 */

/** " María" si el primer nombre es un nombre normal; "" si no. */
function saludo(nombre: string): string {
  const primero = nombre.trim().split(/\s+/)[0] ?? "";
  return /^[\p{L}]{2,20}$/u.test(primero) ? ` ${primero}` : "";
}

function cuando(dias: number): string {
  if (dias <= 0) return "hoy";
  if (dias === 1) return "mañana";
  return `en ${dias} días`;
}

export function textoAvisoVencimiento(
  c: Pick<ClienteRcv, "nombre" | "placa" | "vence">,
  aviso: Aviso,
  hoy: Fecha,
  azar: () => number = Math.random,
): string {
  const vence = c.vence ?? hoy;
  const dias = Math.max(0, diasEntre(hoy, vence));
  const valores = {
    nombre: saludo(c.nombre),
    vehiculo: c.placa ? ` del vehículo placa *${c.placa}*` : "",
    fecha: fechaLarga(vence),
    dias: String(dias),
    cuando: cuando(dias),
  };
  return T.elegir(
    aviso === "mes" ? T.RCV_VENCE_MES : T.RCV_VENCE_PRONTO,
    valores,
    azar,
  );
}
