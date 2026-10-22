import { codigoDeError } from "@/lib/auth/errores";

/**
 * Errores de Firestore traducidos para los avisos del panel. El texto técnico
 * ("PERMISSION_DENIED: evaluation error at L228…") no le sirve a quien edita. Los errores
 * propios del panel (sin `code`) ya vienen en español y se muestran tal cual.
 */

const MENSAJES: Record<string, string> = {
  "permission-denied":
    "No se aceptó el cambio: puede que ya no tengas acceso o que algún dato no sea válido. Recarga la página e inténtalo de nuevo.",
  "not-found":
    "Este registro ya no existe: alguien lo borró mientras lo editabas.",
  unauthenticated: "Tu sesión terminó. Vuelve a iniciar sesión.",
  unavailable:
    "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.",
  "deadline-exceeded":
    "El servidor tardó demasiado en responder. Inténtalo de nuevo.",
  "resource-exhausted":
    "Se hicieron demasiados cambios seguidos. Espera un momento e inténtalo de nuevo.",
  aborted: "Otro cambio se cruzó con este. Inténtalo de nuevo.",
  "failed-precondition":
    "El registro cambió mientras lo editabas. Recarga la página e inténtalo de nuevo.",
};

export const MENSAJE_INESPERADO =
  "Ocurrió un error inesperado. Inténtalo de nuevo en un momento.";

export function mensajeDeError(error: unknown): string | undefined {
  const codigo = codigoDeError(error);
  if (codigo !== undefined) return MENSAJES[codigo] ?? MENSAJE_INESPERADO;
  return error instanceof Error ? error.message : undefined;
}
