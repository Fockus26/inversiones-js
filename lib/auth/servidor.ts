import { db } from "../db/client";
import { crearAuth } from "./config";

/** Instancia de Better Auth del panel, sobre Postgres en el VPS. Solo en el servidor. */
export const auth = crearAuth(db);
export { RUTA_RESTABLECER } from "./config";
