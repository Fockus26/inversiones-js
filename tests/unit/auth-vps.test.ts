import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { crearAuth } from "../../lib/auth/config";
import { MAX_FALLOS } from "../../lib/auth/intentos";
import { crearAdmin, importarUsuarios } from "../../lib/auth/usuarios";
import * as schema from "../../lib/db/schema";

// Migración al VPS, paso 2: Better Auth sobre la migración real, en memoria.
const db = drizzle({ client: new PGlite(), schema, casing: "snake_case" });
const auth = crearAuth(db, "http://localhost:3000");

// Vector público de github.com/firebase/scrypt: "user1password" con esta sal y hash.
const ENTORNO_ANTERIOR = { ...process.env };
const FIREBASE = {
  localId: "uidFirebase0000000001",
  email: "Dueno@Ejemplo.com",
  emailVerified: true,
  salt: "42xEC+ixf3L2lw==",
  passwordHash:
    "lSrfV15cpx95/sZS2W9c9Kp6i/LVgQNDNC/qzrCnh1SAyZvqmZqAjTdn3aoItz+VHjoZilo78198JAdRuid5lQ==",
};

const entrar = (email: string, password: string) =>
  auth.api.signInEmail({ body: { email, password } });

beforeAll(async () => {
  Object.assign(process.env, {
    FIREBASE_HASH_SIGNER_KEY:
      "jxspr8Ki0RYycVU8zykbdLGjFQ3McFUH0uiiTvC8pVMXAn210wjLNmdZJzxUECKbm0QsEmYUSDzZvpjeJ9WmXA==",
    FIREBASE_HASH_SALT_SEPARATOR: "Bw==",
    FIREBASE_HASH_ROUNDS: "8",
    FIREBASE_HASH_MEM_COST: "14",
  });
  await migrate(db, { migrationsFolder: "drizzle" });
}, 30_000);

afterAll(() => {
  process.env = ENTORNO_ANTERIOR;
});

describe("importar usuarios de Firebase", () => {
  test("conserva el uid y no duplica al repetir", async () => {
    const lista = [
      FIREBASE,
      { localId: "sinClave", email: "x@ejemplo.com" },
      {
        localId: "baja",
        email: "y@ejemplo.com",
        disabled: true,
        salt: "a",
        passwordHash: "b",
      },
    ];
    const r1 = await importarUsuarios(db, lista);
    expect(r1.importados).toEqual([FIREBASE.localId]);
    expect(r1.omitidos.map((o) => o.motivo)).toEqual([
      "sin contraseña",
      "deshabilitado",
    ]);
    const r2 = await importarUsuarios(db, [FIREBASE]);
    expect(r2.yaExistian).toEqual([FIREBASE.localId]);
    const [u] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, FIREBASE.localId));
    expect(u.email).toBe("dueno@ejemplo.com");
  });

  test("entra con su contraseña de Firebase", async () => {
    const r = await entrar("dueno@ejemplo.com", "user1password");
    expect(r.user.id).toBe(FIREBASE.localId);
  });

  test("rechaza otra contraseña", async () => {
    await expect(
      entrar("dueno@ejemplo.com", "otra-clave-123"),
    ).rejects.toThrow();
  });
});

describe("admins", () => {
  test("crea el usuario con clave temporal que sirve para entrar", async () => {
    const r = await crearAdmin(db, " Nuevo@Ejemplo.com ");
    expect(r.claveTemporal).toHaveLength(24);
    expect(r.yaEraAdmin).toBe(false);
    const sesion = await entrar("nuevo@ejemplo.com", r.claveTemporal ?? "");
    expect(sesion.user.id).toBe(r.userId);
  });

  test("dar acceso a un usuario existente no toca su contraseña", async () => {
    const r = await crearAdmin(db, "dueno@ejemplo.com");
    expect(r.claveTemporal).toBeNull();
    expect(r.userId).toBe(FIREBASE.localId);
    expect((await crearAdmin(db, "dueno@ejemplo.com")).yaEraAdmin).toBe(true);
  });

  test("no hay registro público", async () => {
    await expect(
      auth.api.signUpEmail({
        body: {
          email: "intruso@ejemplo.com",
          password: "clave-segura-1",
          name: "x",
        },
      }),
    ).rejects.toThrow();
  });
});

describe("límite por cuenta", () => {
  test(`tras ${MAX_FALLOS} fallos la cuenta se bloquea aunque la clave sea buena`, async () => {
    const { claveTemporal } = await crearAdmin(db, "bloqueo@ejemplo.com");
    for (let i = 0; i < MAX_FALLOS; i++) {
      await entrar("bloqueo@ejemplo.com", "mala-clave-000").catch(() => {});
    }
    try {
      await entrar("bloqueo@ejemplo.com", claveTemporal ?? "");
      throw new Error("debió bloquear");
    } catch (e) {
      expect((e as { status?: string }).status).toBe("TOO_MANY_REQUESTS");
    }
  });

  test("un acierto reinicia la cuenta de fallos", async () => {
    const { claveTemporal } = await crearAdmin(db, "reinicio@ejemplo.com");
    for (let i = 0; i < MAX_FALLOS - 1; i++) {
      await entrar("reinicio@ejemplo.com", "mala-clave-000").catch(() => {});
    }
    await entrar("reinicio@ejemplo.com", claveTemporal ?? "");
    const filas = await db
      .select()
      .from(schema.intentosLogin)
      .where(eq(schema.intentosLogin.correo, "reinicio@ejemplo.com"));
    expect(filas).toHaveLength(0);
  });
});
