import { normalizarMarca } from "./marcas";
import type { CamposEditables, Marca } from "./tipos";

/**
 * Validación pura del formulario de producto (sin Firebase). Los límites son los mismos que
 * `productoValido` en firestore.rules: si algo pasa aquí, la regla lo acepta.
 */

export const LIMITES = {
  nombreMax: 80,
  varianteMax: 20,
  montoMax: 100_000,
  cuotasMin: 1,
  cuotasMax: 48,
  cantidadMax: 100_000,
} as const;

/** Lo que escribe la persona: todo texto salvo marca y activo. */
export interface FormularioProducto {
  marca: string;
  nombre: string;
  variante: string;
  inicial: string;
  cuota: string;
  numeroCuotas: string;
  cantidad: string;
  activo: boolean;
}

export type CampoFormulario = keyof FormularioProducto;
export type ErroresFormulario = Partial<Record<CampoFormulario, string>>;

export type ResultadoValidacion =
  | { ok: true; valor: CamposEditables; avisos: ErroresFormulario }
  | { ok: false; errores: ErroresFormulario; avisos: ErroresFormulario };

/**
 * "125", "125,50", "125.5", "125$", " 63 ", "$ 63" → número. Hasta 2 decimales.
 * Rechaza separadores de miles ("1.250,00") para no adivinar: devuelve null.
 */
export function parsearMonto(texto: string): number | null {
  // El "$" solo se acepta al principio o al final ("125$", "$125"), nunca en medio.
  const m = /^\$?(\d+(?:[.,]\d{1,2})?)\$?$/.exec(texto.replace(/\s+/g, ""));
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** "3", " 12 " → entero. "3.5", "-1", "3a" → null. */
export function parsearEntero(texto: string): number | null {
  const limpio = texto.trim();
  if (!/^\d+$/.test(limpio)) return null;
  return Math.trunc(Number(limpio));
}

/** RAM/almacenamiento: "8/256". Solo sugerido; la regla no lo exige. */
export function varianteConFormatoSugerido(variante: string): boolean {
  return /^\d+\/\d+$/.test(variante.trim());
}

export function esMarca(valor: string, marcas: readonly Marca[]): boolean {
  return marcas.includes(valor);
}

function validarMonto(
  texto: string,
  etiqueta: string,
): { valor: number } | { error: string } {
  if (texto.trim() === "") return { error: `Escribe ${etiqueta}.` };
  const n = parsearMonto(texto);
  if (n === null) return { error: "Usa solo números, p. ej. 125 o 125,50." };
  if (n > LIMITES.montoMax)
    return { error: `No puede pasar de ${LIMITES.montoMax}$.` };
  return { valor: n };
}

function validarEntero(
  texto: string,
  min: number,
  max: number,
  vacio: string,
): { valor: number } | { error: string } {
  if (texto.trim() === "") return { error: vacio };
  const n = parsearEntero(texto);
  if (n === null) {
    const t = texto.trim();
    if (/^-\s*\d/.test(t)) return { error: `Debe ser ${min} o más.` };
    if (/^\d+[.,]\d+$/.test(t))
      return { error: "Usa un número entero, sin decimales." };
    return { error: "Usa solo números enteros, p. ej. 6." };
  }
  if (n < min) return { error: `Debe ser ${min} o más.` };
  if (n > max) return { error: `No puede pasar de ${max}.` };
  return { valor: n };
}

/** `marcas`: las registradas en `marcas` (D025); la del producto debe ser una de ellas. */
export function validarProducto(
  f: FormularioProducto,
  marcas: readonly Marca[],
): ResultadoValidacion {
  const errores: ErroresFormulario = {};
  const avisos: ErroresFormulario = {};

  const marca = normalizarMarca(f.marca);
  const marcaValida = esMarca(marca, marcas);
  if (!marcaValida) errores.marca = "Elige una marca de la lista.";

  const nombre = f.nombre.trim().replace(/\s+/g, " ");
  if (nombre.length === 0) errores.nombre = "Escribe el nombre del equipo.";
  else if (nombre.length > LIMITES.nombreMax)
    errores.nombre = `Máximo ${LIMITES.nombreMax} caracteres.`;

  const variante = f.variante.trim().replace(/\s+/g, "");
  if (variante.length > LIMITES.varianteMax)
    errores.variante = `Máximo ${LIMITES.varianteMax} caracteres.`;
  else if (variante !== "" && !varianteConFormatoSugerido(variante))
    avisos.variante = "Formato sugerido: RAM/almacenamiento, p. ej. 8/256.";

  const inicial = validarMonto(f.inicial, "la inicial");
  if ("error" in inicial) errores.inicial = inicial.error;
  const cuota = validarMonto(f.cuota, "la cuota");
  if ("error" in cuota) errores.cuota = cuota.error;

  const numeroCuotas = validarEntero(
    f.numeroCuotas,
    LIMITES.cuotasMin,
    LIMITES.cuotasMax,
    "Escribe el número de cuotas.",
  );
  if ("error" in numeroCuotas) errores.numeroCuotas = numeroCuotas.error;

  const cantidad = validarEntero(
    f.cantidad,
    0,
    LIMITES.cantidadMax,
    "Escribe la cantidad (0 si está agotado).",
  );
  if ("error" in cantidad) errores.cantidad = cantidad.error;

  if (
    Object.keys(errores).length > 0 ||
    "error" in inicial ||
    "error" in cuota ||
    "error" in numeroCuotas ||
    "error" in cantidad ||
    !marcaValida
  ) {
    return { ok: false, errores, avisos };
  }

  return {
    ok: true,
    avisos,
    valor: {
      marca,
      nombre,
      variante,
      inicial: inicial.valor,
      cuota: cuota.valor,
      numeroCuotas: numeroCuotas.valor,
      cantidad: cantidad.valor,
      activo: f.activo,
    },
  };
}

/** Cantidad de la edición rápida: entero 0..máximo, o null si no es válida. */
export function validarCantidad(texto: string): number | null {
  const n = parsearEntero(texto);
  if (n === null || n > LIMITES.cantidadMax) return null;
  return n;
}
