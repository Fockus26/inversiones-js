import { type CodigoDatos, ErrorDatos } from "./errores";

/** Lo que devuelve cada server action de `lib/data/`: nunca lanza hacia el cliente. */
export type Resultado<T> =
  | { ok: true; datos: T }
  | { ok: false; codigo: CodigoDatos; mensaje?: string };

/**
 * En el cliente: ejecuta la acción y devuelve sus datos o lanza un `ErrorDatos`. Sin red (la
 * acción no llegó: `fetch` lanza TypeError) → "unavailable"; si el servidor respondió con un
 * 500/504 no es culpa del internet de quien usa el panel → "internal".
 */
export async function llamar<T>(
  accion: () => Promise<Resultado<T>>,
): Promise<T> {
  let r: Resultado<T>;
  try {
    r = await accion();
  } catch (e) {
    console.error("[datos] la acción no respondió:", e);
    const sinRed =
      e instanceof TypeError ||
      (typeof navigator !== "undefined" && navigator.onLine === false);
    throw new ErrorDatos(sinRed ? "unavailable" : "internal");
  }
  if (r.ok) return r.datos;
  throw new ErrorDatos(r.codigo, r.mensaje);
}
