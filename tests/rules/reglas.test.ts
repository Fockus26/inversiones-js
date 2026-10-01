/**
 * Tests de firestore.rules (D003) contra el emulador de Firestore YA corriendo en :8080.
 * Usan su propio projectId: las reglas se cargan por proyecto y no pisan `demo-inversiones-js`.
 *
 *   bun run emulators:test
 */
import { afterAll, beforeAll, beforeEach, describe, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  setLogLevel,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { COLECCION_ADMINS, COLECCION_PRODUCTOS } from "@/lib/catalogo/tipos";

const PROYECTO = "demo-reglas-w1";
const ADMIN = "uid-admin";
const OTRO = "uid-sin-acceso";

let entorno: RulesTestEnvironment;

/** Producto válido según productoValido() de las reglas, sin la huella. */
function producto(extra: Record<string, unknown> = {}) {
  return {
    marca: "HONOR",
    nombre: "W1 prueba X9",
    variante: "8/256",
    inicial: 60,
    cuota: 25.5,
    numeroCuotas: 6,
    cantidad: 3,
    activo: true,
    orden: 1,
    ...extra,
  };
}

function huella(uid: string) {
  return { actualizadoPor: uid, actualizadoEn: serverTimestamp() };
}

const dbAnonima = () => entorno.unauthenticatedContext().firestore();
const dbAdmin = () => entorno.authenticatedContext(ADMIN).firestore();
const dbOtro = () => entorno.authenticatedContext(OTRO).firestore();

beforeAll(async () => {
  // Los PERMISSION_DENIED esperados ensucian la salida: solo errores reales.
  setLogLevel("silent");
  entorno = await initializeTestEnvironment({
    projectId: PROYECTO,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync(
        join(import.meta.dir, "../../firestore.rules"),
        "utf8",
      ),
    },
  });
});

beforeEach(async () => {
  await entorno.clearFirestore();
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, COLECCION_ADMINS, ADMIN), { nombre: "Admin" });
    await setDoc(doc(db, COLECCION_PRODUCTOS, "p1"), {
      ...producto(),
      actualizadoPor: ADMIN,
      actualizadoEn: Timestamp.now(),
    });
  });
});

afterAll(async () => {
  await entorno.clearFirestore();
  await entorno.cleanup();
});

describe("productos: lectura", () => {
  test("anónimo no lee", async () => {
    await assertFails(getDoc(doc(dbAnonima(), COLECCION_PRODUCTOS, "p1")));
  });

  test("usuario sin doc admin no lee", async () => {
    await assertFails(getDoc(doc(dbOtro(), COLECCION_PRODUCTOS, "p1")));
  });

  test("admin lee", async () => {
    await assertSucceeds(getDoc(doc(dbAdmin(), COLECCION_PRODUCTOS, "p1")));
  });
});

describe("productos: escritura", () => {
  test("usuario sin doc admin no crea, no actualiza ni borra", async () => {
    const db = dbOtro();
    await assertFails(
      setDoc(doc(db, COLECCION_PRODUCTOS, "p2"), {
        ...producto(),
        ...huella(OTRO),
      }),
    );
    await assertFails(
      updateDoc(doc(db, COLECCION_PRODUCTOS, "p1"), {
        cantidad: 9,
        ...huella(OTRO),
      }),
    );
    await assertFails(deleteDoc(doc(db, COLECCION_PRODUCTOS, "p1")));
  });

  test("anónimo no escribe", async () => {
    await assertFails(
      setDoc(doc(dbAnonima(), COLECCION_PRODUCTOS, "p2"), producto()),
    );
  });

  test("admin crea con huella válida", async () => {
    await assertSucceeds(
      setDoc(doc(dbAdmin(), COLECCION_PRODUCTOS, "p2"), {
        ...producto(),
        ...huella(ADMIN),
      }),
    );
  });

  test("admin actualiza con huella válida", async () => {
    await assertSucceeds(
      updateDoc(doc(dbAdmin(), COLECCION_PRODUCTOS, "p1"), {
        cantidad: 0,
        ...huella(ADMIN),
      }),
    );
  });

  test("admin borra", async () => {
    await assertSucceeds(deleteDoc(doc(dbAdmin(), COLECCION_PRODUCTOS, "p1")));
  });

  test("update sin actualizadoEn == request.time falla", async () => {
    const ref = doc(dbAdmin(), COLECCION_PRODUCTOS, "p1");
    // Sin tocar actualizadoEn: queda la fecha vieja.
    await assertFails(updateDoc(ref, { cantidad: 7, actualizadoPor: ADMIN }));
    // Con una fecha del cliente en vez de serverTimestamp().
    await assertFails(
      updateDoc(ref, {
        cantidad: 7,
        actualizadoPor: ADMIN,
        actualizadoEn: Timestamp.fromMillis(Date.now()),
      }),
    );
  });

  test("huella con el uid de otro falla", async () => {
    await assertFails(
      updateDoc(doc(dbAdmin(), COLECCION_PRODUCTOS, "p1"), {
        cantidad: 7,
        ...huella(OTRO),
      }),
    );
  });

  test("campo extra falla", async () => {
    await assertFails(
      setDoc(doc(dbAdmin(), COLECCION_PRODUCTOS, "p2"), {
        ...producto({ precioSecreto: 1 }),
        ...huella(ADMIN),
      }),
    );
  });

  test("falta un campo obligatorio falla", async () => {
    const { cuota: _cuota, ...sinCuota } = producto();
    await assertFails(
      setDoc(doc(dbAdmin(), COLECCION_PRODUCTOS, "p2"), {
        ...sinCuota,
        ...huella(ADMIN),
      }),
    );
  });

  test("cantidad negativa o decimal falla", async () => {
    for (const cantidad of [-1, 1.5]) {
      await assertFails(
        setDoc(doc(dbAdmin(), COLECCION_PRODUCTOS, "p2"), {
          ...producto({ cantidad }),
          ...huella(ADMIN),
        }),
      );
    }
  });

  test("marca fuera de lista falla", async () => {
    await assertFails(
      setDoc(doc(dbAdmin(), COLECCION_PRODUCTOS, "p2"), {
        ...producto({ marca: "APPLE" }),
        ...huella(ADMIN),
      }),
    );
  });
});

describe("admins", () => {
  test("nadie escribe en admins, ni un admin", async () => {
    await assertFails(setDoc(doc(dbOtro(), COLECCION_ADMINS, OTRO), {}));
    await assertFails(setDoc(doc(dbAdmin(), COLECCION_ADMINS, OTRO), {}));
    await assertFails(deleteDoc(doc(dbAdmin(), COLECCION_ADMINS, ADMIN)));
  });

  test("cada usuario lee solo su propio admins/{uid}", async () => {
    await assertSucceeds(getDoc(doc(dbAdmin(), COLECCION_ADMINS, ADMIN)));
    // El que no es admin puede consultar el suyo (no existe) para saber que no tiene acceso.
    await assertSucceeds(getDoc(doc(dbOtro(), COLECCION_ADMINS, OTRO)));
    await assertFails(getDoc(doc(dbOtro(), COLECCION_ADMINS, ADMIN)));
    await assertFails(getDoc(doc(dbAnonima(), COLECCION_ADMINS, ADMIN)));
  });
});

describe("resto de la base", () => {
  test("cualquier otra colección está cerrada", async () => {
    await assertFails(getDoc(doc(dbAdmin(), "otra", "x")));
    await assertFails(setDoc(doc(dbAdmin(), "otra", "x"), { a: 1 }));
  });
});
