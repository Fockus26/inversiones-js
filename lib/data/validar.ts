import { ErrorDatos } from "./errores";

/**
 * Comprobaciones de forma en el servidor: lo que llega a una server action viene del cliente y
 * puede traer cualquier cosa. Los límites finos (longitudes, rangos) son CHECK en la BD (D044);
 * aquí va lo que un CHECK no expresa bien: tipos, claves permitidas y enteros.
 */

export function invalido(mensaje?: string): never {
  throw new ErrorDatos("invalid-argument", mensaje);
}

export const esTexto = (v: unknown): v is string => typeof v === "string";
export const esNumero = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
export const esBool = (v: unknown): v is boolean => typeof v === "boolean";

/** Solo deja pasar las claves permitidas (como `keys().hasOnly` de las reglas). */
export function soloClaves<T extends object>(
  objeto: unknown,
  permitidas: readonly string[],
): Partial<T> {
  if (typeof objeto !== "object" || objeto === null || Array.isArray(objeto))
    invalido();
  const salida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(objeto)) {
    if (!permitidas.includes(k)) invalido();
    if (v !== undefined) salida[k] = v;
  }
  return salida as Partial<T>;
}

export function exigir(condicion: boolean, mensaje?: string): void {
  if (!condicion) invalido(mensaje);
}

export function exigirId(id: unknown): string {
  exigir(esTexto(id) && id.length >= 1 && id.length <= 64);
  return id as string;
}

/** "AAAA-MM-DD" que existe en el calendario ("2026-02-31" no). */
export function esFecha(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
