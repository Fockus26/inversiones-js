import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "../auth/servidor";
import { db } from "../db/client";
import { admins } from "../db/schema";
import type { Db } from "../db/tipos";

/**
 * Sustituye `esAdmin()` de firestore.rules (D003): cada función de `lib/data/` empieza por
 * `requireAdmin()`. Sin sesión → 401; con sesión pero sin fila en `admins` → 403.
 */
export class ErrorAcceso extends Error {
  constructor(readonly estado: 401 | 403) {
    super(estado === 401 ? "Inicia sesión para continuar." : "Sin acceso.");
  }
}

export async function esAdmin(database: Db, userId: string): Promise<boolean> {
  const [fila] = await database
    .select({ userId: admins.userId })
    .from(admins)
    .where(eq(admins.userId, userId));
  return Boolean(fila);
}

/** Devuelve el uid del admin de la sesión (para la huella `actualizado_por`). */
export async function requireAdmin(): Promise<string> {
  const sesion = await auth.api.getSession({ headers: await headers() });
  if (!sesion) throw new ErrorAcceso(401);
  if (!(await esAdmin(db, sesion.user.id))) throw new ErrorAcceso(403);
  return sesion.user.id;
}
