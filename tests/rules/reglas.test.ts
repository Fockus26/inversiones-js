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
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  setLogLevel,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import {
  COLECCION_ADMINS,
  COLECCION_MARCAS,
  COLECCION_PRODUCTOS,
} from "@/lib/catalogo/tipos";
import { generarCuotas } from "@/lib/financiamiento/cuotas";

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
  // Con el emulador recién levantado, cargar las reglas pasa de los 5 s por defecto de bun.
}, 30_000);

beforeEach(async () => {
  await entorno.clearFirestore();
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, COLECCION_ADMINS, ADMIN), { nombre: "Admin" });
    await setDoc(doc(db, COLECCION_MARCAS, "HONOR"), {
      nombre: "HONOR",
      actualizadoPor: ADMIN,
      actualizadoEn: Timestamp.now(),
    });
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

  test("marca no registrada falla al crear y al cambiar de marca", async () => {
    await assertFails(
      setDoc(doc(dbAdmin(), COLECCION_PRODUCTOS, "p2"), {
        ...producto({ marca: "APPLE" }),
        ...huella(ADMIN),
      }),
    );
    await assertFails(
      updateDoc(doc(dbAdmin(), COLECCION_PRODUCTOS, "p1"), {
        marca: "APPLE",
        ...huella(ADMIN),
      }),
    );
  });

  test("producto de antes de D025 (marca sin documento) se sigue editando", async () => {
    await entorno.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), COLECCION_PRODUCTOS, "viejo"), {
        ...producto({ marca: "TECNO" }),
        actualizadoPor: ADMIN,
        actualizadoEn: Timestamp.now(),
      });
    });
    await assertSucceeds(
      updateDoc(doc(dbAdmin(), COLECCION_PRODUCTOS, "viejo"), {
        cantidad: 4,
        ...huella(ADMIN),
      }),
    );
  });
});

describe("marcas", () => {
  const marca = (nombre: string, uid = ADMIN) => ({
    nombre,
    ...huella(uid),
  });

  test("admin lee; anónimo y sin acceso no", async () => {
    await assertSucceeds(getDoc(doc(dbAdmin(), COLECCION_MARCAS, "HONOR")));
    await assertFails(getDoc(doc(dbOtro(), COLECCION_MARCAS, "HONOR")));
    await assertFails(getDoc(doc(dbAnonima(), COLECCION_MARCAS, "HONOR")));
  });

  test("admin crea una marca nueva y luego un producto con ella", async () => {
    const db = dbAdmin();
    await assertSucceeds(
      setDoc(doc(db, COLECCION_MARCAS, "MOTOROLA"), marca("MOTOROLA")),
    );
    await assertSucceeds(
      setDoc(doc(db, COLECCION_PRODUCTOS, "p2"), {
        ...producto({ marca: "MOTOROLA" }),
        ...huella(ADMIN),
      }),
    );
  });

  test("sin acceso no crea ni borra marcas", async () => {
    await assertFails(
      setDoc(
        doc(dbOtro(), COLECCION_MARCAS, "MOTOROLA"),
        marca("MOTOROLA", OTRO),
      ),
    );
    await assertFails(deleteDoc(doc(dbOtro(), COLECCION_MARCAS, "HONOR")));
  });

  test("nombre distinto del id, minúsculas, campo extra o sin huella fallan", async () => {
    const db = dbAdmin();
    await assertFails(setDoc(doc(db, COLECCION_MARCAS, "ZTE"), marca("NOKIA")));
    await assertFails(setDoc(doc(db, COLECCION_MARCAS, "zte"), marca("zte")));
    await assertFails(
      setDoc(doc(db, COLECCION_MARCAS, "ZTE"), { ...marca("ZTE"), extra: 1 }),
    );
    await assertFails(
      setDoc(doc(db, COLECCION_MARCAS, "ZTE"), { nombre: "ZTE" }),
    );
  });

  test("no se sobrescribe una marca existente", async () => {
    await assertFails(
      setDoc(doc(dbAdmin(), COLECCION_MARCAS, "HONOR"), marca("HONOR")),
    );
  });

  test("renombrar en lote: crea la nueva, mueve el producto y borra la vieja", async () => {
    const db = dbAdmin();
    const lote = writeBatch(db);
    lote.set(doc(db, COLECCION_MARCAS, "HONOR X"), marca("HONOR X"));
    lote.update(doc(db, COLECCION_PRODUCTOS, "p1"), {
      marca: "HONOR X",
      ...huella(ADMIN),
    });
    lote.delete(doc(db, COLECCION_MARCAS, "HONOR"));
    await assertSucceeds(lote.commit());
  });

  test("admin borra una marca", async () => {
    await assertSucceeds(deleteDoc(doc(dbAdmin(), COLECCION_MARCAS, "HONOR")));
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

describe("póliza RCV (D030)", () => {
  function plan(extra: Record<string, unknown> = {}) {
    return {
      clase: "MOTO",
      descripcion: "MOTOCICLETAS",
      precioEur: 15,
      categorias: ["privado", "publico"],
      financiamiento: false,
      activo: true,
      orden: 1,
      ...extra,
    };
  }

  test("admin crea, edita y borra transportes; sin acceso no", async () => {
    const ref = doc(dbAdmin(), "planesRcv", "moto");
    await assertSucceeds(setDoc(ref, { ...plan(), ...huella(ADMIN) }));
    await assertSucceeds(updateDoc(ref, { precioEur: null, ...huella(ADMIN) }));
    await assertFails(getDoc(doc(dbOtro(), "planesRcv", "moto")));
    await assertFails(
      setDoc(doc(dbOtro(), "planesRcv", "x"), { ...plan(), ...huella(OTRO) }),
    );
    await assertSucceeds(deleteDoc(ref));
  });

  test("transporte inválido falla", async () => {
    const col = (id: string) => doc(dbAdmin(), "planesRcv", id);
    for (const [id, malo] of [
      ["a", plan({ categorias: [] })],
      ["b", plan({ categorias: ["aereo"] })],
      ["c", plan({ precioEur: -1 })],
      ["d", plan({ precioEur: "15" })],
      ["e", plan({ clase: "" })],
      ["f", plan({ extra: 1 })],
    ] as const)
      await assertFails(setDoc(col(id), { ...malo, ...huella(ADMIN) }));
    await assertFails(setDoc(col("g"), plan()));
  });

  test("configuracion/rcv: tasas y requisitos por separado", async () => {
    const ref = doc(dbAdmin(), "configuracion", "rcv");
    await assertSucceeds(
      setDoc(ref, { tasaUsd: 1.12, tasaBs: 979.08, ...huella(ADMIN) }),
    );
    // Antes de D034: requisitos por categoría. Siguen permitidos mientras existan.
    await assertSucceeds(
      setDoc(
        ref,
        {
          requisitos: { publico: ["a"], privado: ["b"], extranjeras: ["c"] },
          ...huella(ADMIN),
        },
        { merge: true },
      ),
    );
    // D034: una sola lista; al guardarla se borra la de antes.
    await assertSucceeds(
      setDoc(
        ref,
        {
          requisitosGenerales: ["Cédula", "Título"],
          requisitos: deleteField(),
          ...huella(ADMIN),
        },
        { merge: true },
      ),
    );
    await assertFails(
      setDoc(
        ref,
        { requisitosGenerales: [], ...huella(ADMIN) },
        { merge: true },
      ),
    );
    await assertSucceeds(
      setDoc(
        ref,
        { tasaCop: 4350, fuenteBs: "bcv", ...huella(ADMIN) },
        { merge: true },
      ),
    );
    await assertFails(setDoc(ref, { tasaUsd: 0, ...huella(ADMIN) }));
    await assertFails(setDoc(ref, { tasaCop: 0, ...huella(ADMIN) }));
    await assertFails(setDoc(ref, { fuenteBs: "otra", ...huella(ADMIN) }));
    await assertSucceeds(
      setDoc(
        ref,
        { fuenteUsd: "mercado", fuenteCop: "manual", ...huella(ADMIN) },
        { merge: true },
      ),
    );
    await assertFails(
      setDoc(ref, { fuenteUsd: "google", ...huella(ADMIN) }, { merge: true }),
    );
    await assertFails(
      setDoc(ref, {
        requisitosGenerales: Array(21).fill("x"),
        ...huella(ADMIN),
      }),
    );
    await assertFails(setDoc(ref, { otra: 1, ...huella(ADMIN) }));
    await assertFails(deleteDoc(ref));
    await assertFails(getDoc(doc(dbOtro(), "configuracion", "rcv")));
    // El resto de configuracion (horario) sigue cerrado al panel.
    await assertFails(getDoc(doc(dbAdmin(), "configuracion", "horario")));
  });

  // D043: las tres colecciones de solicitudes del chat tienen las mismas reglas.
  for (const coleccion of [
    "solicitudesRcv",
    "solicitudesCelulares",
    "solicitudesCitas",
  ]) {
    test(`${coleccion}: admin lee y borra, nadie las crea desde el cliente`, async () => {
      await entorno.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), coleccion, "s1"), {
          nombre: "Ana",
        });
      });
      await assertSucceeds(getDoc(doc(dbAdmin(), coleccion, "s1")));
      await assertFails(getDoc(doc(dbOtro(), coleccion, "s1")));
      await assertFails(
        setDoc(doc(dbAdmin(), coleccion, "s2"), { nombre: "x" }),
      );
      await assertFails(
        updateDoc(doc(dbAdmin(), coleccion, "s1"), { nombre: "x" }),
      );
      await assertFails(deleteDoc(doc(dbOtro(), coleccion, "s1")));
      await assertSucceeds(deleteDoc(doc(dbAdmin(), coleccion, "s1")));
    });
  }
});

describe("clientes con financiamiento (D032)", () => {
  const pagos = () => ({
    inicial: 60,
    frecuencia: "quincenal",
    cuotas: generarCuotas(25, 6, "quincenal", "2026-10-28"),
  });
  const celular = (extra: Record<string, unknown> = {}) => ({
    nombre: "María Pérez",
    cedula: "V-1",
    telefono: "0414-1234567",
    equipo: "HONOR 600",
    notas: "",
    pagos: pagos(),
    ...extra,
  });
  const rcv = (extra: Record<string, unknown> = {}) => ({
    nombre: "José Rodríguez",
    cedula: "",
    telefono: "0412-7654321",
    correo: "",
    direccion: "",
    vehiculo: "TAXI",
    placa: "AB123CD",
    notas: "",
    emision: "2026-01-15",
    vence: "2027-01-15",
    recordatorio30: false,
    recordatorio3: false,
    pagos: null,
    ...extra,
  });

  test("admin crea, marca cuotas y borra; sin acceso ni lee", async () => {
    const ref = doc(dbAdmin(), "clientesCelulares", "c1");
    await assertSucceeds(setDoc(ref, { ...celular(), ...huella(ADMIN) }));
    const cuotas = pagos().cuotas.map((c, i) =>
      i === 0 ? { ...c, pagada: true, pagadaEl: "2026-10-28" } : c,
    );
    await assertSucceeds(
      updateDoc(ref, { "pagos.cuotas": cuotas, ...huella(ADMIN) }),
    );
    await assertFails(getDoc(doc(dbOtro(), "clientesCelulares", "c1")));
    await assertFails(
      setDoc(doc(dbOtro(), "clientesCelulares", "c2"), {
        ...celular(),
        ...huella(OTRO),
      }),
    );
    await assertFails(updateDoc(ref, { "pagos.cuotas": cuotas }));
    await assertSucceeds(deleteDoc(ref));
  });

  test("cliente de celular inválido falla", async () => {
    const col = (id: string) => doc(dbAdmin(), "clientesCelulares", id);
    for (const [id, malo] of [
      ["a", celular({ nombre: "" })],
      ["b", celular({ equipo: "" })],
      ["c", celular({ extra: 1 })],
      ["d", celular({ pagos: { ...pagos(), frecuencia: "diaria" } })],
      ["e", celular({ pagos: { ...pagos(), cuotas: [] } })],
      ["f", celular({ pagos: { ...pagos(), inicial: -1 } })],
      ["g", celular({ pagos: null })],
    ] as const)
      await assertFails(setDoc(col(id), { ...malo, ...huella(ADMIN) }));
  });

  test("póliza: con o sin emisión, de contado o financiada", async () => {
    const col = (id: string) => doc(dbAdmin(), "clientesRcv", id);
    await assertSucceeds(setDoc(col("a"), { ...rcv(), ...huella(ADMIN) }));
    await assertSucceeds(
      setDoc(col("b"), {
        ...rcv({ emision: null, vence: null }),
        ...huella(ADMIN),
      }),
    );
    await assertSucceeds(
      setDoc(col("c"), { ...rcv({ pagos: pagos() }), ...huella(ADMIN) }),
    );
    // Renovar: nuevas fechas y avisos a cero.
    await assertSucceeds(
      updateDoc(col("a"), {
        emision: "2027-01-15",
        vence: "2028-01-15",
        recordatorio30: false,
        recordatorio3: false,
        ...huella(ADMIN),
      }),
    );
    for (const [id, malo] of [
      ["d", rcv({ emision: "15/01/2026" })],
      ["e", rcv({ vence: null })],
      ["f", rcv({ recordatorio30: "si" })],
      ["g", rcv({ vehiculo: "" })],
      ["h", rcv({ placa: "X".repeat(13) })],
      // D042: año de dos dígitos tecleado en el selector de fecha.
      ["i", rcv({ emision: "0026-10-28", vence: "0027-10-28" })],
    ] as const)
      await assertFails(setDoc(col(id), { ...malo, ...huella(ADMIN) }));
    await assertFails(getDoc(doc(dbOtro(), "clientesRcv", "a")));
  });
});

describe("suscripciones push (D035)", () => {
  const sub = (uid: string, extra: Record<string, unknown> = {}) => ({
    endpoint: "https://fcm.googleapis.com/fcm/send/abc",
    p256dh: "clave",
    auth: "secreto",
    uid,
    dispositivo: "Chrome en Android",
    creadaEn: serverTimestamp(),
    ...extra,
  });

  test("el admin guarda la suya y la borra; nadie más", async () => {
    const ref = doc(dbAdmin(), "suscripcionesPush", "s1");
    await assertSucceeds(setDoc(ref, sub(ADMIN)));
    await assertSucceeds(getDoc(ref));
    await assertFails(
      setDoc(doc(dbAdmin(), "suscripcionesPush", "s2"), sub(OTRO)),
    );
    await assertFails(
      setDoc(
        doc(dbAdmin(), "suscripcionesPush", "s3"),
        sub(ADMIN, { endpoint: "http://x" }),
      ),
    );
    await assertFails(
      setDoc(
        doc(dbAdmin(), "suscripcionesPush", "s4"),
        sub(ADMIN, { extra: 1 }),
      ),
    );
    await assertFails(
      setDoc(doc(dbOtro(), "suscripcionesPush", "s5"), sub(OTRO)),
    );
    await assertFails(getDoc(doc(dbOtro(), "suscripcionesPush", "s1")));
    await assertSucceeds(deleteDoc(ref));
  });
});
