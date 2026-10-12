/**
 * Modelo de la póliza RCV (D030). Lo edita el panel (/rcv) y lo lee el chatbot: renombrar un
 * campo rompe al bot (ver docs/chatbot.md). Sin Firebase: lo importan el panel y `bot/`.
 *
 * - `planesRcv/{id}`: un documento por transporte, con su precio fijo en euros.
 * - `configuracion/rcv`: tasas del día (€ → $ y € → Bs.) y requisitos por tipo de transporte.
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

/** Cuánto vale 1 € en cada moneda. Las pone el cliente desde el panel. */
export interface TasasRcv {
  /** 1 € = `usd` $. */
  usd: number;
  /** 1 € = `bs` Bs. */
  bs: number;
}

export type RequisitosRcv = Record<CategoriaRcv, string[]>;

/** `configuracion/rcv`. Los campos pueden faltar si el cliente aún no los guardó. */
export interface ConfigRcv {
  tasaUsd?: number;
  tasaBs?: number;
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
  /** `null` si al plan no se le ofrece financiamiento. */
  financiamiento: boolean | null;
  creadoEn?: Date | null;
}

export interface SolicitudRcvConId extends SolicitudRcv {
  id: string;
}

/**
 * POR RESOLVER: requisitos provisionales (inventados para armar el flujo). El cliente los
 * reemplaza desde el panel; el bot los usa mientras `configuracion/rcv` no traiga los suyos.
 */
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

/** Requisitos guardados, o los provisionales para la categoría que no tenga ninguno. */
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

/** Tasas guardadas, o `null` si falta alguna (el chat muestra solo euros). */
export function tasasDe(config: ConfigRcv | null): TasasRcv | null {
  const usd = config?.tasaUsd;
  const bs = config?.tasaBs;
  return typeof usd === "number" && usd > 0 && typeof bs === "number" && bs > 0
    ? { usd, bs }
    : null;
}
