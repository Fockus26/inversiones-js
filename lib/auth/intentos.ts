import { eq, sql } from "drizzle-orm";
import { intentosLogin } from "../db/schema";
import type { Db } from "../db/tipos";

/**
 * Tope por cuenta: 5 contraseñas comprobadas cada 15 min (solo cuentan los fallos, así una
 * oficina con una IP no se bloquea). El intento se reserva ANTES de comprobar la contraseña con
 * un solo `upsert … returning`: en paralelo no pasan más de 5 (antes se leía y luego se sumaba,
 * y 30 intentos a la vez pasaban casi todos).
 */
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

const ventana = () => sql.raw(`interval '${VENTANA_MS / 1000} seconds'`);

/**
 * Reserva un intento (cuenta como fallo hasta que se sepa el resultado). Devuelve false si la
 * cuenta ya agotó los 5 de la ventana: entonces no se comprueba la contraseña. Si la ventana
 * venció, empieza de nuevo en 1.
 */
export async function reservarIntento(db: Db, correo: string) {
  if (!correo) return true;
  const v = ventana();
  const [fila] = await db
    .insert(intentosLogin)
    .values({ correo, fallos: 1 })
    .onConflictDoUpdate({
      target: intentosLogin.correo,
      set: {
        fallos: sql`case when ${intentosLogin.desde} < now() - ${v} then 1 else ${intentosLogin.fallos} + 1 end`,
        desde: sql`case when ${intentosLogin.desde} < now() - ${v} then now() else ${intentosLogin.desde} end`,
      },
    })
    .returning({ fallos: intentosLogin.fallos });
  return (fila?.fallos ?? 1) <= MAX_FALLOS;
}

/** Devuelve un intento reservado que no llegó a comprobar la contraseña (origen, formato…). */
export async function liberarIntento(db: Db, correo: string) {
  if (!correo) return;
  await db
    .update(intentosLogin)
    .set({ fallos: sql`greatest(${intentosLogin.fallos} - 1, 0)` })
    .where(eq(intentosLogin.correo, correo));
}

/** Entró bien o cambió la contraseña: la cuenta queda sin fallos. */
export async function limpiarFallos(db: Db, correo: string) {
  if (!correo) return;
  await db.delete(intentosLogin).where(eq(intentosLogin.correo, correo));
}
