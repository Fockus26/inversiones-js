/**
 * Elección emulador/producción común a los scripts con Admin SDK (`crear-admin.ts`,
 * `seed-produccion.ts`). Se niega ante cualquier ambigüedad:
 *
 * - `--emulador` (o FIRESTORE_EMULATOR_HOST definido): solo proyectos `demo-*`.
 * - Producción exige `--prod`, GOOGLE_APPLICATION_CREDENTIALS y que el proyecto coincida con
 *   el de la cuenta de servicio.
 *
 * `--proyecto=<id>` elige el proyecto (emulador: por defecto NEXT_PUBLIC_FIREBASE_PROJECT_ID o
 * demo-inversiones-js; producción: por defecto el `project_id` de la cuenta de servicio).
 */
import { readFileSync } from "node:fs";
import { applicationDefault, initializeApp } from "firebase-admin/app";

export function fallar(mensaje: string): never {
  console.error(`✗ ${mensaje}`);
  process.exit(1);
}

/** Inicializa firebase-admin y devuelve el proyecto para imprimirlo. */
export function conectar(args: readonly string[], uso: string): string {
  const flag = (nombre: string) => args.includes(`--${nombre}`);
  const proyectoArg = args
    .find((a) => a.startsWith("--proyecto="))
    ?.slice("--proyecto=".length);

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
      `Sin --emulador esto apunta a PRODUCCIÓN: repite con --prod si es lo que quieres.\n${uso}`,
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
