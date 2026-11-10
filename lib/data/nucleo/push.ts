import { eq } from "drizzle-orm";
import { suscripcionesPush } from "@/lib/db/schema";
import type { Db } from "@/lib/db/tipos";
import { esTexto, exigir, soloClaves } from "../validar";

/**
 * Suscripciones Web Push (D035). Como la regla: `user_id` es siempre el de la sesión, nunca el
 * que mande el cliente. El bot las lee y borra las que el navegador dio de baja.
 */
export async function guardarSuscripcion(
  db: Db,
  uid: string,
  entrada: unknown,
): Promise<void> {
  const s = soloClaves<{
    endpoint: string;
    p256dh: string;
    auth: string;
    dispositivo: string;
  }>(entrada, ["endpoint", "p256dh", "auth", "dispositivo"]);
  exigir(
    esTexto(s.endpoint) &&
      esTexto(s.p256dh) &&
      esTexto(s.auth) &&
      esTexto(s.dispositivo),
  );
  const fila = {
    endpoint: s.endpoint as string,
    p256dh: s.p256dh as string,
    auth: s.auth as string,
    dispositivo: s.dispositivo as string,
    userId: uid,
    creadaEn: new Date(),
  };
  await db
    .insert(suscripcionesPush)
    .values(fila)
    .onConflictDoUpdate({ target: suscripcionesPush.endpoint, set: fila });
}

export async function borrarSuscripcion(
  db: Db,
  endpoint: unknown,
): Promise<void> {
  exigir(esTexto(endpoint));
  await db
    .delete(suscripcionesPush)
    .where(eq(suscripcionesPush.endpoint, endpoint as string));
}
