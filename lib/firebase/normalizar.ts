/**
 * Lectura tolerante: un documento a medias (escrito por el bot, por la consola o por una
 * versión anterior) no puede tumbar la pantalla entera. Los textos que falten llegan como "",
 * y un plan de pagos que no tenga la forma esperada se descarta (quien llama decide qué hacer).
 */

import type { PlanPagos } from "@/lib/financiamiento/tipos";

type Datos = Record<string, unknown>;

/** Copia `datos` con "" en cada campo de `campos` que no sea texto. */
export function conTextos(datos: Datos, campos: readonly string[]): Datos {
  const salida = { ...datos };
  for (const c of campos) if (typeof salida[c] !== "string") salida[c] = "";
  return salida;
}

export function esPlanPagos(v: unknown): v is PlanPagos {
  if (typeof v !== "object" || v === null) return false;
  const p = v as Datos;
  return (
    typeof p.inicial === "number" &&
    typeof p.frecuencia === "string" &&
    Array.isArray(p.cuotas) &&
    p.cuotas.every(
      (c: unknown) =>
        typeof c === "object" &&
        c !== null &&
        typeof (c as Datos).vence === "string" &&
        typeof (c as Datos).monto === "number" &&
        typeof (c as Datos).pagada === "boolean",
    )
  );
}
