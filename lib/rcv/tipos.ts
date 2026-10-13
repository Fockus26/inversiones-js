/**
 * Modelo de la póliza RCV (D030). Lo edita el panel (/rcv) y lo lee el chatbot: renombrar un
 * campo rompe al bot (ver docs/chatbot.md). Sin Firebase: lo importan el panel y `bot/`.
 *
 * - `planesRcv/{id}`: un documento por transporte, con su precio fijo en euros.
 * - `configuracion/rcv`: tasas del día (€ → $, € → Bs. y € → COP) y requisitos por tipo de
 *   transporte. La de bolívares puede ser la oficial del BCV (se consulta sola) o manual.
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

export interface PlanRcv {
  /** Tipo de vehículo, p. ej. "MOTO", "TAXI". */
  clase: string;
  /** Descripción del plan, p. ej. "PLAN BÁSICO TAXI POR PUESTOS". */
  descripcion: string;
  /** Precio fijo en euros. `null` = sin precio fijo: se solicita cotización. */
  precioEur: number | null;
  /** En qué opciones del chat aparece (al menos una). */
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

export type RequisitosRcv = Record<CategoriaRcv, string[]>;

/** `configuracion/rcv`. Los campos pueden faltar si el cliente aún no los guardó. */
export interface ConfigRcv {
  tasaUsd?: number;
  /** Con `fuenteBs: "bcv"` es la última tasa BCV que se guardó: respaldo si la API no responde. */
  tasaBs?: number;
  tasaCop?: number;
  /** Sin el campo = "manual" (configuraciones de antes de que existiera). */
  fuenteBs?: FuenteBs;
  requisitos?: Partial<RequisitosRcv>;
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

/** Requisitos de arranque: el bot los usa mientras `configuracion/rcv` no traiga los suyos. */
export const REQUISITOS_RCV_POR_DEFECTO: RequisitosRcv = {
  privado: [
    "Copia de la cédula del propietario",
    "Copia del certificado de circulación (título) del vehículo",
    "Copia de la licencia de conducir",
  ],
  publico: [
    "Copia de la cédula del propietario",
    "Copia del certificado de circulación (título) del vehículo",
    "Copia de la licencia de conducir de quinto grado",
    "Copia del permiso de prestación de servicio público (INTT) o constancia de la línea",
  ],
  extranjeras: [
    "Copia del pasaporte o documento de identidad del propietario",
    "Copia del documento de propiedad del vehículo del país de origen",
    "Copia del permiso de ingreso temporal del vehículo al país",
  ],
};

/** Requisitos guardados, o los de arranque para la categoría que no tenga ninguno. */
export function requisitosEfectivos(config: ConfigRcv | null): RequisitosRcv {
  const r = config?.requisitos ?? {};
  const de = (c: CategoriaRcv) =>
    r[c] && r[c].length > 0 ? r[c] : REQUISITOS_RCV_POR_DEFECTO[c];
  return {
    publico: de("publico"),
    privado: de("privado"),
    extranjeras: de("extranjeras"),
  };
}

const positivo = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;

export function fuenteBsDe(config: ConfigRcv | null): FuenteBs {
  return config?.fuenteBs === "bcv" ? "bcv" : "manual";
}

/**
 * Tasas con las que se cotiza, o `null` si falta la de dólares o la de bolívares (el chat
 * muestra solo euros). Con `fuenteBs: "bcv"`, `bcv` (la tasa consultada hace poco) manda sobre
 * la guardada; si la API no respondió, se usa la última guardada.
 */
export function tasasDe(
  config: ConfigRcv | null,
  bcv: number | null = null,
): TasasRcv | null {
  const usd = config?.tasaUsd;
  const bs =
    fuenteBsDe(config) === "bcv" && positivo(bcv) ? bcv : config?.tasaBs;
  const cop = config?.tasaCop;
  if (!positivo(usd) || !positivo(bs)) return null;
  return { usd, bs, cop: positivo(cop) ? cop : null };
}
