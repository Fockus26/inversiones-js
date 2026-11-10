import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";

/**
 * Base en memoria con la migración real de `drizzle/`, para tests (panel y bot). Vive en lib/db
 * para que el bot use la misma copia de drizzle-orm que el esquema. No la importa código de
 * producción (PGlite es dependencia de desarrollo).
 */
export async function baseDePrueba(carpetaMigraciones: string) {
  const db = drizzle({ client: new PGlite(), schema, casing: "snake_case" });
  await migrate(db, { migrationsFolder: carpetaMigraciones });
  return db;
}
