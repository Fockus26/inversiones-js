import { eq, sql } from "drizzle-orm";
import { intentosLogin } from "../db/schema";
import type { Db } from "../db/tipos";

/** Tope por cuenta: solo cuentan los fallos, así una oficina con una IP no se bloquea. */
export const MAX_FALLOS = 5;
export const VENTANA_MS = 15 * 60 * 1000;

export const normalizarCorreo = (c: unknown) =>
  typeof c === "string" ? c.trim().toLowerCase() : "";

/** Puro: ¿esta cuenta está bloqueada ahora? */
export function bloqueada(
  fila: { fallos: number; desde: Date } | undefined,
  ahora = new Date(),
): boolean {
  if (!fila) return false;
  return (
    ahora.getTime() - fila.desde.getTime() < VENTANA_MS &&
    fila.fallos >= MAX_FALLOS
  );
}

export async function cuentaBloqueada(db: Db, correo: string) {
  if (!correo) return false;
  const [fila] = await db
    .select()
    .from(intentosLogin)
    .where(eq(intentosLogin.correo, correo));
  return bloqueada(fila);
}

/** Suma un fallo; si la ventana venció, empieza de nuevo en 1. */
export async function registrarFallo(db: Db, correo: string) {
  if (!correo) return;
  const ventana = sql.raw(`interval '${VENTANA_MS / 1000} seconds'`);
  await db
    .insert(intentosLogin)
    .values({ correo, fallos: 1 })
    .onConflictDoUpdate({
      target: intentosLogin.correo,
      set: {
        fallos: sql`case when ${intentosLogin.desde} < now() - ${ventana} then 1 else ${intentosLogin.fallos} + 1 end`,
        desde: sql`case when ${intentosLogin.desde} < now() - ${ventana} then now() else ${intentosLogin.desde} end`,
      },
    });
}

export async function limpiarFallos(db: Db, correo: string) {
  if (!correo) return;
  await db.delete(intentosLogin).where(eq(intentosLogin.correo, correo));
}
