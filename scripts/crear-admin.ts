/**
 * Da acceso al panel a un correo (D003, D022): crea (o encuentra) el usuario en Firebase Auth
 * y crea `admins/{uid}`. Si el usuario es nuevo, le pone una contraseña temporal aleatoria que
 * se imprime UNA sola vez: pásala por un canal privado y pide que la cambie.
 *
 *   bun run admin:crear <correo> --emulador            # emuladores locales (demo-*)
 *   bun run admin:crear <correo> --prod                # proyecto real (GOOGLE_APPLICATION_CREDENTIALS)
 *
 * Opcional: `--proyecto=<id>`. Elección emulador/producción: scripts/conectar-admin.ts.
 */
import { randomBytes } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { COLECCION_ADMINS } from "@/lib/catalogo/tipos";
import { conectar, fallar } from "./conectar-admin";

const USO =
  "Uso: bun run admin:crear <correo> (--emulador | --prod) [--proyecto=<id>]";

const args = process.argv.slice(2);
const email = args
  .find((a) => !a.startsWith("--"))
  ?.trim()
  .toLowerCase();

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  fallar(`Falta un correo válido.\n${USO}`);
}

const projectId = conectar(args, USO);
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
