import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "../auth/servidor";
import { db } from "../db/client";
import { admins } from "../db/schema";
import type { Db } from "../db/tipos";
import { ErrorAcceso } from "./acceso-error";
import { ejecutarComo } from "./accion";
import type { Resultado } from "./resultado";

/**
 * Sustituye `esAdmin()` de firestore.rules (D003): cada server action de `lib/data/` pasa por
 * `comoAdmin()`. Solo en el servidor.
 */
export { ErrorAcceso };

export async function esAdmin(database: Db, userId: string): Promise<boolean> {
  const [fila] = await database
    .select({ userId: admins.userId })
    .from(admins)
    .where(eq(admins.userId, userId));
  return Boolean(fila);
}

/** Uid del usuario de la sesión, o `null` sin sesión. */
export async function uidDeSesion(): Promise<string | null> {
  const sesion = await auth.api.getSession({ headers: await headers() });
  return sesion?.user.id ?? null;
}

/** Devuelve el uid del admin de la sesión (para la huella `actualizado_por`). */
export async function requireAdmin(): Promise<string> {
  const uid = await uidDeSesion();
  if (!uid) throw new ErrorAcceso(401);
  if (!(await esAdmin(db, uid))) throw new ErrorAcceso(403);
  return uid;
}

export const comoAdmin = <T>(
  fn: (uid: string) => Promise<T>,
): Promise<Resultado<T>> => ejecutarComo(requireAdmin, fn);
