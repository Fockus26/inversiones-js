import { createCipheriv, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Contraseñas importadas de Firebase Auth (migración al VPS, D044). Firebase usa un scrypt
 * modificado: la clave derivada de scrypt(contraseña, sal + separador) cifra con AES-256-CTR
 * (IV en cero) la "signer key" del proyecto, y ese cifrado es el hash guardado.
 *
 * El `account.password` de un usuario importado se guarda como
 * `firebase-scrypt$<sal base64>$<hash base64>`. La próxima vez que cambie su contraseña pasa al
 * formato de Better Auth (`hash` sigue siendo el de Better Auth).
 */
export const PREFIJO_FIREBASE = "firebase-scrypt$";

export interface ParametrosHashFirebase {
  /** base64_signer_key de la consola de Firebase. */
  signerKey: string;
  /** base64_salt_separator. */
  saltSeparator: string;
  rounds: number;
  memCost: number;
}

export function parametrosDesdeEntorno(
  env: Record<string, string | undefined> = process.env,
): ParametrosHashFirebase | null {
  const signerKey = env.FIREBASE_HASH_SIGNER_KEY;
  const saltSeparator = env.FIREBASE_HASH_SALT_SEPARATOR;
  const rounds = Number(env.FIREBASE_HASH_ROUNDS);
  const memCost = Number(env.FIREBASE_HASH_MEM_COST);
  if (!signerKey || !saltSeparator || !rounds || !memCost) return null;
  return { signerKey, saltSeparator, rounds, memCost };
}

export function codificarHashFirebase(salt: string, hash: string): string {
  return `${PREFIJO_FIREBASE}${salt}$${hash}`;
}

function derivar(
  password: string,
  sal: Buffer,
  p: ParametrosHashFirebase,
): Promise<Buffer> {
  const N = 2 ** p.memCost;
  return new Promise((resolve, reject) =>
    scrypt(
      Buffer.from(password, "utf8"),
      sal,
      32,
      { N, r: p.rounds, p: 1, maxmem: 256 * N * p.rounds },
      (e, clave) => (e ? reject(e) : resolve(clave)),
    ),
  );
}

/** Calcula el hash como lo guarda Firebase (base64). Solo para verificar y para los tests. */
export async function hashFirebase(
  password: string,
  saltBase64: string,
  p: ParametrosHashFirebase,
): Promise<string> {
  const sal = Buffer.concat([
    Buffer.from(saltBase64, "base64"),
    Buffer.from(p.saltSeparator, "base64"),
  ]);
  const clave = await derivar(password, sal, p);
  const cifrador = createCipheriv("aes-256-ctr", clave, Buffer.alloc(16, 0));
  return Buffer.concat([
    cifrador.update(Buffer.from(p.signerKey, "base64")),
    cifrador.final(),
  ]).toString("base64");
}

/** true si `password` corresponde al `firebase-scrypt$sal$hash` guardado. */
export async function verificarHashFirebase(
  guardado: string,
  password: string,
  p: ParametrosHashFirebase,
): Promise<boolean> {
  const [sal, hash] = guardado.slice(PREFIJO_FIREBASE.length).split("$");
  if (!sal || !hash) return false;
  const esperado = Buffer.from(hash, "base64");
  const calculado = Buffer.from(await hashFirebase(password, sal, p), "base64");
  return (
    esperado.length === calculado.length && timingSafeEqual(esperado, calculado)
  );
}
