import { codigoDeError } from "@/lib/auth/errores";

/**
 * Errores de la capa de datos traducidos para los avisos del panel. Los códigos los pone el
 * servidor (`lib/data/accion.ts`) y viajan en el resultado de cada server action: Next oculta el
 * mensaje de una excepción en producción, así que nunca se lanza una desde el servidor.
 * Los errores propios del panel (sin código) ya vienen en español y se muestran tal cual.
 */

export const MENSAJE_BORRADO =
  "Este registro ya no existe: alguien lo borró mientras lo editabas.";

export type CodigoDatos =
  | "unauthenticated"
  | "permission-denied"
  | "invalid-argument"
  | "not-found"
  | "already-exists"
  | "failed-precondition"
  | "unavailable"
  | "internal";

const MENSAJES: Record<CodigoDatos, string> = {
  "permission-denied":
    "No se aceptó el cambio: puede que ya no tengas acceso. Recarga la página e inténtalo de nuevo.",
  "invalid-argument":
    "No se aceptó el cambio: algún dato no es válido. Revísalo e inténtalo de nuevo.",
  "not-found": MENSAJE_BORRADO,
  "already-exists": "Ya existe un registro con ese nombre.",
  unauthenticated: "Tu sesión terminó. Vuelve a iniciar sesión.",
  unavailable:
    "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.",
  "failed-precondition":
    "El registro cambió mientras lo editabas. Recarga la página e inténtalo de nuevo.",
  internal: "Ocurrió un error inesperado. Inténtalo de nuevo en un momento.",
};

export const MENSAJE_INESPERADO = MENSAJES.internal;

/** Error que llega al cliente: `code` para decidir, `message` para mostrar. */
export class ErrorDatos extends Error {
  constructor(
    readonly code: CodigoDatos,
    mensaje?: string,
  ) {
    super(mensaje ?? MENSAJES[code]);
    this.name = "ErrorDatos";
  }
}

/**
 * Texto de una pantalla que no pudo cargar. La pantalla se recupera sola en el siguiente sondeo,
 * así que no pide recargar (la PWA instalada no tiene ese botón); y solo culpa a la conexión
 * cuando de verdad no llegó al servidor.
 */
export function textoErrorCarga(error: ErrorDatos): string {
  const causa =
    error.code === "unavailable"
      ? "No hay conexión con el servidor: revisa tu internet."
      : "El servidor no respondió como debía.";
  return `${causa} Lo volvemos a intentar solos en unos segundos, o pulsa Reintentar.`;
}

export function mensajeDeError(error: unknown): string | undefined {
  if (error instanceof ErrorDatos) return error.message;
  const codigo = codigoDeError(error);
  if (codigo !== undefined)
    return MENSAJES[codigo as CodigoDatos] ?? MENSAJE_INESPERADO;
  return error instanceof Error ? error.message : undefined;
}
