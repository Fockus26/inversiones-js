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
import {
  COLECCION_ADMINS,
  COLECCION_MARCAS,
  COLECCION_PRODUCTOS,
  MARCAS_INICIALES,
} from "@/lib/catalogo/tipos";
import { COLECCION_CONFIGURACION } from "@/lib/horario/tipos";
import {
  PLANES_RCV_INICIALES,
  TASAS_RCV_INICIALES,
} from "@/lib/rcv/planes-iniciales";
import {
  COLECCION_PLANES_RCV,
  COLECCION_SOLICITUDES_RCV,
  DOC_CONFIG_RCV,
} from "@/lib/rcv/tipos";

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
for (const nombre of MARCAS_INICIALES) {
  lote.set(db.collection(COLECCION_MARCAS).doc(nombre), {
    nombre,
    actualizadoEn: FieldValue.serverTimestamp(),
    actualizadoPor: "seed",
  });
}
for (const { id, ...producto } of CATALOGO_INICIAL) {
  lote.set(db.collection(COLECCION_PRODUCTOS).doc(id), {
    ...producto,
    actualizadoEn: FieldValue.serverTimestamp(),
    actualizadoPor: "seed",
  });
}
for (const { id, ...plan } of PLANES_RCV_INICIALES) {
  lote.set(db.collection(COLECCION_PLANES_RCV).doc(id), {
    ...plan,
    actualizadoEn: FieldValue.serverTimestamp(),
    actualizadoPor: "seed",
  });
}
lote.set(db.collection(COLECCION_CONFIGURACION).doc(DOC_CONFIG_RCV), {
  tasaUsd: TASAS_RCV_INICIALES.usd,
  tasaBs: TASAS_RCV_INICIALES.bs,
  actualizadoEn: FieldValue.serverTimestamp(),
  actualizadoPor: "seed",
});
// Una solicitud de ejemplo para ver la lista en el panel.
lote.set(db.collection(COLECCION_SOLICITUDES_RCV).doc("ejemplo"), {
  nombre: "María Pérez",
  correo: "maria@ejemplo.com",
  telefono: "04141234567",
  whatsapp: "584141234567",
  categoria: "publico",
  planId: "minibuses",
  clase: "MINIBUSES URBANOS Y SUBURBANOS",
  descripcion: "PLAN II MINIBUSES URBANOS Y SUBURBANOS APOV/EXC",
  precioEur: 131,
  precioUsd: 146.63,
  precioBs: 128259.32,
  financiamiento: true,
  creadoEn: FieldValue.serverTimestamp(),
});
await lote.commit();

console.log(
  `✓ ${MARCAS_INICIALES.length} marcas, ${CATALOGO_INICIAL.length} productos, ${PLANES_RCV_INICIALES.length} transportes RCV y 2 cuentas en ${projectId} (admin: ${CUENTAS_EMULADOR.admin.email})`,
);
process.exit(0);
