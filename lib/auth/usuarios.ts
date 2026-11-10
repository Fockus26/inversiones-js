import { randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { account, admins, user } from "../db/schema";
import type { Db } from "../db/tipos";
import { codificarHashFirebase } from "./hash-firebase";

/** Proveedor de Better Auth para correo + contraseña. */
const CREDENCIAL = "credential";

const idNuevo = () => randomBytes(16).toString("base64url");

/**
 * Crea un usuario con contraseña conocida (seed de QA: `scripts/seed-db.ts`). Si ya existe, no lo
 * toca. Devuelve su id.
 */
export async function crearUsuario(
  db: Db,
  correoCrudo: string,
  password: string,
): Promise<string> {
  const correo = correoCrudo.trim().toLowerCase();
  const [existe] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, correo));
  if (existe) return existe.id;
  const id = idNuevo();
  await db.transaction(async (tx) => {
    await tx
      .insert(user)
      .values({ id, name: correo, email: correo, emailVerified: true });
    await tx.insert(account).values({
      id: idNuevo(),
      accountId: id,
      providerId: CREDENCIAL,
      userId: id,
      password: await hashPassword(password),
    });
  });
  return id;
}

export interface ResultadoAdmin {
  userId: string;
  /** Solo si el usuario se creó ahora: se muestra una vez (D022). */
  claveTemporal: string | null;
  yaEraAdmin: boolean;
}

/** Da acceso al panel a un correo; crea el usuario con contraseña temporal si no existe. */
export async function crearAdmin(
  db: Db,
  correoCrudo: string,
): Promise<ResultadoAdmin> {
  const correo = correoCrudo.trim().toLowerCase();
  return db.transaction(async (tx) => {
    let [fila] = await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, correo));
    let claveTemporal: string | null = null;
    if (!fila) {
      // 18 bytes → 24 caracteres base64url: aleatoria y fácil de copiar.
      claveTemporal = randomBytes(18).toString("base64url");
      const id = idNuevo();
      await tx.insert(user).values({ id, name: correo, email: correo });
      await tx.insert(account).values({
        id: idNuevo(),
        accountId: id,
        providerId: CREDENCIAL,
        userId: id,
        password: await hashPassword(claveTemporal),
      });
      fila = { id };
    }
    const insertados = await tx
      .insert(admins)
      .values({ userId: fila.id })
      .onConflictDoNothing()
      .returning();
    return {
      userId: fila.id,
      claveTemporal,
      yaEraAdmin: insertados.length === 0,
    };
  });
}

/** Un usuario de `firebase auth:export --format=json` (solo los campos que se usan). */
export interface UsuarioFirebase {
  localId: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  passwordHash?: string;
  salt?: string;
  disabled?: boolean;
  createdAt?: string;
}

export interface ResultadoImportacion {
  importados: string[];
  yaExistian: string[];
  omitidos: { localId: string; motivo: string }[];
}

/**
 * Importa los usuarios de Firebase Auth conservando uid y contraseña. Todo o nada (una
 * transacción); se puede repetir: los que ya existen no se tocan.
 */
export async function importarUsuarios(
  db: Db,
  usuarios: UsuarioFirebase[],
): Promise<ResultadoImportacion> {
  const r: ResultadoImportacion = {
    importados: [],
    yaExistian: [],
    omitidos: [],
  };
  await db.transaction(async (tx) => {
    for (const u of usuarios) {
      const correo = u.email?.trim().toLowerCase();
      if (!correo) {
        r.omitidos.push({ localId: u.localId, motivo: "sin correo" });
        continue;
      }
      if (u.disabled) {
        r.omitidos.push({ localId: u.localId, motivo: "deshabilitado" });
        continue;
      }
      if (!u.passwordHash || !u.salt) {
        r.omitidos.push({ localId: u.localId, motivo: "sin contraseña" });
        continue;
      }
      const creado = u.createdAt ? new Date(Number(u.createdAt)) : new Date();
      const nuevos = await tx
        .insert(user)
        .values({
          id: u.localId,
          name: u.displayName?.trim() || correo,
          email: correo,
          emailVerified: Boolean(u.emailVerified),
          createdAt: creado,
          updatedAt: creado,
        })
        .onConflictDoNothing()
        .returning({ id: user.id });
      if (nuevos.length === 0) {
        r.yaExistian.push(u.localId);
        continue;
      }
      await tx.insert(account).values({
        id: idNuevo(),
        accountId: u.localId,
        providerId: CREDENCIAL,
        userId: u.localId,
        password: codificarHashFirebase(u.salt, u.passwordHash),
      });
      r.importados.push(u.localId);
    }
  });
  return r;
}
