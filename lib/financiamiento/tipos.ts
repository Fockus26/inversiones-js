import type { Fecha } from "./fechas";

/**
 * Financiamiento (D032): clientes que compraron a crédito un celular o una póliza RCV y sus
 * cuotas. Lo edita el panel (/clientes). El bot lee `clientesRcv` para los recordatorios de
 * vencimiento de la póliza y solo escribe `recordatorio30`/`recordatorio3` (D033). Sin
 * Firebase: lo importan el panel y `bot/`.
 *
 * Distinto de la agenda (citas en Google Calendar): esto es la cartera de quién debe qué.
 */

export const COLECCION_CLIENTES_CELULARES = "clientesCelulares";
export const COLECCION_CLIENTES_RCV = "clientesRcv";

export const FRECUENCIAS = ["semanal", "quincenal", "mensual"] as const;
export type Frecuencia = (typeof FRECUENCIAS)[number];

export const NOMBRES_FRECUENCIA: Record<Frecuencia, string> = {
  semanal: "Semanal",
  quincenal: "Quincenal",
  mensual: "Mensual",
};

export interface Cuota {
  /** 1, 2, 3… */
  numero: number;
  /** Fecha en que vence. */
  vence: Fecha;
  /** Monto en USD. */
  monto: number;
  pagada: boolean;
  /** Fecha en que se marcó como pagada (null si no). */
  pagadaEl: Fecha | null;
}

/** Inicial + cuotas. Las cuotas se generan desde la primera fecha y la frecuencia. */
export interface PlanPagos {
  /** Inicial en USD (0 si no hubo). */
  inicial: number;
  frecuencia: Frecuencia;
  cuotas: Cuota[];
}

interface Huella {
  actualizadoEn?: Date | null;
  actualizadoPor?: string | null;
}

/** `clientesCelulares/{id}`: quien se llevó un equipo a crédito. */
export interface ClienteCelular extends Huella {
  nombre: string;
  cedula: string;
  /** Como lo escribió el cliente: "0414-1234567". */
  telefono: string;
  /** Equipo que se llevó, p. ej. "HONOR 600 Elite 8/256". */
  equipo: string;
  notas: string;
  pagos: PlanPagos;
}

/** `clientesRcv/{id}`: quien tiene (o está tramitando) una póliza RCV con la tienda. */
export interface ClienteRcv extends Huella {
  nombre: string;
  cedula: string;
  telefono: string;
  correo: string;
  direccion: string;
  /** Plan o tipo de vehículo, p. ej. "TAXI — PLAN BÁSICO TAXI POR PUESTOS". */
  vehiculo: string;
  placa: string;
  notas: string;
  /** Fecha de emisión de la póliza. `null` = todavía no se confirmó que la tiene. */
  emision: Fecha | null;
  /** Emisión + 1 año. `null` si no hay emisión. El bot consulta por este campo. */
  vence: Fecha | null;
  /** Ya se le mandó el aviso de "vence en un mes" para el `vence` actual. */
  recordatorio30: boolean;
  /** Ya se le mandó el aviso de "vence en 3 días" para el `vence` actual. */
  recordatorio3: boolean;
  /** `null` = la pagó de contado. */
  pagos: PlanPagos | null;
}

export type ClienteCelularConId = ClienteCelular & { id: string };
export type ClienteRcvConId = ClienteRcv & { id: string };

export type CamposClienteCelular = Omit<ClienteCelular, keyof Huella>;
export type CamposClienteRcv = Omit<ClienteRcv, keyof Huella>;
