import type { CategoriaRcv, PlanRcv, TasasRcv } from "./tipos";

/** Precio de un plan en las cuatro monedas. `usd`/`bs`/`cop` son null si no hay tasa. */
export interface Precios {
  eur: number;
  usd: number | null;
  bs: number | null;
  /** Puede faltar en solicitudes guardadas antes de que existiera la tasa de pesos. */
  cop?: number | null;
}

const redondear = (n: number) => Math.round(n * 100) / 100;

/** El euro es fijo; dólares, bolívares y pesos salen de las tasas del día. Pesos sin céntimos. */
export function cotizar(
  precioEur: number | null,
  tasas: TasasRcv | null,
): Precios | null {
  if (precioEur === null) return null;
  return {
    eur: precioEur,
    usd: tasas ? redondear(precioEur * tasas.usd) : null,
    bs: tasas ? redondear(precioEur * tasas.bs) : null,
    cop: tasas?.cop ? Math.round(precioEur * tasas.cop) : null,
  };
}

const formato = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatoEntero = new Intl.NumberFormat("es-VE", {
  maximumFractionDigits: 0,
});

/** 1234.5 → "1.234,50" */
export function numeroEs(n: number): string {
  return formato.format(n);
}

/** 62450 → "62.450 COP" */
export function textoCop(n: number): string {
  return `${formatoEntero.format(n)} COP`;
}

/** "15,00 € · 16,79$ · Bs. 14.686,18 · 62.450 COP", o "Solicitar cotización". */
export function textoPrecio(precios: Precios | null): string {
  if (!precios) return "Solicitar cotización";
  const partes = [`${numeroEs(precios.eur)} €`];
  if (precios.usd !== null) partes.push(`${numeroEs(precios.usd)}$`);
  if (precios.bs !== null) partes.push(`Bs. ${numeroEs(precios.bs)}`);
  if (precios.cop != null) partes.push(textoCop(precios.cop));
  return partes.join(" · ");
}

/** Planes activos de una categoría, por `orden`. */
export function planesDe<T extends PlanRcv>(
  planes: readonly T[],
  categoria: CategoriaRcv,
): T[] {
  return planes
    .filter((p) => p.activo && p.categorias.includes(categoria))
    .sort((a, b) => a.orden - b.orden);
}
