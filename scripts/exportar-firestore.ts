/**
 * Copia Firestore → Postgres del VPS (migración, pasos 6 y 8 del plan). Todo o nada: si un
 * documento no pasa o una fila releída no coincide, no se guarda nada y se listan todos.
 *
 *   bun run firestore:exportar --proyecto=inversiones-js --seco
 *       ensayo completo en una base en memoria (PGlite): no escribe en ningún lado.
 *   bun run firestore:exportar --proyecto=inversiones-js --base=inversiones_js_dev
 *   bun run firestore:exportar --proyecto=inversiones-js --base=inversiones_js --si-produccion
 *
 * Antes, los usuarios: `bun run usuarios:importar usuarios.json --base=…` (los admins y las
 * suscripciones push de un usuario que no esté en la base se omiten y se reportan). Las tablas de
 * datos de la base de destino tienen que estar vacías.
 *
 * Credenciales de Firestore (solo lectura): GOOGLE_APPLICATION_CREDENTIALS con la clave de una
 * cuenta de servicio, o `gcloud auth application-default login`. Nunca en el repo.
 */
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  COLECCIONES,
  CopiaFallida,
  copiarDocumentos,
  type Documentos,
  type Informe,
  TABLA,
} from "@/lib/db/desde-firestore";
import { baseDePrueba } from "@/lib/db/pruebas";
import * as schema from "@/lib/db/schema";
import { conectarVps, fallar } from "./conectar-vps";

const USO =
  "Uso: bun run firestore:exportar --proyecto=<id> (--seco | --base=inversiones_js_dev | --base=inversiones_js --si-produccion)";

const args = process.argv.slice(2);
const proyecto = args.find((a) => a.startsWith("--proyecto="))?.slice(11);
const seco = args.includes("--seco");
if (!proyecto) fallar(USO);
if (!seco && !args.some((a) => a.startsWith("--base="))) fallar(USO);
if (args.includes("--base=inversiones_js") && !args.includes("--si-produccion"))
  fallar(
    "Producción: añade --si-produccion (solo en el corte, con el sí de César).",
  );

// ── Leer Firestore ─────────────────────────────────────────────────────────────────────────
initializeApp({ credential: applicationDefault(), projectId: proyecto });
const firestore = getFirestore();
const docs = {} as Documentos;
for (const c of COLECCIONES) {
  const snap = await firestore.collection(c).get();
  docs[c] = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
}
const total = COLECCIONES.reduce((n, c) => n + docs[c].length, 0);
console.log(`Firestore ${proyecto}: ${total} documentos`);
for (const c of COLECCIONES) console.log(`  ${c.padEnd(22)} ${docs[c].length}`);

// ── Destino ────────────────────────────────────────────────────────────────────────────────
// biome-ignore lint/suspicious/noExplicitAny: pg o PGlite.
let db: any;
let cerrar = async () => {};
let destino: string;
if (seco) {
  db = await baseDePrueba("drizzle");
  destino = "ensayo en memoria (PGlite)";
  // Los usuarios del export de Auth, si está a mano; si no, los que referencian los datos.
  let ids: string[] = [];
  try {
    const u = JSON.parse(readFileSync("usuarios.json", "utf8")) as {
      users: { localId: string }[];
    };
    ids = u.users.map((x) => x.localId);
  } catch {
    ids = [
      ...docs.admins.map((a) => a.id),
      ...docs.suscripcionesPush.map((s) => String(s.data.uid)),
    ];
  }
  for (const id of new Set(ids))
    await db
      .insert(schema.user)
      .values({ id, name: id, email: `${id}@ensayo.test` })
      .onConflictDoNothing();
} else {
  const c = await conectarVps(args, USO);
  db = c.db;
  cerrar = c.cerrar;
  destino = c.base;
  // Solo sobre tablas vacías: la copia no mezcla con lo que ya hubiera.
  for (const c of COLECCIONES) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(TABLA[c]);
    if (n > 0) {
      await cerrar();
      fallar(
        `${destino}: la tabla de ${c} ya tiene ${n} filas. La copia exige tablas vacías.`,
      );
    }
  }
}

const usuarios = new Set<string>(
  (await db.select({ id: schema.user.id }).from(schema.user)).map(
    (u: { id: string }) => u.id,
  ),
);

function imprimir(r: Informe) {
  for (const [c, v] of Object.entries(r.porColeccion))
    console.log(`  ${c.padEnd(22)} ${v.filas}/${v.documentos}`);
  if (r.marcasCreadas.length)
    console.log(
      `  marcas registradas que faltaban: ${r.marcasCreadas.join(", ")}`,
    );
  for (const o of r.omitidos)
    console.log(`  omitido ${o.coleccion}/${o.id}: ${o.motivo}`);
  for (const f of r.fallos)
    console.log(`  ✗ ${f.coleccion}/${f.id}: ${f.error}`);
  for (const d of r.diferencias)
    console.log(`  ✗ ${d.coleccion}/${d.id}: no coincide al releer`);
}

console.log(`\nDestino: ${destino}`);
try {
  const r = await copiarDocumentos(db, docs, usuarios);
  imprimir(r);
  console.log(
    seco
      ? "\n✓ Ensayo correcto: todo pasaría. No se escribió nada."
      : `\n✓ Copiado y comparado en ${destino}.`,
  );
} catch (e) {
  if (!(e instanceof CopiaFallida)) throw e;
  imprimir(e.informe);
  console.log(`\n✗ ${e.message}`);
  await cerrar();
  process.exit(1);
}
await cerrar();
process.exit(0);
