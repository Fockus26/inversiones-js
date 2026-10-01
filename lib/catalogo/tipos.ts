/**
 * Modelo del catálogo (D002). Una colección Firestore `productos`, un documento por equipo.
 * El chatbot lee esta misma colección: renombrar un campo rompe al chatbot (ver docs/chatbot.md).
 */

/**
 * Marcas con las que arranca el catálogo (seed). Desde D025 las marcas viven en la colección
 * `marcas` y el cliente las agrega, renombra y borra desde el panel: no asumas esta lista.
 */
export const MARCAS_INICIALES = [
  "HONOR",
  "INFINIX",
  "REDMI",
  "SAMSUNG",
  "TECNO",
] as const;

/** Nombre de marca en mayúsculas, p. ej. "HONOR". Es también el id de `marcas/{nombre}`. */
export type Marca = string;

/** Orden de presentación de las marcas (panel y texto del chatbot): alfabético. */
export function compararMarcas(a: Marca, b: Marca): number {
  return a.localeCompare(b, "es");
}

export const COLECCION_PRODUCTOS = "productos";
/** Documento `marcas/{nombre}`: la marca existe ⇔ existe su documento (D025). */
export const COLECCION_MARCAS = "marcas";
/** Documento `admins/{uid}` existe ⇔ ese usuario puede entrar al panel y escribir (D003). */
export const COLECCION_ADMINS = "admins";

export interface Producto {
  /** Marca del equipo (una de `marcas`); agrupa la lista en el panel y en el texto del chatbot. */
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

export interface MarcaRegistrada {
  /** Igual al id del documento, en mayúsculas. */
  nombre: Marca;
  actualizadoEn?: Date | null;
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
