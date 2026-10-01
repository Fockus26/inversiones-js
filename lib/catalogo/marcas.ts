import { compararMarcas, type Marca } from "./tipos";

/**
 * Validación pura del nombre de una marca (sin Firebase, D025). El nombre es también el id de
 * `marcas/{nombre}`, así que el patrón es el mismo que `marcaValida` en firestore.rules:
 * mayúsculas, números, espacios y `& . + -`; empieza por letra o número; hasta 30 caracteres.
 */

export const MARCA_MAX = 30;
export const PATRON_MARCA = /^[A-Z0-9ÁÉÍÓÚÜÑ][A-Z0-9ÁÉÍÓÚÜÑ &.+-]*$/;

/** " redmi   note " → "REDMI NOTE". */
export function normalizarMarca(texto: string): string {
  return texto.trim().replace(/\s+/g, " ").toLocaleUpperCase("es");
}

export type ResultadoMarca =
  | { ok: true; valor: Marca }
  | { ok: false; error: string };

/**
 * `existentes` son las marcas ya registradas. `actual` es la que se está renombrando (puede
 * quedar igual sin chocar consigo misma).
 */
export function validarMarca(
  texto: string,
  existentes: readonly Marca[],
  actual?: Marca,
): ResultadoMarca {
  const valor = normalizarMarca(texto);
  if (valor === "")
    return { ok: false, error: "Escribe el nombre de la marca." };
  if (valor.length > MARCA_MAX)
    return { ok: false, error: `Máximo ${MARCA_MAX} caracteres.` };
  if (!PATRON_MARCA.test(valor))
    return {
      ok: false,
      error:
        "Usa letras, números, espacios o & . + - (empieza por letra o número).",
    };
  if (valor !== actual && existentes.includes(valor))
    return { ok: false, error: `Ya existe la marca ${valor}.` };
  return { ok: true, valor };
}

/** Marcas registradas + las que usan los productos (por si alguna no está registrada), ordenadas. */
export function unirMarcas(
  registradas: readonly Marca[],
  deProductos: readonly Marca[],
): Marca[] {
  return [...new Set([...registradas, ...deProductos])].sort(compararMarcas);
}
