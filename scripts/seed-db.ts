/**
 * Seed de QA sobre Postgres: lo ejecuta `bun run qa:local` (kit) contra su base en Docker, con
 * DATABASE_URL de esa base. Crea las cuentas de `.env.test.local` (el panel no tiene registro
 * público: `scripts/qa-roles.ts` › existingAccount). Datos en `lib/db/seed.ts`.
 *
 * Se niega a correr contra el VPS: nunca siembra datos de prueba en una base real.
 */
import { readFileSync } from "node:fs";
import { sembrar } from "@/lib/db/seed";

const url = process.env.DATABASE_URL ?? "";
const host = (() => {
  try {
    return new URL(url);
  } catch {
    return null;
  }
})();
if (
  !host ||
  !["127.0.0.1", "localhost", "::1"].includes(host.hostname) ||
  ["6432", "5433"].includes(host.port)
) {
  console.error(
    "seed-db solo corre contra una base local (la de qa:local). DATABASE_URL apunta a otra.",
  );
  process.exit(1);
}

function leerEnvTest(): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync(".env.test.local", "utf8")
        .split(/\r?\n/)
        .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
        .filter((m): m is RegExpMatchArray => m !== null)
        .map((m) => [m[1], m[2].trim()]),
    );
  } catch {
    return {};
  }
}

const e = leerEnvTest();
const cuenta = (email?: string, password?: string) =>
  email && password ? { email, password } : undefined;

const { db } = await import("@/lib/db/client");
const r = await sembrar(db, {
  admin: cuenta(e.ADMIN_EMAIL_TEST, e.ADMIN_PASSWORD_TEST),
  sinAcceso: cuenta(e.EMAIL_TEST, e.PASSWORD_TEST),
});
console.log(
  `✓ ${r.marcas} marcas, ${r.productos} productos, ${r.planes} transportes RCV, ${r.clientes} clientes y las cuentas de .env.test.local`,
);
process.exit(0);
