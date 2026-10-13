import { parsearMonto } from "@/lib/catalogo/validacion";
import {
  CATEGORIAS_PLAN,
  type CamposPlanRcv,
  type CategoriaRcv,
  type FuenteBs,
  type FuenteMercado,
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

  // "extranjeras" ya no lleva planes (D034): si venía de antes, se descarta al guardar.
  const categorias = CATEGORIAS_PLAN.filter((c) => f.categorias.includes(c));
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
  /** `null` con una fuente automática: no se escribe a mano. */
  usd: number | null;
  bs: number | null;
  cop: number | null;
}

export interface FuentesTasas {
  bs: FuenteBs;
  usd: FuenteMercado;
  cop: FuenteMercado;
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

const AYUDA_TASA: Record<keyof TextosTasas, string> = {
  usd: "Escribe cuántos dólares vale 1 €, p. ej. 1,12.",
  bs: "Escribe cuántos bolívares vale 1 €, sin puntos de miles, p. ej. 979,08.",
  cop: "Escribe cuántos pesos vale 1 €, sin puntos de miles, p. ej. 4350.",
};

const MAXIMO_TASA: Record<keyof TextosTasas, number> = {
  usd: LIMITES_RCV.tasaUsdMax,
  bs: LIMITES_RCV.tasaBsMax,
  cop: LIMITES_RCV.tasaCopMax,
};

/** Solo se validan las tasas en "manual"; las automáticas (BCV, mercado) quedan en `null`. */
export function validarTasas(
  textos: TextosTasas,
  fuentes: FuentesTasas,
): ResultadoTasas {
  const errores: Partial<Record<keyof TextosTasas, string>> = {};
  const valor: TasasValidadas = { usd: null, bs: null, cop: null };
  for (const k of ["bs", "usd", "cop"] as const) {
    if (fuentes[k] !== "manual") continue;
    const n = parsearTasa(textos[k]);
    if (n === null) errores[k] = AYUDA_TASA[k];
    else if (n > MAXIMO_TASA[k]) errores[k] = "Revisa la tasa: es muy alta.";
    else valor[k] = n;
  }
  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return { ok: true, valor };
}

export type ResultadoRequisitos =
  | { ok: true; valor: string[] }
  | { ok: false; error: string };

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

/** Una sola lista para todos los vehículos (D034). */
export function validarRequisitos(texto: string): ResultadoRequisitos {
  const lineas = lineasDeRequisitos(texto);
  if (lineas.length === 0)
    return { ok: false, error: "Escribe al menos un requisito." };
  if (lineas.length > LIMITES_RCV.requisitosMax)
    return {
      ok: false,
      error: `Máximo ${LIMITES_RCV.requisitosMax} requisitos.`,
    };
  if (lineas.some((l) => l.length > LIMITES_RCV.requisitoMax))
    return {
      ok: false,
      error: `Cada requisito puede tener hasta ${LIMITES_RCV.requisitoMax} caracteres.`,
    };
  return { ok: true, valor: lineas };
}
