import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

/** Cualquier base con este esquema: `pg` en el servidor o PGlite en los tests. */
// biome-ignore lint/suspicious/noExplicitAny: el HKT de resultado varía según el driver.
export type Db = PgDatabase<PgQueryResultHKT, typeof schema, any>;
