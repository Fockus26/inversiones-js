import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { crearAuth } from "../../lib/auth/config";
import { esAdmin } from "../../lib/data/acceso";
import { baseDePrueba } from "../../lib/db/pruebas";
import * as schema from "../../lib/db/schema";
import { sembrar } from "../../lib/db/seed";

// El seed de qa:local (scripts/seed-db.ts) pasa los CHECK de la migración real y deja las dos
// cuentas: una que entra al panel y otra con sesión pero sin acceso.
describe("seed de QA", () => {
  test("carga todo y crea las cuentas con su acceso", async () => {
    const db = await baseDePrueba("drizzle");
    const r = await sembrar(db, {
      admin: { email: "admin@qa.test", password: "clave-admin-123" },
      sinAcceso: { email: "intruso@qa.test", password: "clave-intruso-123" },
    });
    expect(r.productos).toBeGreaterThan(10);
    expect((await db.select().from(schema.productos)).length).toBe(r.productos);
    expect((await db.select().from(schema.solicitudesCitas)).length).toBe(2);

    const auth = crearAuth(db, "http://localhost:3000");
    const admin = await auth.api.signInEmail({
      body: { email: "admin@qa.test", password: "clave-admin-123" },
    });
    const intruso = await auth.api.signInEmail({
      body: { email: "intruso@qa.test", password: "clave-intruso-123" },
    });
    expect(await esAdmin(db, admin.user.id)).toBe(true);
    expect(await esAdmin(db, intruso.user.id)).toBe(false);
    const [u] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, "admin@qa.test"));
    expect(u.emailVerified).toBe(true);
  }, 30_000);
});
