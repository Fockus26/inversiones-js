import { parsearMonto } from "@/lib/catalogo/validacion";
import {
  CATEGORIAS_RCV,
  type CamposPlanRcv,
  type CategoriaRcv,
  type FuenteBs,
  type RequisitosRcv,
} from "./tipos";

/**
 * Validación pura de los formularios de /rcv. Los límites son los mismos que `planRcvValido`
 * y `configRcvValida` en firestore.rules.
 */

export const LIMITES_RCV = {
  claseMax: 40,
  descripcionMax: 120,
  precioMax: 100_000,
  tasaUsdMax: 1_000,
  tasaBsMax: 1_000_000_000,
  tasaCopMax: 1_000_000,
  requisitosMax: 20,
  requisitoMax: 200,
} as const;

export interface FormularioPlanRcv {
  clase: string;
  descripcion: string;
  /** Vacío = sin precio fijo (solicitar cotización). */
  precioEur: string;
  categorias: CategoriaRcv[];
  financiamiento: boolean;
  activo: boolean;
}

export type CampoPlanRcv = keyof FormularioPlanRcv;
export type ErroresPlanRcv = Partial<Record<CampoPlanRcv, string>>;

export type ResultadoPlanRcv =
  | { ok: true; valor: CamposPlanRcv }
  | { ok: false; errores: ErroresPlanRcv };

/** Mayúsculas y espacios simples, como escribe el cliente la tabla. */
function limpiar(texto: string): string {
  return texto.trim().replace(/\s+/g, " ").toLocaleUpperCase("es");
}

export function validarPlanRcv(f: FormularioPlanRcv): ResultadoPlanRcv {
  const errores: ErroresPlanRcv = {};

  const clase = limpiar(f.clase);
  if (!clase) errores.clase = "Escribe la clase de vehículo, p. ej. MOTO.";
  else if (clase.length > LIMITES_RCV.claseMax)
    errores.clase = `Máximo ${LIMITES_RCV.claseMax} caracteres.`;

  const descripcion = limpiar(f.descripcion);
  if (!descripcion) errores.descripcion = "Escribe la descripción del plan.";
  else if (descripcion.length > LIMITES_RCV.descripcionMax)
    errores.descripcion = `Máximo ${LIMITES_RCV.descripcionMax} caracteres.`;

  let precioEur: number | null = null;
  if (f.precioEur.trim() !== "") {
    precioEur = parsearMonto(f.precioEur.replace(/€/g, ""));
    if (precioEur === null)
      errores.precioEur = "Usa solo números, p. ej. 15 o 15,50.";
    else if (precioEur > LIMITES_RCV.precioMax)
      errores.precioEur = `No puede pasar de ${LIMITES_RCV.precioMax} €.`;
  }

  const categorias = CATEGORIAS_RCV.filter((c) => f.categorias.includes(c));
  if (categorias.length === 0)
    errores.categorias = "Elige al menos un tipo de transporte.";

  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return {
    ok: true,
    valor: {
      clase,
      descripcion,
      precioEur,
      categorias,
      // Solo el transporte público pregunta por financiamiento.
      financiamiento: f.financiamiento && categorias.includes("publico"),
      activo: f.activo,
    },
  };
}

/** Lo que se escribe en el formulario de tasas. */
export interface TextosTasas {
  usd: string;
  bs: string;
  cop: string;
}

export interface TasasValidadas {
  usd: number;
  /** `null` con la tasa del BCV: no se escribe a mano. */
  bs: number | null;
  cop: number;
}

export type ResultadoTasas =
  | { ok: true; valor: TasasValidadas }
  | { ok: false; errores: Partial<Record<keyof TextosTasas, string>> };

/** Acepta "1,1193", "979,08" o "979.08"; rechaza separadores de miles para no adivinar. */
export function parsearTasa(texto: string): number | null {
  const m = /^(\d+)(?:[.,](\d{1,6}))?$/.exec(texto.replace(/\s+/g, ""));
  if (!m) return null;
  const n = Number(`${m[1]}.${m[2] ?? "0"}`);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Dólares y pesos siempre a mano; bolívares solo si `fuenteBs` es "manual". */
export function validarTasas(
  textos: TextosTasas,
  fuenteBs: FuenteBs,
): ResultadoTasas {
  const errores: Partial<Record<keyof TextosTasas, string>> = {};
  const u = parsearTasa(textos.usd);
  if (u === null)
    errores.usd = "Escribe cuántos dólares vale 1 €, p. ej. 1,12.";
  else if (u > LIMITES_RCV.tasaUsdMax)
    errores.usd = "Revisa la tasa: es muy alta.";
  let b: number | null = null;
  if (fuenteBs === "manual") {
    b = parsearTasa(textos.bs);
    if (b === null)
      errores.bs =
        "Escribe cuántos bolívares vale 1 €, sin puntos de miles, p. ej. 979,08.";
    else if (b > LIMITES_RCV.tasaBsMax)
      errores.bs = "Revisa la tasa: es muy alta.";
  }
  const c = parsearTasa(textos.cop);
  if (c === null)
    errores.cop =
      "Escribe cuántos pesos vale 1 €, sin puntos de miles, p. ej. 4350.";
  else if (c > LIMITES_RCV.tasaCopMax)
    errores.cop = "Revisa la tasa: es muy alta.";
  if (u === null || c === null || Object.keys(errores).length > 0)
    return { ok: false, errores };
  return { ok: true, valor: { usd: u, bs: b, cop: c } };
}

export type ResultadoRequisitos =
  | { ok: true; valor: RequisitosRcv }
  | { ok: false; errores: Partial<Record<CategoriaRcv, string>> };

/** Un requisito por línea; se quitan viñetas y líneas vacías. */
export function lineasDeRequisitos(texto: string): string[] {
  return texto
    .split("\n")
    .map((l) =>
      l
        .replace(/^\s*[-•*·]\s*/, "")
        .trim()
        .replace(/\s+/g, " "),
    )
    .filter(Boolean);
}

export function validarRequisitos(
  textos: Record<CategoriaRcv, string>,
): ResultadoRequisitos {
  const errores: Partial<Record<CategoriaRcv, string>> = {};
  const valor = {} as RequisitosRcv;
  for (const c of CATEGORIAS_RCV) {
    const lineas = lineasDeRequisitos(textos[c]);
    if (lineas.length === 0) errores[c] = "Escribe al menos un requisito.";
    else if (lineas.length > LIMITES_RCV.requisitosMax)
      errores[c] = `Máximo ${LIMITES_RCV.requisitosMax} requisitos.`;
    else if (lineas.some((l) => l.length > LIMITES_RCV.requisitoMax))
      errores[c] =
        `Cada requisito puede tener hasta ${LIMITES_RCV.requisitoMax} caracteres.`;
    valor[c] = lineas;
  }
  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return { ok: true, valor };
}
