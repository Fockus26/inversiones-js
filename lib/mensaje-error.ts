/**
 * Texto en español para la descripción de un toast de error. Firestore devuelve mensajes
 * técnicos en inglés ("PERMISSION_DENIED: evaluation error at L228…"); aquí se traducen los
 * códigos que puede ver un admin. Cualquier otro error conserva su mensaje.
 */
const POR_CODIGO: Record<string, string> = {
  "permission-denied":
    "Tu cuenta ya no tiene permiso para editar. Cierra sesión y vuelve a entrar.",
  unauthenticated: "Tu sesión venció. Vuelve a iniciar sesión.",
  unavailable:
    "Sin conexión con el servidor. Revisa tu internet e inténtalo de nuevo.",
  "deadline-exceeded": "El servidor tardó demasiado. Inténtalo de nuevo.",
  "not-found":
    "Ese registro ya no existe: puede que otra persona lo haya borrado.",
};

export function mensajeDeError(e: unknown): string | undefined {
  const codigo =
    typeof e === "object" && e !== null && "code" in e
      ? String((e as { code: unknown }).code)
      : undefined;
  if (codigo && codigo in POR_CODIGO) return POR_CODIGO[codigo];
  return e instanceof Error ? e.message : undefined;
}
