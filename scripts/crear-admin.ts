/**
 * Da acceso al panel a un correo (D003, D022): crea (o encuentra) el usuario en Firebase Auth
 * y crea `admins/{uid}`. Si el usuario es nuevo, le pone una contraseña temporal aleatoria que
 * se imprime UNA sola vez: pásala por un canal privado y pide que la cambie.
 *
 *   bun run admin:crear <correo> --emulador            # emuladores locales (demo-*)
 *   bun run admin:crear <correo> --prod                # proyecto real (GOOGLE_APPLICATION_CREDENTIALS)
 *
 * Opcional: `--proyecto=<id>` (emulador: por defecto NEXT_PUBLIC_FIREBASE_PROJECT_ID o
 * demo-inversiones-js; producción: por defecto el `project_id` de la cuenta de servicio).
 * Sin `--emulador` y sin FIRESTORE_EMULATOR_HOST se considera producción y exige `--prod`.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { COLECCION_ADMINS } from "@/lib/catalogo/tipos";

const USO =
  "Uso: bun run admin:crear <correo> (--emulador | --prod) [--proyecto=<id>]";

const args = process.argv.slice(2);
const email = args
  .find((a) => !a.startsWith("--"))
  ?.trim()
  .toLowerCase();
const flag = (nombre: string) => args.includes(`--${nombre}`);
const proyectoArg = args
  .find((a) => a.startsWith("--proyecto="))
  ?.slice("--proyecto=".length);

function fallar(mensaje: string): never {
  console.error(`✗ ${mensaje}`);
  process.exit(1);
}

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  fallar(`Falta un correo válido.\n${USO}`);
}

const projectId = conectar();
const auth = getAuth();
const db = getFirestore();

let uid: string;
let claveTemporal: string | null = null;
try {
  uid = (await auth.getUserByEmail(email)).uid;
} catch (e) {
  if ((e as { code?: string }).code !== "auth/user-not-found") throw e;
  // 18 bytes → 24 caracteres base64url: aleatoria y fácil de copiar.
  claveTemporal = randomBytes(18).toString("base64url");
  uid = (await auth.createUser({ email, password: claveTemporal })).uid;
}

const refAdmin = db.collection(COLECCION_ADMINS).doc(uid);
const yaEraAdmin = (await refAdmin.get()).exists;
if (!yaEraAdmin) {
  await refAdmin.set({ email, creadoEn: FieldValue.serverTimestamp() });
}

console.log(`Proyecto: ${projectId}`);
console.log(
  `✓ ${email} (uid ${uid}): ${claveTemporal ? "usuario creado" : "el usuario ya existía"}, ${
    yaEraAdmin ? "ya era admin" : "ahora es admin"
  }.`,
);
if (claveTemporal) {
  console.log(
    `  Contraseña temporal (no se vuelve a mostrar): ${claveTemporal}`,
  );
} else {
  console.log(
    "  Su contraseña no se tocó. Para cambiarla: Consola de Firebase › Authentication › Usuarios › Restablecer contraseña.",
  );
}
process.exit(0);

/** Elige emulador o producción y devuelve el projectId. Se niega ante cualquier ambigüedad. */
function conectar(): string {
  const emulador = flag("emulador") || !!process.env.FIRESTORE_EMULATOR_HOST;
  if (emulador) {
    if (flag("prod"))
      fallar(
        "--prod con emulador activo (FIRESTORE_EMULATOR_HOST): elige uno.",
      );
    process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
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
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST)
    fallar(
      "FIREBASE_AUTH_EMULATOR_HOST está definido: quítalo para producción.",
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
