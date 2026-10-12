import type { CategoriaRcv, PlanRcv, TasasRcv } from "./tipos";

/** Precio de un plan en las tres monedas. `usd`/`bs` son null si no hay tasas. */
export interface Precios {
  eur: number;
  usd: number | null;
  bs: number | null;
}

const redondear = (n: number) => Math.round(n * 100) / 100;

/** El euro es fijo; dólares y bolívares salen de las tasas del día. */
export function cotizar(
  precioEur: number | null,
  tasas: TasasRcv | null,
): Precios | null {
  if (precioEur === null) return null;
  return {
    eur: precioEur,
    usd: tasas ? redondear(precioEur * tasas.usd) : null,
    bs: tasas ? redondear(precioEur * tasas.bs) : null,
  };
}

const formato = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1234.5 → "1.234,50" */
export function numeroEs(n: number): string {
  return formato.format(n);
}

/** "15,00 € · 16,79$ · Bs. 14.686,18", o "Solicitar cotización". */
export function textoPrecio(precios: Precios | null): string {
  if (!precios) return "Solicitar cotización";
  const partes = [`${numeroEs(precios.eur)} €`];
  if (precios.usd !== null) partes.push(`${numeroEs(precios.usd)}$`);
  if (precios.bs !== null) partes.push(`Bs. ${numeroEs(precios.bs)}`);
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
