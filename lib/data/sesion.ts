"use server";

import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { user } from "../db/schema";
import { esAdmin, uidDeSesion } from "./acceso";

/**
 * Quién está en sesión y si es admin (D010). No exige admin: es lo que decide qué ve la persona.
 * La barrera real está en cada acción (`comoAdmin`). Si la base no responde lanza: el cliente
 * lo trata como fallo de conexión, no como "sin acceso".
 */
export async function obtenerSesion(): Promise<{
  uid: string;
  email: string;
  esAdmin: boolean;
} | null> {
  try {
    const uid = await uidDeSesion();
    if (!uid) return null;
    const [u] = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, uid));
    if (!u) return null;
    return { uid, email: u.email, esAdmin: await esAdmin(db, uid) };
  } catch (e) {
    console.error("[sesion] no se pudo comprobar la sesión:", e);
    throw new Error("sin-servidor");
  }
}
