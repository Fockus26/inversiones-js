import { ErrorAcceso } from "./acceso-error";
import { type CodigoDatos, ErrorDatos } from "./errores";
import type { Resultado } from "./resultado";

/**
 * Envoltorio de toda server action del panel: sustituye `esAdmin()` de firestore.rules (D003) y
 * traduce los errores a códigos. `obtenerUid` es `requireAdmin` en producción y un falso en
 * los tests. Los mensajes de validación (`ErrorDatos("invalid-argument", "…")`) llegan tal cual.
 */
export async function ejecutarComo<T>(
  obtenerUid: () => Promise<string>,
  fn: (uid: string) => Promise<T>,
): Promise<Resultado<T>> {
  try {
    const uid = await obtenerUid();
    return { ok: true, datos: await fn(uid) };
  } catch (e) {
    return aResultadoDeError(e);
  }
}

/** Códigos de error de Postgres que el panel sabe explicar. */
const POR_CODIGO_PG: Record<string, CodigoDatos> = {
  "23514": "invalid-argument", // check_violation
  "23502": "invalid-argument", // not_null_violation
  "22P02": "invalid-argument", // invalid_text_representation
  "22003": "invalid-argument", // numeric_value_out_of_range
  "23503": "failed-precondition", // foreign_key_violation
  "23505": "already-exists", // unique_violation
  "40001": "failed-precondition", // serialization_failure
};

function codigoPg(e: unknown): string | undefined {
  // Drizzle envuelve el error del driver en `cause`.
  for (let x: unknown = e, i = 0; x && i < 3; i++) {
    const code = (x as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    x = (x as { cause?: unknown }).cause;
  }
  return undefined;
}

export function aResultadoDeError(e: unknown): Resultado<never> {
  if (e instanceof ErrorAcceso) {
    return {
      ok: false,
      codigo: e.estado === 401 ? "unauthenticated" : "permission-denied",
    };
  }
  if (e instanceof ErrorDatos) {
    return { ok: false, codigo: e.code, mensaje: e.message };
  }
  const pg = codigoPg(e);
  if (pg && POR_CODIGO_PG[pg]) return { ok: false, codigo: POR_CODIGO_PG[pg] };
  console.error("[datos] error inesperado:", e);
  return { ok: false, codigo: "internal" };
}
