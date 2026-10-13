import { diasEntre, type Fecha, sumarMeses } from "./fechas";
import type { ClienteRcv } from "./tipos";

/**
 * Vigencia de la póliza RCV (D033): dura un año desde la emisión. El bot avisa por WhatsApp
 * cuando falta un mes y, si no se renovó, otra vez cuando faltan 3 días. Renovar corre la
 * fecha de vencimiento un año, así que los avisos del vencimiento anterior ya no aplican.
 */

/** Días antes del vencimiento en que sale cada aviso. */
export const DIAS_AVISO_MES = 30;
export const DIAS_AVISO_FINAL = 3;

export function venceDe(emision: Fecha): Fecha {
  return sumarMeses(emision, 12);
}

export type EstadoPoliza =
  | { tipo: "sin-emitir" }
  | { tipo: "vigente"; dias: number }
  | { tipo: "por-vencer"; dias: number }
  | { tipo: "vencida"; dias: number };

/** `dias`: los que faltan para el vencimiento (en "vencida", los que pasaron). */
export function estadoPoliza(
  c: Pick<ClienteRcv, "emision" | "vence">,
  hoy: Fecha,
): EstadoPoliza {
  if (!c.emision || !c.vence) return { tipo: "sin-emitir" };
  const dias = diasEntre(hoy, c.vence);
  if (dias < 0) return { tipo: "vencida", dias: -dias };
  if (dias <= DIAS_AVISO_MES) return { tipo: "por-vencer", dias };
  return { tipo: "vigente", dias };
}

export type Aviso = "mes" | "final";

/**
 * Qué aviso le toca hoy, o null. El de 3 días gana al del mes (si se registró la póliza tarde
 * no se mandan los dos). Ninguno después de vencida: ahí ya la atiende el asesor.
 */
export function avisoPendiente(
  c: Pick<ClienteRcv, "emision" | "vence" | "recordatorio30" | "recordatorio3">,
  hoy: Fecha,
): Aviso | null {
  if (!c.emision || !c.vence) return null;
  const dias = diasEntre(hoy, c.vence);
  if (dias < 0) return null;
  if (dias <= DIAS_AVISO_FINAL) return c.recordatorio3 ? null : "final";
  if (dias <= DIAS_AVISO_MES) return c.recordatorio30 ? null : "mes";
  return null;
}

/**
 * Renovar: la nueva póliza arranca donde vencía la anterior (o hoy, si ya venció) y los avisos
 * vuelven a cero para el nuevo vencimiento.
 */
export function renovacion(
  c: Pick<ClienteRcv, "vence">,
  hoy: Fecha,
): Pick<ClienteRcv, "emision" | "vence" | "recordatorio30" | "recordatorio3"> {
  const emision = c.vence && c.vence >= hoy ? c.vence : hoy;
  return {
    emision,
    vence: venceDe(emision),
    recordatorio30: false,
    recordatorio3: false,
  };
}

/**
 * Número de WhatsApp (solo dígitos, con código de país) a partir de como se escribió:
 * "0414-1234567" → "584141234567". Sin código de país se asume Venezuela. null si no se entiende.
 */
export function whatsappDe(telefono: string): string | null {
  const d = telefono.replace(/\D/g, "");
  if (/^0\d{10}$/.test(d)) return `58${d.slice(1)}`;
  if (/^4\d{9}$/.test(d)) return `58${d}`;
  if (d.length >= 11 && d.length <= 15 && !d.startsWith("0")) return d;
  return null;
}
