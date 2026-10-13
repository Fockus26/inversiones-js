import { type Fecha, sumarDias, sumarMeses } from "./fechas";
import type { Cuota, Frecuencia, PlanPagos } from "./tipos";

/** Fecha de la cuota `indice` (0 = la primera). Quincenal = cada 15 días. */
export function fechaCuota(
  primera: Fecha,
  frecuencia: Frecuencia,
  indice: number,
): Fecha {
  if (frecuencia === "mensual") return sumarMeses(primera, indice);
  return sumarDias(primera, indice * (frecuencia === "semanal" ? 7 : 15));
}

export function generarCuotas(
  monto: number,
  numero: number,
  frecuencia: Frecuencia,
  primera: Fecha,
): Cuota[] {
  return Array.from({ length: numero }, (_, i) => ({
    numero: i + 1,
    vence: fechaCuota(primera, frecuencia, i),
    monto,
    pagada: false,
    pagadaEl: null,
  }));
}

/**
 * Al editar el plan (otro monto, más cuotas, otra fecha) las cuotas se vuelven a generar, pero
 * lo ya cobrado no se pierde: cada cuota conserva el pago de la anterior con el mismo número.
 */
export function conservarPagos(nuevas: Cuota[], previas: Cuota[]): Cuota[] {
  const porNumero = new Map(previas.map((c) => [c.numero, c]));
  return nuevas.map((c) => {
    const previa = porNumero.get(c.numero);
    return previa?.pagada
      ? { ...c, pagada: true, pagadaEl: previa.pagadaEl }
      : c;
  });
}

/** Marca o desmarca una cuota como pagada (hoy). Devuelve una lista nueva. */
export function marcarCuota(
  cuotas: Cuota[],
  numero: number,
  pagada: boolean,
  hoy: Fecha,
): Cuota[] {
  return cuotas.map((c) =>
    c.numero === numero ? { ...c, pagada, pagadaEl: pagada ? hoy : null } : c,
  );
}

export type EstadoPagos = "al-dia" | "atrasado" | "pagado";

export interface ResumenPagos {
  estado: EstadoPagos;
  total: number;
  pagadas: number;
  /** Sin pagar y con fecha ya pasada. */
  vencidas: number;
  /** USD que falta cobrar (todas las cuotas sin pagar). */
  saldo: number;
  /** USD de las cuotas vencidas sin pagar. */
  saldoVencido: number;
  /** USD cobrado: inicial + cuotas pagadas. */
  cobrado: number;
  /** Primera cuota sin pagar (la más vieja), o null si ya pagó todo. */
  proxima: Cuota | null;
}

const centavos = (n: number) => Math.round(n * 100) / 100;

export function resumenPagos(plan: PlanPagos, hoy: Fecha): ResumenPagos {
  const pendientes = plan.cuotas
    .filter((c) => !c.pagada)
    .sort((a, b) => a.vence.localeCompare(b.vence) || a.numero - b.numero);
  const vencidas = pendientes.filter((c) => c.vence < hoy);
  const suma = (cs: Cuota[]) => centavos(cs.reduce((t, c) => t + c.monto, 0));
  const pagadas = plan.cuotas.filter((c) => c.pagada);
  return {
    estado:
      pendientes.length === 0
        ? "pagado"
        : vencidas.length > 0
          ? "atrasado"
          : "al-dia",
    total: plan.cuotas.length,
    pagadas: pagadas.length,
    vencidas: vencidas.length,
    saldo: suma(pendientes),
    saldoVencido: suma(vencidas),
    cobrado: centavos(plan.inicial + suma(pagadas)),
    proxima: pendientes[0] ?? null,
  };
}
