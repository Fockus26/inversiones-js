import { describe, expect, test } from "bun:test";
import {
  codificarHashFirebase,
  hashFirebase,
  parametrosDesdeEntorno,
  verificarHashFirebase,
} from "../../lib/auth/hash-firebase";

// Vector público del README de github.com/firebase/scrypt (no es la clave del proyecto).
const P = {
  signerKey:
    "jxspr8Ki0RYycVU8zykbdLGjFQ3McFUH0uiiTvC8pVMXAn210wjLNmdZJzxUECKbm0QsEmYUSDzZvpjeJ9WmXA==",
  saltSeparator: "Bw==",
  rounds: 8,
  memCost: 14,
};
const SAL = "42xEC+ixf3L2lw==";
const HASH =
  "lSrfV15cpx95/sZS2W9c9Kp6i/LVgQNDNC/qzrCnh1SAyZvqmZqAjTdn3aoItz+VHjoZilo78198JAdRuid5lQ==";

describe("hash de Firebase Auth", () => {
  test("reproduce el vector de referencia de Firebase", async () => {
    expect(await hashFirebase("user1password", SAL, P)).toBe(HASH);
  });

  test("acepta la contraseña correcta y rechaza otra", async () => {
    const guardado = codificarHashFirebase(SAL, HASH);
    expect(await verificarHashFirebase(guardado, "user1password", P)).toBe(
      true,
    );
    expect(await verificarHashFirebase(guardado, "user1Password", P)).toBe(
      false,
    );
    expect(await verificarHashFirebase("firebase-scrypt$", "x", P)).toBe(false);
  });

  test("lee los parámetros del entorno solo si están todos", () => {
    expect(parametrosDesdeEntorno({})).toBeNull();
    expect(
      parametrosDesdeEntorno({
        FIREBASE_HASH_SIGNER_KEY: "a",
        FIREBASE_HASH_SALT_SEPARATOR: "Bw==",
        FIREBASE_HASH_ROUNDS: "8",
        FIREBASE_HASH_MEM_COST: "14",
      }),
    ).toEqual({
      signerKey: "a",
      saltSeparator: "Bw==",
      rounds: 8,
      memCost: 14,
    });
  });
});
