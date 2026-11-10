import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Conexión a Postgres en el VPS (D044) a través de PgBouncer en modo transacción: nada de
 * estado de sesión entre consultas (`SET`, advisory locks, `LISTEN`). Solo en el servidor
 * (server actions, route handlers, scripts y `bot/`); nunca se importa desde un componente cliente.
 */
function crearPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL (bun run vps:env <base>)");
  const pool = new Pool({ connectionString: url, max: 5 });
  // Sin esto, una conexión ociosa que se cae mata el proceso.
  pool.on("error", (e) => console.error("[db] conexión perdida:", e.message));
  return pool;
}

// En dev, Next recarga módulos: se reutiliza el mismo pool.
const global_ = globalThis as unknown as { __poolInversiones?: Pool };
const pool = global_.__poolInversiones ?? crearPool();
if (process.env.NODE_ENV !== "production") global_.__poolInversiones = pool;

export const db = drizzle({ client: pool, schema, casing: "snake_case" });
export type Db = typeof db;
