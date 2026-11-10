/**
 * Importa a Postgres los usuarios exportados de Firebase Auth (migración al VPS, paso 6 y corte),
 * conservando su uid y su contraseña. Todo o nada; se puede repetir sin duplicar.
 *
 *   firebase auth:export usuarios.json --format=json --project <proyecto>
 *   bun run usuarios:importar usuarios.json --base=inversiones_js_dev
 *
 * `usuarios.json` lleva hashes: no se commitea (`.gitignore`) y se borra al terminar.
 * Necesita las variables FIREBASE_HASH_* en el panel para que esos usuarios puedan entrar.
 */
import { readFileSync } from "node:fs";
import { importarUsuarios, type UsuarioFirebase } from "@/lib/auth/usuarios";
import { conectarVps, fallar } from "./conectar-vps";

const USO =
  "Uso: bun run usuarios:importar <usuarios.json> --base=inversiones_js_dev|inversiones_js";

const args = process.argv.slice(2);
const archivo = args.find((a) => !a.startsWith("--"));
if (!archivo) fallar(USO);

const datos = JSON.parse(readFileSync(archivo, "utf8")) as {
  users?: UsuarioFirebase[];
};
if (!Array.isArray(datos.users)) {
  fallar(`${archivo} no tiene "users": ¿es la salida de firebase auth:export?`);
}

const { db, base, cerrar } = await conectarVps(args, USO);
const r = await importarUsuarios(db, datos.users);
await cerrar();

console.log(`Base: ${base} · ${datos.users.length} usuarios en el archivo`);
console.log(`✓ importados: ${r.importados.length}`);
console.log(`  ya existían: ${r.yaExistian.length}`);
for (const o of r.omitidos) console.log(`  omitido ${o.localId}: ${o.motivo}`);
