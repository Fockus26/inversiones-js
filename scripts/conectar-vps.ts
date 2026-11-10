/**
 * Conecta un script a una base del VPS por nombre (`--base=inversiones_js_dev`), pidiendo la URL a
 * `kit-db` por SSH sin mostrarla. Obligatorio nombrarla: un script nunca escribe en producción
 * por un `.env` olvidado. Uso: `const { db } = await conectarVps(args, USO)`.
 */
import type { Db } from "@/lib/db/tipos";

export function fallar(mensaje: string): never {
  console.error(mensaje);
  process.exit(1);
}

export async function conectarVps(
  args: string[],
  uso: string,
): Promise<{ db: Db; base: string; cerrar: () => Promise<void> }> {
  const base = args.find((a) => a.startsWith("--base="))?.slice(7);
  if (!base || !/^inversiones_js(_dev|_preview)?$/.test(base)) {
    fallar(
      `Falta --base=inversiones_js_dev | inversiones_js_preview | inversiones_js\n${uso}`,
    );
  }
  const r = Bun.spawnSync([
    "ssh",
    "-o",
    "BatchMode=yes",
    "kit-vps",
    "kit-db",
    "url",
    base,
  ]);
  if (r.exitCode !== 0) {
    fallar(r.stderr.toString().trim() || "ssh kit-vps falló");
  }
  process.env.DATABASE_URL = r.stdout.toString().trim();
  // Import dinámico: el cliente lee DATABASE_URL al cargarse.
  const { db } = await import("@/lib/db/client");
  const { Pool } = await import("pg");
  return {
    db,
    base,
    cerrar: async () => {
      const cliente = (db as unknown as { $client?: InstanceType<typeof Pool> })
        .$client;
      await cliente?.end();
    },
  };
}
