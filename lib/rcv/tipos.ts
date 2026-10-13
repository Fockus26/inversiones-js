/**
 * Modelo de la póliza RCV (D030). Lo edita el panel (/rcv) y lo lee el chatbot: renombrar un
 * campo rompe al bot (ver docs/chatbot.md). Sin Firebase: lo importan el panel y `bot/`.
 *
 * - `planesRcv/{id}`: un documento por transporte, con su precio fijo en euros.
 * - `configuracion/rcv`: tasas del día (€ → $, € → Bs. y € → COP) y requisitos (una sola lista
 *   para todos los vehículos, D034). La de bolívares puede ser la del BCV (se consulta sola) o manual.
 * - `solicitudesRcv/{id}`: datos que deja el cliente en el chat. Solo las escribe el bot.
 */

export const COLECCION_PLANES_RCV = "planesRcv";
export const COLECCION_SOLICITUDES_RCV = "solicitudesRcv";
/** Documento dentro de `configuracion` (la misma colección del horario, D027). */
export const DOC_CONFIG_RCV = "rcv";

export const CATEGORIAS_RCV = ["publico", "privado", "extranjeras"] as const;
export type CategoriaRcv = (typeof CATEGORIAS_RCV)[number];

export const NOMBRES_CATEGORIA: Record<CategoriaRcv, string> = {
  publico: "Transporte público",
  privado: "Transporte privado",
  extranjeras: "Placas extranjeras",
};

/**
 * Categorías con transportes de precio fijo (D034). Placas extranjeras no tiene planes: el
 * chat pide el tipo de vehículo y se cotiza aparte.
 */
export const CATEGORIAS_PLAN = [
  "publico",
  "privado",
] as const satisfies readonly CategoriaRcv[];
export type CategoriaPlan = (typeof CATEGORIAS_PLAN)[number];

export interface PlanRcv {
  /** Tipo de vehículo, p. ej. "MOTO", "TAXI". */
  clase: string;
  /** Descripción del plan, p. ej. "PLAN BÁSICO TAXI POR PUESTOS". */
  descripcion: string;
  /** Precio fijo en euros. `null` = sin precio fijo: se solicita cotización. */
  precioEur: number | null;
  /** En qué opciones del chat aparece (al menos una). Datos de antes de D034 pueden traer "extranjeras": se ignora. */
  categorias: CategoriaRcv[];
  /** Si es transporte público, el chat pregunta si quiere financiamiento. */
  financiamiento: boolean;
  /** false = el chat no lo ofrece (no está borrado). */
  activo: boolean;
  /** Orden en la lista (menor primero). */
  orden: number;
  actualizadoEn?: Date | null;
  actualizadoPor?: string | null;
}

export interface PlanRcvConId extends PlanRcv {
  id: string;
}

export type CamposPlanRcv = Omit<
  PlanRcv,
  "orden" | "actualizadoEn" | "actualizadoPor"
>;

/** Cuánto vale 1 € en cada moneda. Dólares y pesos los pone el cliente; bolívares, BCV o manual. */
export interface TasasRcv {
  /** 1 € = `usd` $. */
  usd: number;
  /** 1 € = `bs` Bs. */
  bs: number;
  /** 1 € = `cop` pesos colombianos. `null` si aún no se guardó: el chat no muestra pesos. */
  cop: number | null;
}

/** De dónde sale la tasa de bolívares: la oficial del BCV (consultada sola) o la que se escriba. */
export const FUENTES_BS = ["bcv", "manual"] as const;
export type FuenteBs = (typeof FUENTES_BS)[number];

/** Dólares y pesos (D036): la tasa de mercado (se consulta sola) o la que se escriba. */
export const FUENTES_MERCADO = ["mercado", "manual"] as const;
export type FuenteMercado = (typeof FUENTES_MERCADO)[number];

/** `configuracion/rcv`. Los campos pueden faltar si el cliente aún no los guardó. */
export interface ConfigRcv {
  /** Con `fuenteUsd: "mercado"` es la última de mercado que se guardó: respaldo (D036). */
  tasaUsd?: number;
  /** Con `fuenteBs: "bcv"` es la última tasa BCV que se guardó: respaldo si la API no responde. */
  tasaBs?: number;
  /** Con `fuenteCop: "mercado"`, respaldo como `tasaUsd`. */
  tasaCop?: number;
  /** Sin el campo = "manual" (configuraciones de antes de que existiera). */
  fuenteBs?: FuenteBs;
  /** Sin el campo = "manual". */
  fuenteUsd?: FuenteMercado;
  /** Sin el campo = "manual". */
  fuenteCop?: FuenteMercado;
  /** Requisitos de la póliza, iguales para todo vehículo (D034). */
  requisitosGenerales?: string[];
  /** Antes de D034: requisitos por categoría. Ya no se usa; el panel lo borra al guardar. */
  requisitos?: unknown;
  actualizadoEn?: Date | null;
  actualizadoPor?: string | null;
}

/** Lo que guarda el bot en `solicitudesRcv` (copia del plan tal como se le mostró). */
export interface SolicitudRcv {
  nombre: string;
  correo: string;
  telefono: string;
  /** Número de WhatsApp desde el que escribió (dígitos). */
  whatsapp: string;
  categoria: CategoriaRcv;
  planId: string;
  clase: string;
  descripcion: string;
  /** Placas extranjeras (D034): el vehículo como lo describió el cliente, para cotizar. */
  vehiculo?: string;
  precioEur: number | null;
  precioUsd: number | null;
  precioBs: number | null;
  /** Puede faltar en solicitudes de antes de que existiera la tasa de pesos. */
  precioCop?: number | null;
  /** `null` si al plan no se le ofrece financiamiento. */
  financiamiento: boolean | null;
  creadoEn?: Date | null;
}

export interface SolicitudRcvConId extends SolicitudRcv {
  id: string;
}

/** Requisitos de arranque (D034): el bot los usa mientras `configuracion/rcv` no traiga los suyos. */
export const REQUISITOS_RCV_POR_DEFECTO: readonly string[] = [
  "Fotos de la cédula de identidad",
  "Foto del título o carnet de circulación o certificado de origen",
  "Correo electrónico",
  "Teléfono",
  "Dirección",
];

/** Requisitos guardados, o los de arranque si no hay ninguno. */
export function requisitosEfectivos(config: ConfigRcv | null): string[] {
  const r = config?.requisitosGenerales;
  return Array.isArray(r) && r.length > 0 ? r : [...REQUISITOS_RCV_POR_DEFECTO];
}

const positivo = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;

export function fuenteBsDe(config: ConfigRcv | null): FuenteBs {
  return config?.fuenteBs === "bcv" ? "bcv" : "manual";
}

export function fuenteUsdDe(config: ConfigRcv | null): FuenteMercado {
  return config?.fuenteUsd === "mercado" ? "mercado" : "manual";
}

export function fuenteCopDe(config: ConfigRcv | null): FuenteMercado {
  return config?.fuenteCop === "mercado" ? "mercado" : "manual";
}

/** Tasas consultadas hace poco (null = no hay o la API no respondió). */
export interface TasasEnVivo {
  bs?: number | null;
  usd?: number | null;
  cop?: number | null;
}

/**
 * Tasas con las que se cotiza, o `null` si falta la de dólares o la de bolívares (el chat
 * muestra solo euros). Con una fuente automática (`bcv` o `mercado`), la tasa consultada hace
 * poco manda sobre la guardada; si la API no respondió, se usa la última guardada.
 */
export function tasasDe(
  config: ConfigRcv | null,
  enVivo: TasasEnVivo = {},
): TasasRcv | null {
  const usd =
    fuenteUsdDe(config) === "mercado" && positivo(enVivo.usd)
      ? enVivo.usd
      : config?.tasaUsd;
  const bs =
    fuenteBsDe(config) === "bcv" && positivo(enVivo.bs)
      ? enVivo.bs
      : config?.tasaBs;
  const cop =
    fuenteCopDe(config) === "mercado" && positivo(enVivo.cop)
      ? enVivo.cop
      : config?.tasaCop;
  if (!positivo(usd) || !positivo(bs)) return null;
  return { usd, bs, cop: positivo(cop) ? cop : null };
}
