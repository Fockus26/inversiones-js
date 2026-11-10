import { beforeAll, describe, expect, test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../../lib/db/schema";

// D044: la migración de drizzle/ se aplica a una base en memoria, sin Docker ni VPS.
const db = drizzle({ client: new PGlite(), schema, casing: "snake_case" });

const producto = {
  marca: "HONOR",
  nombre: "600 Elite",
  variante: "8/256",
  inicial: 125,
  cuota: 40,
  numeroCuotas: 6,
  cantidad: 3,
  orden: 1,
};

/** Las consultas de Drizzle son thenables, no Promise: se esperan dentro de una función. */
const falla = (consulta: PromiseLike<unknown>) =>
  expect(
    (async () => {
      await consulta;
    })(),
  ).rejects.toThrow();

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.insert(schema.marcas).values({ nombre: "HONOR" });
});

describe("esquema Postgres", () => {
  test("un producto con marca registrada se guarda con id generado", async () => {
    const [fila] = await db
      .insert(schema.productos)
      .values(producto)
      .returning();
    expect(fila.id).toBeString();
    expect(fila.activo).toBe(true);
  });

  test("no acepta un producto de una marca sin registrar", async () => {
    await falla(
      db.insert(schema.productos).values({ ...producto, marca: "NOKIA" }),
    );
  });

  test("renombrar la marca arrastra sus productos", async () => {
    await db
      .update(schema.marcas)
      .set({ nombre: "HONOR X" })
      .where(eq(schema.marcas.nombre, "HONOR"));
    const filas = await db.select().from(schema.productos);
    expect(filas.every((p) => p.marca === "HONOR X")).toBe(true);
  });

  test("no deja borrar una marca con productos", async () => {
    await falla(
      db.delete(schema.marcas).where(eq(schema.marcas.nombre, "HONOR X")),
    );
  });

  test("los límites de las reglas son CHECK", async () => {
    await falla(
      db
        .insert(schema.productos)
        .values({ ...producto, marca: "HONOR X", numeroCuotas: 0 }),
    );
    await falla(db.insert(schema.marcas).values({ nombre: "minúsculas" }));
    await falla(
      db.insert(schema.planesRcv).values({
        clase: "A",
        descripcion: "Moto",
        precioEur: 10,
        categorias: ["otra" as never],
        orden: 1,
      }),
    );
  });
});
