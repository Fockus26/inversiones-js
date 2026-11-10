/**
 * Da acceso al panel a un correo (D003, D022) en Postgres del VPS: crea (o encuentra) el usuario
 * de Better Auth y su fila en `admins`. Si el usuario es nuevo, le pone una contraseña temporal
 * aleatoria que se imprime UNA sola vez: pásala por un canal privado y pide que la cambie con
 * "¿Olvidaste tu contraseña?".
 *
 *   bun run admin:crear <correo> --base=inversiones_js_dev
 *   bun run admin:crear <correo> --base=inversiones_js          # producción
 */
import { crearAdmin } from "@/lib/auth/usuarios";
import { conectarVps, fallar } from "./conectar-vps";

const USO =
  "Uso: bun run admin:crear <correo> --base=inversiones_js_dev|inversiones_js";

const args = process.argv.slice(2);
const correo = args.find((a) => !a.startsWith("--"));
if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
  fallar(`Falta un correo válido.\n${USO}`);
}

const { db, base, cerrar } = await conectarVps(args, USO);
const r = await crearAdmin(db, correo);
await cerrar();

console.log(`Base: ${base}`);
console.log(
  `✓ ${correo.trim().toLowerCase()} (id ${r.userId}): ${
    r.claveTemporal ? "usuario creado" : "el usuario ya existía"
  }, ${r.yaEraAdmin ? "ya era admin" : "ahora es admin"}.`,
);
console.log(
  r.claveTemporal
    ? `  Contraseña temporal (no se vuelve a mostrar): ${r.claveTemporal}`
    : '  Su contraseña no se tocó. Para cambiarla: "¿Olvidaste tu contraseña?" en el login.',
);
