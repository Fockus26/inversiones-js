/**
 * Planes de póliza RCV. Hoy salen de `PLANES_RCV_POR_DEFECTO` (la tabla que pasó el cliente);
 * cuando exista la página web, `Servicios.planesRcv()` los leerá de allí con sus precios
 * del día (ver "Por resolver" en `docs/chatbot.md`).
 */

export type CategoriaRcv = "publico" | "privado" | "extranjeras";

export interface PreciosRcv {
  eur: number;
  usd: number;
  cop: number;
  bs: number;
}

export interface PlanRcv {
  /** Número de la tabla del cliente (1–8). */
  nro: number;
  clase: string;
  descripcion: string;
  /** `null` = no tiene precio fijo: se solicita cotización. */
  precios: PreciosRcv | null;
  categorias: readonly CategoriaRcv[];
  /** Pregunta si quiere financiamiento antes de pedir los datos (minibuses). */
  ofreceFinanciamiento?: boolean;
}

export interface SolicitudRcv {
  categoria: CategoriaRcv;
  plan: PlanRcv;
  /** Solo si el plan ofrece financiamiento. */
  financiamiento?: boolean;
  nombre: string;
  correo: string;
  telefono: string;
  /** JID de WhatsApp desde el que escribió. */
  jid: string;
}

/** Privado: 1–4. Público: 1–6 y 8. Placas extranjeras (7): opción aparte. */
export const PLANES_RCV_POR_DEFECTO: readonly PlanRcv[] = [
  {
    nro: 1,
    clase: "MOTO",
    descripcion: "MOTOCICLETAS",
    precios: { eur: 15, usd: 16.79, cop: 52_047, bs: 14_686.18 },
    categorias: ["privado", "publico"],
  },
  {
    nro: 2,
    clase: "PARTICULAR",
    descripcion: "PLAN BÁSICO PARTICULAR HASTA 800KG",
    precios: { eur: 33, usd: 36.94, cop: 114_503, bs: 32_309.6 },
    categorias: ["privado", "publico"],
  },
  {
    nro: 3,
    clase: "PARTICULAR",
    descripcion: "PLAN BÁSICO PARTICULAR MÁS 800KG",
    precios: { eur: 39, usd: 43.65, cop: 135_322, bs: 38_184.07 },
    categorias: ["privado", "publico"],
  },
  {
    nro: 4,
    clase: "PICK UP",
    descripcion: "PLAN BÁSICO PARTICULAR PICK UP",
    precios: { eur: 45, usd: 50.37, cop: 156_141, bs: 44_058.55 },
    categorias: ["privado", "publico"],
  },
  {
    nro: 5,
    clase: "CARGA",
    descripcion: "PLAN BÁSICO CARGA DE 2 TM A 5 TM",
    precios: { eur: 84, usd: 94.02, cop: 291_463, bs: 82_242.62 },
    categorias: ["publico"],
  },
  {
    nro: 6,
    clase: "TAXI",
    descripcion: "PLAN BÁSICO TAXI POR PUESTOS",
    precios: { eur: 114, usd: 127.6, cop: 395_557, bs: 111_614.98 },
    categorias: ["publico"],
  },
  {
    nro: 7,
    clase: "PLACAS EXTRANJERAS",
    descripcion: "SOLICITAR COTIZACIÓN",
    precios: null,
    categorias: ["extranjeras"],
  },
  {
    nro: 8,
    clase: "MINIBUSES URBANOS Y SUBURBANOS",
    descripcion: "PLAN II MINIBUSES URBANOS Y SUBURBANOS APOV/EXC",
    precios: { eur: 131, usd: 146.63, cop: 454_544, bs: 128_259.32 },
    categorias: ["publico"],
    ofreceFinanciamiento: true,
  },
];

export const TELEFONO_RCV = "0414-7221091";

/**
 * POR RESOLVER: requisitos provisionales, inventados para armar el flujo. El cliente debe
 * confirmar la lista real de cada tipo de transporte.
 */
export const REQUISITOS_RCV: Record<CategoriaRcv, readonly string[]> = {
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

export function planesDe(
  planes: readonly PlanRcv[],
  categoria: CategoriaRcv,
): PlanRcv[] {
  return planes
    .filter((p) => p.categorias.includes(categoria))
    .sort((a, b) => a.nro - b.nro);
}

const ES = (decimales: number) =>
  new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });

/** "15,00 € · 16,79$ · 52.047 COP · Bs. 14.686,18", o "Solicitar cotización". */
export function textoPrecio(plan: PlanRcv): string {
  const p = plan.precios;
  if (!p) return "Solicitar cotización";
  const dos = ES(2);
  return `${dos.format(p.eur)} € · ${dos.format(p.usd)}$ · ${ES(0).format(p.cop)} COP · Bs. ${dos.format(p.bs)}`;
}

/** Descripción tal como la escribe el cliente (siglas como "TM", "APOV/EXC" no se tocan). */
export function nombrePlan(plan: PlanRcv): string {
  return plan.descripcion;
}
