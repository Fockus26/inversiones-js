import { type CodigoDatos, ErrorDatos } from "./errores";

/** Lo que devuelve cada server action de `lib/data/`: nunca lanza hacia el cliente. */
export type Resultado<T> =
  | { ok: true; datos: T }
  | { ok: false; codigo: CodigoDatos; mensaje?: string };

/**
 * En el cliente: ejecuta la acción y devuelve sus datos o lanza un `ErrorDatos`. Un fallo de
 * red (la acción no llegó al servidor) se traduce a "unavailable".
 */
export async function llamar<T>(
  accion: () => Promise<Resultado<T>>,
): Promise<T> {
  let r: Resultado<T>;
  try {
    r = await accion();
  } catch (e) {
    console.error("[datos] la acción no respondió:", e);
    throw new ErrorDatos("unavailable");
  }
  if (r.ok) return r.datos;
  throw new ErrorDatos(r.codigo, r.mensaje);
}
