/**
 * Carga el catálogo del 29/09 (`CATALOGO_INICIAL`) en un proyecto real (D023).
 * NO sobrescribe productos que ya existan (mismo id): así no pisa lo que el cliente haya
 * editado desde el panel. `--forzar` los reescribe enteros (precios, cantidad = 0, activo).
 * Registra en `marcas` (D025) las marcas iniciales y las que ya usen los productos, si faltan;
 * nunca borra ni pisa marcas (ni con `--forzar`): pueden haberse renombrado desde el panel.
 * Póliza RCV (D030): crea los transportes iniciales que falten (mismo id) y las tasas solo si
 * `configuracion/rcv` no existe. `--forzar` reescribe los transportes, nunca las tasas.
 *
 *   bun run seed:produccion --prod                     # proyecto real (GOOGLE_APPLICATION_CREDENTIALS)
 *   bun run seed:produccion --emulador --proyecto=demo-x   # ensayo contra los emuladores
 *
 * Opcional: `--proyecto=<id>` (ver scripts/crear-admin.ts), `--forzar`.
 * Para desarrollo diario usa `bun run seed:emulador`, que además crea cuentas de prueba.
 */
import { readFileSync } from "node:fs";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { CATALOGO_INICIAL } from "@/lib/catalogo/catalogo-inicial";
import {
  COLECCION_MARCAS,
  COLECCION_PRODUCTOS,
  MARCAS_INICIALES,
} from "@/lib/catalogo/tipos";
import { COLECCION_CONFIGURACION } from "@/lib/horario/tipos";
import {
  PLANES_RCV_INICIALES,
  TASAS_RCV_INICIALES,
} from "@/lib/rcv/planes-iniciales";
import { COLECCION_PLANES_RCV, DOC_CONFIG_RCV } from "@/lib/rcv/tipos";

const USO =
  "Uso: bun run seed:produccion (--prod | --emulador) [--proyecto=<id>] [--forzar]";

const args = process.argv.slice(2);
const flag = (nombre: string) => args.includes(`--${nombre}`);
const proyectoArg = args
  .find((a) => a.startsWith("--proyecto="))
  ?.slice("--proyecto=".length);
const forzar = flag("forzar");

function fallar(mensaje: string): never {
  console.error(`✗ ${mensaje}`);
  process.exit(1);
}

const projectId = conectar();
const db = getFirestore();
const coleccion = db.collection(COLECCION_PRODUCTOS);

const refs = CATALOGO_INICIAL.map((p) => coleccion.doc(p.id));
const existentes = new Set(
  (await db.getAll(...refs)).filter((d) => d.exists).map((d) => d.id),
);

const creados: string[] = [];
const sobrescritos: string[] = [];
const omitidos: string[] = [];
const lote = db.batch();
for (const { id, ...producto } of CATALOGO_INICIAL) {
  const existe = existentes.has(id);
  if (existe && !forzar) {
    omitidos.push(id);
    continue;
  }
  lote.set(coleccion.doc(id), {
    ...producto,
    actualizadoEn: FieldValue.serverTimestamp(),
    actualizadoPor: "seed",
  });
  (existe ? sobrescritos : creados).push(id);
}

// Marcas: las iniciales que se van a usar y las de cualquier producto ya cargado.
const marcasUsadas = new Set<string>(MARCAS_INICIALES);
for (const d of (await coleccion.select("marca").get()).docs) {
  const marca = d.get("marca");
  if (typeof marca === "string") marcasUsadas.add(marca);
}
const marcasCol = db.collection(COLECCION_MARCAS);
const marcasExistentes = new Set(
  (await db.getAll(...[...marcasUsadas].map((m) => marcasCol.doc(m))))
    .filter((d) => d.exists)
    .map((d) => d.id),
);
const marcasCreadas: string[] = [];
for (const nombre of marcasUsadas) {
  if (marcasExistentes.has(nombre)) continue;
  lote.set(marcasCol.doc(nombre), {
    nombre,
    actualizadoEn: FieldValue.serverTimestamp(),
    actualizadoPor: "seed",
  });
  marcasCreadas.push(nombre);
}

// Póliza RCV: transportes por id fijo y tasas iniciales si aún no hay configuración.
const planesCol = db.collection(COLECCION_PLANES_RCV);
const planesExistentes = new Set(
  (await db.getAll(...PLANES_RCV_INICIALES.map((p) => planesCol.doc(p.id))))
    .filter((d) => d.exists)
    .map((d) => d.id),
);
let planesEscritos = 0;
for (const { id, ...plan } of PLANES_RCV_INICIALES) {
  if (planesExistentes.has(id) && !forzar) continue;
  lote.set(planesCol.doc(id), {
    ...plan,
    actualizadoEn: FieldValue.serverTimestamp(),
    actualizadoPor: "seed",
  });
  planesEscritos++;
}
const configRcv = db.collection(COLECCION_CONFIGURACION).doc(DOC_CONFIG_RCV);
const tasasCreadas = !(await configRcv.get()).exists;
if (tasasCreadas)
  lote.set(configRcv, {
    tasaUsd: TASAS_RCV_INICIALES.usd,
    tasaBs: TASAS_RCV_INICIALES.bs,
    actualizadoEn: FieldValue.serverTimestamp(),
    actualizadoPor: "seed",
  });

if (
  creados.length +
    sobrescritos.length +
    marcasCreadas.length +
    planesEscritos +
    (tasasCreadas ? 1 : 0) >
  0
)
  await lote.commit();

console.log(`Proyecto: ${projectId}`);
console.log(
  `✓ ${creados.length} creados, ${omitidos.length} ya existían (sin tocar)${
    forzar ? `, ${sobrescritos.length} sobrescritos (--forzar)` : ""
  } de ${CATALOGO_INICIAL.length}.`,
);
console.log(
  `✓ Marcas: ${marcasCreadas.length} registradas${
    marcasCreadas.length > 0 ? ` (${marcasCreadas.join(", ")})` : ""
  }, ${marcasExistentes.size} ya existían.`,
);
console.log(
  `✓ Póliza RCV: ${planesEscritos} transportes escritos de ${PLANES_RCV_INICIALES.length}; tasas ${
    tasasCreadas ? "iniciales creadas" : "ya existían (sin tocar)"
  }.`,
);
if (omitidos.length > 0 && !forzar) {
  console.log(`  Sin tocar: ${omitidos.join(", ")}`);
  console.log("  Para reescribirlos con la lista del 29/09: --forzar.");
}
process.exit(0);

/** Elige emulador o producción y devuelve el projectId (igual que scripts/crear-admin.ts). */
function conectar(): string {
  const emulador = flag("emulador") || !!process.env.FIRESTORE_EMULATOR_HOST;
  if (emulador) {
    if (flag("prod"))
      fallar(
        "--prod con emulador activo (FIRESTORE_EMULATOR_HOST): elige uno.",
      );
    process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
    const id =
      proyectoArg ??
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
      "demo-inversiones-js";
    if (!id.startsWith("demo-"))
      fallar(`Con emulador el proyecto debe ser demo-*; recibí "${id}".`);
    initializeApp({ projectId: id });
    return `${id} (emulador ${process.env.FIRESTORE_EMULATOR_HOST})`;
  }

  if (!flag("prod"))
    fallar(
      `Sin --emulador esto apunta a PRODUCCIÓN: repite con --prod si es lo que quieres.\n${USO}`,
    );
  const credenciales = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credenciales)
    fallar(
      "Falta GOOGLE_APPLICATION_CREDENTIALS (ruta a la clave de la cuenta de servicio).",
    );
  let idDeCuenta: string | undefined;
  try {
    idDeCuenta = JSON.parse(readFileSync(credenciales, "utf8")).project_id;
  } catch {
    fallar(`No pude leer la cuenta de servicio en "${credenciales}".`);
  }
  const id = proyectoArg ?? idDeCuenta;
  if (!id) fallar("No sé el proyecto: pasa --proyecto=<id>.");
  if (id.startsWith("demo-"))
    fallar(`"${id}" es un proyecto de emulador: usa --emulador.`);
  if (idDeCuenta && idDeCuenta !== id)
    fallar(
      `La cuenta de servicio es de "${idDeCuenta}" y pediste "${id}": no coinciden.`,
    );
  initializeApp({ credential: applicationDefault(), projectId: id });
  return `${id} (PRODUCCIÓN)`;
}
