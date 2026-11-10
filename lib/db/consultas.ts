/**
 * Operadores de Drizzle para quien no tiene `drizzle-orm` en su propio package.json resuelto
 * desde aquí (el bot: en su imagen, lib/ y bot/ comparten un solo node_modules). Importarlos de
 * aquí evita dos copias de drizzle-orm con tipos incompatibles.
 */
export { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
