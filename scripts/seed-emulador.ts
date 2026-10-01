/**
 * Carga el catálogo del 29/09 y dos cuentas de prueba en los EMULADORES locales.
 * Requiere `bun run emulators` corriendo. Re-ejecutable (upsert por id).
 *
 *   bun run seed:emulador
 *
 * Se niega a correr si no apunta a los emuladores: para producción, ver scripts de W3.
 */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { CATALOGO_INICIAL } from "@/lib/catalogo/catalogo-inicial";
import { COLECCION_ADMINS, COLECCION_PRODUCTOS } from "@/lib/catalogo/tipos";

/** Cuentas que SOLO existen en el emulador (proyecto demo-*). */
export const CUENTAS_EMULADOR = {
  admin: { email: "admin@inversiones.test", password: "demo-admin-123" },
  sinAcceso: {
    email: "intruso@inversiones.test",
    password: "demo-intruso-123",
  },
} as const;

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
const projectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-inversiones-js";
if (!projectId.startsWith("demo-")) {
  throw new Error(
    `seed-emulador solo corre contra proyectos demo-*; recibí "${projectId}"`,
  );
}

initializeApp({ projectId });
const auth = getAuth();
const db = getFirestore();

async function asegurarUsuario(
  email: string,
  password: string,
): Promise<string> {
  try {
    return (await auth.getUserByEmail(email)).uid;
  } catch {
    return (await auth.createUser({ email, password, emailVerified: true }))
      .uid;
  }
}

const adminUid = await asegurarUsuario(
  CUENTAS_EMULADOR.admin.email,
  CUENTAS_EMULADOR.admin.password,
);
await asegurarUsuario(
  CUENTAS_EMULADOR.sinAcceso.email,
  CUENTAS_EMULADOR.sinAcceso.password,
);
await db
  .collection(COLECCION_ADMINS)
  .doc(adminUid)
  .set({ email: CUENTAS_EMULADOR.admin.email });

const lote = db.batch();
for (const { id, ...producto } of CATALOGO_INICIAL) {
  lote.set(db.collection(COLECCION_PRODUCTOS).doc(id), {
    ...producto,
    actualizadoEn: FieldValue.serverTimestamp(),
    actualizadoPor: "seed",
  });
}
await lote.commit();

console.log(
  `✓ ${CATALOGO_INICIAL.length} productos y 2 cuentas en ${projectId} (admin: ${CUENTAS_EMULADOR.admin.email})`,
);
process.exit(0);
