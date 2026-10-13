/**
 * Carga el catálogo del 29/09, la póliza RCV, clientes con financiamiento de prueba (D032) y dos
 * cuentas de prueba en los EMULADORES locales.
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
import {
  clientesCelularesDePrueba,
  clientesRcvDePrueba,
} from "@/lib/financiamiento/datos-demo";
import { hoyCaracas } from "@/lib/financiamiento/fechas";
import {
  COLECCION_CLIENTES_CELULARES,
  COLECCION_CLIENTES_RCV,
} from "@/lib/financiamiento/tipos";
import { COLECCION_CONFIGURACION } from "@/lib/horario/tipos";
import {
  PLANES_RCV_INICIALES,
  TASAS_RCV_INICIALES,
} from "@/lib/rcv/planes-iniciales";
import {
  COLECCION_PLANES_RCV,
  COLECCION_SOLICITUDES_RCV,
  DOC_CONFIG_RCV,
  REQUISITOS_RCV_POR_DEFECTO,
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
  requisitosGenerales: [...REQUISITOS_RCV_POR_DEFECTO],
  actualizadoEn: FieldValue.serverTimestamp(),
  actualizadoPor: "seed",
});
// Clientes con financiamiento en distintas situaciones (al día, atrasados, por vencer…).
const hoy = hoyCaracas();
const celulares = clientesCelularesDePrueba(hoy);
const clientesRcv = clientesRcvDePrueba(hoy);
for (const { id, ...cliente } of celulares) {
  lote.set(db.collection(COLECCION_CLIENTES_CELULARES).doc(id), {
    ...cliente,
    actualizadoEn: FieldValue.serverTimestamp(),
    actualizadoPor: "seed",
  });
}
for (const { id, ...cliente } of clientesRcv) {
  lote.set(db.collection(COLECCION_CLIENTES_RCV).doc(id), {
    ...cliente,
    actualizadoEn: FieldValue.serverTimestamp(),
    actualizadoPor: "seed",
  });
}
// Solicitud de placas extranjeras (D034): sin precio, con el vehículo a cotizar.
lote.set(db.collection(COLECCION_SOLICITUDES_RCV).doc("ejemplo-extranjera"), {
  nombre: "Andrés Ruiz",
  correo: "andres@ejemplo.com",
  telefono: "573001234567",
  whatsapp: "573001234567",
  categoria: "extranjeras",
  planId: "cotizacion-extranjera",
  clase: "PLACAS EXTRANJERAS",
  descripcion: "SOLICITAR COTIZACIÓN",
  vehiculo: "camioneta Toyota Hilux 2018",
  precioEur: null,
  precioUsd: null,
  precioBs: null,
  precioCop: null,
  financiamiento: null,
  creadoEn: FieldValue.serverTimestamp(),
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
  `✓ ${MARCAS_INICIALES.length} marcas, ${CATALOGO_INICIAL.length} productos, ${PLANES_RCV_INICIALES.length} transportes RCV, ${celulares.length} + ${clientesRcv.length} clientes con financiamiento y 2 cuentas en ${projectId} (admin: ${CUENTAS_EMULADOR.admin.email})`,
);
process.exit(0);
