/**
 * Modelo del catálogo (D002). Una colección Firestore `productos`, un documento por equipo.
 * El chatbot lee esta misma colección: renombrar un campo rompe al chatbot (ver docs/chatbot.md).
 */

export const MARCAS = [
  "HONOR",
  "INFINIX",
  "REDMI",
  "SAMSUNG",
  "TECNO",
] as const;
export type Marca = (typeof MARCAS)[number];

export const COLECCION_PRODUCTOS = "productos";
/** Documento `admins/{uid}` existe ⇔ ese usuario puede entrar al panel y escribir (D003). */
export const COLECCION_ADMINS = "admins";

export interface Producto {
  /** Marca del equipo; agrupa la lista en el panel y en el texto del chatbot. */
  marca: Marca;
  /** Modelo tal como lo ve el cliente final, p. ej. "600 Elite". */
  nombre: string;
  /** RAM/almacenamiento en GB, p. ej. "8/256". */
  variante: string;
  /** Pago inicial en USD (entero o con decimales). */
  inicial: number;
  /** Monto de cada cuota quincenal en USD. */
  cuota: number;
  /** Número de cuotas quincenales (hoy siempre 6). */
  numeroCuotas: number;
  /** Unidades disponibles. 0 = agotado. */
  cantidad: number;
  /** false = oculto para el chatbot sin borrarlo. */
  activo: boolean;
  /** Orden dentro de la marca (menor primero). */
  orden: number;
  /** Fecha de la última edición (serverTimestamp en Firestore; Date en el cliente). */
  actualizadoEn?: Date | null;
  /** UID de quien hizo la última edición. */
  actualizadoPor?: string | null;
}

export interface ProductoConId extends Producto {
  id: string;
}

/** Campos que el panel deja editar al cliente. */
export type CamposEditables = Pick<
  Producto,
  | "nombre"
  | "variante"
  | "inicial"
  | "cuota"
  | "numeroCuotas"
  | "cantidad"
  | "activo"
  | "marca"
>;
