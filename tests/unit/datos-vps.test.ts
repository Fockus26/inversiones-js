import { beforeAll, describe, expect, test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { crearAdmin } from "../../lib/auth/usuarios";
import { ErrorAcceso } from "../../lib/data/acceso-error";
import { ejecutarComo } from "../../lib/data/accion";
import * as catalogo from "../../lib/data/nucleo/catalogo";
import * as clientes from "../../lib/data/nucleo/clientes";
import * as push from "../../lib/data/nucleo/push";
import * as rcv from "../../lib/data/nucleo/rcv";
import * as solicitudes from "../../lib/data/nucleo/solicitudes";
import type { Resultado } from "../../lib/data/resultado";
import * as schema from "../../lib/db/schema";

/**
 * Lo que antes probaba tests/rules contra el emulador (D014), ahora contra la migración real en
 * PGlite: la barrera de acceso (`ejecutarComo`) y lo que valida cada función del núcleo.
 */
const db = drizzle({ client: new PGlite(), schema, casing: "snake_case" });
let uid = "";

const sinSesion = async (): Promise<string> => {
  throw new ErrorAcceso(401);
};
const sinAdmin = async (): Promise<string> => {
  throw new ErrorAcceso(403);
};
const comoAdmin = <T>(fn: (u: string) => Promise<T>) =>
  ejecutarComo(async () => uid, fn);

function codigo<T>(r: Resultado<T>) {
  return r.ok ? "ok" : r.codigo;
}

const producto = {
  marca: "HONOR",
  nombre: "600 Elite",
  variante: "8/256",
  inicial: 125,
  cuota: 40,
  numeroCuotas: 6,
  cantidad: 3,
  activo: true,
};

const cuota = (n: number) => ({
  numero: n,
  vence: "2026-12-01",
  monto: 40,
  pagada: false,
  pagadaEl: null,
});

const clienteCelular = {
  nombre: "Ana",
  cedula: "V-1",
  telefono: "0414",
  equipo: "HONOR 600",
  notas: "",
  pagos: { inicial: 125, frecuencia: "quincenal", cuotas: [cuota(1)] },
};

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
  uid = (await crearAdmin(db, "admin@ejemplo.com")).userId;
}, 30_000);

describe("barrera de acceso (esAdmin de las reglas)", () => {
  test("sin sesión → unauthenticated; sin fila en admins → permission-denied", async () => {
    let llamado = false;
    const fn = async () => {
      llamado = true;
    };
    expect(codigo(await ejecutarComo(sinSesion, fn))).toBe("unauthenticated");
    expect(codigo(await ejecutarComo(sinAdmin, fn))).toBe("permission-denied");
    expect(llamado).toBe(false);
  });

  test("un error de Postgres no conocido no filtra detalles", async () => {
    const r = await comoAdmin(async () => {
      throw new Error("connection refused 10.0.0.1:5432");
    });
    expect(r).toEqual({ ok: false, codigo: "internal" });
  });
});

describe("catálogo", () => {
  test("crear exige la marca registrada (FK) y deja la huella del servidor", async () => {
    const sinMarca = await comoAdmin((u) =>
      catalogo.crearProducto(db, u, producto, 1),
    );
    expect(codigo(sinMarca)).toBe("failed-precondition");
    await catalogo.crearMarca(db, uid, "HONOR");
    const id = await catalogo.crearProducto(db, uid, producto, 1);
    const [p] = await db
      .select()
      .from(schema.productos)
      .where(eq(schema.productos.id, id));
    expect(p.actualizadoPor).toBe(uid);
    expect(p.actualizadoEn).toBeInstanceOf(Date);
  });

  test("rechaza claves de más, tipos malos y rangos fuera de los CHECK", async () => {
    const casos = [
      { ...producto, actualizadoPor: "otro" },
      { ...producto, inicial: "125" },
      { ...producto, numeroCuotas: 49 },
      { ...producto, nombre: "" },
      { ...producto, cantidad: -1 },
    ];
    for (const c of casos) {
      const r = await comoAdmin((u) => catalogo.crearProducto(db, u, c, 2));
      expect(codigo(r)).toBe("invalid-argument");
    }
  });

  test("los enteros se truncan como hacía el panel", async () => {
    const id = await catalogo.crearProducto(
      db,
      uid,
      { ...producto, cantidad: 2.7 },
      3,
    );
    const [p] = await db
      .select()
      .from(schema.productos)
      .where(eq(schema.productos.id, id));
    expect(p.cantidad).toBe(2);
  });

  test("actualizar un producto borrado dice que ya no existe", async () => {
    const r = await comoAdmin((u) =>
      catalogo.actualizarProducto(db, u, "no-existe", { cantidad: 1 }),
    );
    expect(codigo(r)).toBe("not-found");
  });

  test("marca: no se duplica, renombra arrastrando productos y no se borra con productos", async () => {
    expect(
      codigo(await comoAdmin((u) => catalogo.crearMarca(db, u, "HONOR"))),
    ).toBe("already-exists");
    expect(
      codigo(await comoAdmin((u) => catalogo.crearMarca(db, u, "a$b"))),
    ).toBe("invalid-argument");
    await catalogo.crearMarca(db, uid, "TECNO");
    expect(
      codigo(
        await comoAdmin((u) =>
          catalogo.renombrarMarca(db, u, "HONOR", "TECNO"),
        ),
      ),
    ).toBe("already-exists");
    const movidos = await catalogo.renombrarMarca(db, uid, "HONOR", "honor x");
    expect(movidos).toBe(2);
    expect(await catalogo.listarMarcas(db)).toEqual(["HONOR X", "TECNO"]);
    const borrar = await comoAdmin(() => catalogo.borrarMarca(db, "HONOR X"));
    expect(codigo(borrar)).toBe("failed-precondition");
    if (!borrar.ok) expect(borrar.mensaje).toContain("todavía tiene productos");
    await catalogo.borrarMarca(db, "TECNO");
    expect(await catalogo.listarMarcas(db)).toEqual(["HONOR X"]);
  });
});

describe("póliza RCV", () => {
  const plan = {
    clase: "Moto",
    descripcion: "Hasta 200 cc",
    precioEur: 25,
    categorias: ["publico"],
    financiamiento: false,
    activo: true,
  };

  test("planes: categorías permitidas y precio nulo = cotización", async () => {
    await rcv.crearPlanRcv(db, uid, { ...plan, precioEur: null }, 1);
    const r = await comoAdmin((u) =>
      rcv.crearPlanRcv(db, u, { ...plan, categorias: ["otra"] }, 2),
    );
    expect(codigo(r)).toBe("invalid-argument");
    const [p] = await rcv.listarPlanesRcv(db);
    expect(p.precioEur).toBeNull();
  });

  test("configuración: fusiona como merge y quita los requisitos viejos", async () => {
    expect(await rcv.leerConfigRcv(db)).toBeNull();
    await rcv.guardarTasas(db, uid, {
      usd: 1.12,
      bs: 979,
      cop: null,
      fuenteBs: "bcv",
      fuenteUsd: "manual",
      fuenteCop: "manual",
    });
    await db
      .update(schema.configuracion)
      .set({
        valor: {
          tasaUsd: 1.12,
          tasaBs: 979,
          fuenteBs: "bcv",
          requisitos: { publico: ["x"] },
        },
      })
      .where(eq(schema.configuracion.clave, "rcv"));
    await rcv.guardarRequisitos(db, uid, ["Cédula", "Título"]);
    await rcv.guardarRespaldos(db, uid, { tasaBs: 990 });
    const c = await rcv.leerConfigRcv(db);
    expect(c?.tasaUsd).toBe(1.12);
    expect(c?.tasaBs).toBe(990);
    expect(c?.requisitosGenerales).toEqual(["Cédula", "Título"]);
    expect(c && "requisitos" in c).toBe(false);
    expect(c?.actualizadoPor).toBe(uid);
  });

  test("configuración: rechaza tasas fuera de rango y fuentes desconocidas", async () => {
    for (const malo of [
      {
        usd: 0,
        bs: 1,
        cop: null,
        fuenteBs: "bcv",
        fuenteUsd: "manual",
        fuenteCop: "manual",
      },
      {
        usd: 1,
        bs: 1,
        cop: null,
        fuenteBs: "otra",
        fuenteUsd: "manual",
        fuenteCop: "manual",
      },
    ]) {
      expect(
        codigo(await comoAdmin((u) => rcv.guardarTasas(db, u, malo))),
      ).toBe("invalid-argument");
    }
    expect(
      codigo(await comoAdmin((u) => rcv.guardarRequisitos(db, u, []))),
    ).toBe("invalid-argument");
  });
});

describe("clientes con financiamiento", () => {
  test("celular: exige plan de pagos válido y guarda cuotas sin tocar el resto", async () => {
    await clientes.crearClienteCelular(db, uid, clienteCelular);
    const malo = await comoAdmin((u) =>
      clientes.crearClienteCelular(db, u, {
        ...clienteCelular,
        pagos: { inicial: 1, frecuencia: "diaria", cuotas: [cuota(1)] },
      }),
    );
    expect(codigo(malo)).toBe("invalid-argument");
    const {
      clientes: [c],
    } = await clientes.listarClientesCelulares(db);
    await clientes.marcarCuota(db, uid, "clientesCelulares", c.id, 1, true);
    const {
      clientes: [d],
    } = await clientes.listarClientesCelulares(db);
    expect(d.pagos.cuotas[0].pagada).toBe(true);
    expect(d.pagos.cuotas[0].pagadaEl).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(d.pagos.inicial).toBe(125);
    expect(
      codigo(
        await comoAdmin((u) =>
          clientes.marcarCuota(db, u, "clientesCelulares", c.id, 50, true),
        ),
      ),
    ).toBe("failed-precondition");
    expect(
      codigo(
        await comoAdmin((u) =>
          clientes.marcarCuota(
            db,
            u,
            "clientesCelulares",
            "no-existe",
            1,
            true,
          ),
        ),
      ),
    ).toBe("not-found");
    expect(
      codigo(
        await comoAdmin((u) =>
          clientes.marcarCuota(db, u, "clientesCelulares", c.id, 1, "sí"),
        ),
      ),
    ).toBe("invalid-argument");
  });

  test("dos cuotas marcadas seguidas no se pisan, y editar el cliente no deshace un pago", async () => {
    await clientes.crearClienteCelular(db, uid, {
      ...clienteCelular,
      nombre: "Berta",
      pagos: {
        inicial: 0,
        frecuencia: "quincenal",
        cuotas: [cuota(1), cuota(2), cuota(3)],
      },
    });
    const berta = async () =>
      (await clientes.listarClientesCelulares(db)).clientes.find(
        (x) => x.nombre === "Berta",
      );
    const b = await berta();
    if (!b) throw new Error("falta Berta");
    // Lo que tenía abierto el formulario de edición antes de los pagos.
    const vieja = structuredClone(b);
    await Promise.all([
      clientes.marcarCuota(db, uid, "clientesCelulares", b.id, 1, true),
      clientes.marcarCuota(db, uid, "clientesCelulares", b.id, 2, true),
    ]);
    const { id: _, ...campos } = vieja;
    await clientes.actualizarClienteCelular(db, uid, b.id, {
      nombre: campos.nombre,
      cedula: campos.cedula,
      telefono: "0424-0000000",
      equipo: campos.equipo,
      notas: campos.notas,
      pagos: campos.pagos,
    });
    const final = await berta();
    expect(final?.telefono).toBe("0424-0000000");
    expect(final?.pagos.cuotas.map((x) => x.pagada)).toEqual([
      true,
      true,
      false,
    ]);
  });

  test("editar no revive una cuota desmarcada en otra pestaña (QA 2026-11-22)", async () => {
    await clientes.crearClienteCelular(db, uid, {
      ...clienteCelular,
      nombre: "Carla",
      pagos: {
        inicial: 0,
        frecuencia: "quincenal",
        cuotas: [cuota(1), cuota(2)],
      },
    });
    const carla = async () => {
      const c = (await clientes.listarClientesCelulares(db)).clientes.find(
        (x) => x.nombre === "Carla",
      );
      if (!c) throw new Error("falta Carla");
      return c;
    };
    const { id } = await carla();
    await clientes.marcarCuota(db, uid, "clientesCelulares", id, 1, true);
    // El formulario se abre con la cuota 1 pagada…
    const { nombre, cedula, equipo, notas, pagos } = await carla();
    const abierta = { nombre, cedula, equipo, notas, pagos };
    // …y otra pestaña la desmarca (era un error) antes de guardar.
    await clientes.marcarCuota(db, uid, "clientesCelulares", id, 1, false);
    await clientes.actualizarClienteCelular(db, uid, id, {
      ...abierta,
      telefono: "0424-1111111",
    });
    const final = await carla();
    expect(final.telefono).toBe("0424-1111111");
    expect(final.pagos.cuotas.map((x) => [x.pagada, x.pagadaEl])).toEqual([
      [false, null],
      [false, null],
    ]);
  });

  test("el plan de pagos se valida cuota por cuota", async () => {
    const con = (cuotas: unknown[], inicial: unknown = 0) => ({
      ...clienteCelular,
      pagos: { inicial, frecuencia: "quincenal", cuotas },
    });
    for (const malo of [
      con([{ ...cuota(1), numero: "uno" }]),
      con([cuota(1), cuota(1)]),
      con([cuota(2)]),
      con([{ ...cuota(1), monto: -25 }]),
      con([{ ...cuota(1), extra: "<script>" }]),
      con([{ ...cuota(1), pagadaEl: "ayer" }]),
      con([cuota(1)], -10),
    ]) {
      expect(
        codigo(
          await comoAdmin((u) => clientes.crearClienteCelular(db, u, malo)),
        ),
      ).toBe("invalid-argument");
    }
  });

  test("RCV: guardar con la misma emisión no borra el aviso que marcó el bot", async () => {
    const base = {
      nombre: "Rosa",
      cedula: "",
      telefono: "0412",
      correo: "",
      direccion: "",
      vehiculo: "Moto",
      placa: "",
      notas: "",
      emision: "2026-01-10",
      vence: "2027-01-10",
      recordatorio30: false,
      recordatorio3: false,
      pagos: null,
    };
    await clientes.crearClienteRcv(db, uid, base);
    const rosa = async () => {
      const c = (await clientes.listarClientesRcv(db)).clientes.find(
        (x) => x.nombre === "Rosa",
      );
      if (!c) throw new Error("falta Rosa");
      return c;
    };
    const { id } = await rosa();
    // El bot avisa mientras el formulario está abierto con recordatorio30 = false.
    await db
      .update(schema.clientesRcv)
      .set({ recordatorio30: true })
      .where(eq(schema.clientesRcv.id, id));
    await clientes.actualizarClienteRcv(db, uid, id, {
      ...base,
      telefono: "0424-2222222",
    });
    expect((await rosa()).recordatorio30).toBe(true);
    // Otra emisión (renovar) sí los vuelve a dejar en false.
    await clientes.actualizarClienteRcv(db, uid, id, {
      ...base,
      emision: "2026-02-10",
      vence: "2027-02-10",
    });
    expect((await rosa()).recordatorio30).toBe(false);
  });

  test("RCV: emisión y vencimiento van juntos y dentro del rango", async () => {
    const base = {
      nombre: "Luis",
      cedula: "",
      telefono: "0412",
      correo: "",
      direccion: "",
      vehiculo: "Moto",
      placa: "",
      notas: "",
      emision: "2026-01-01",
      vence: "2027-01-01",
      recordatorio30: false,
      recordatorio3: false,
      pagos: null,
    };
    await clientes.crearClienteRcv(db, uid, base);
    for (const malo of [
      { ...base, vence: null },
      { ...base, emision: "1999-01-01" },
      { ...base, vence: "01/01/2027" },
      { ...base, vence: "2025-12-31" },
      { ...base, emision: "2026-02-31" },
    ]) {
      expect(
        codigo(await comoAdmin((u) => clientes.crearClienteRcv(db, u, malo))),
      ).toBe("invalid-argument");
    }
    // Al actualizar, emisión y vencimiento van juntos (una llamada manipulada no deja uno solo).
    const [luis] = (await clientes.listarClientesRcv(db)).clientes;
    for (const malo of [
      { vence: null },
      { emision: "2026-05-01" },
      { emision: "2026-05-01", vence: "2026-04-01" },
    ]) {
      expect(
        codigo(
          await comoAdmin((u) =>
            clientes.actualizarClienteRcv(db, u, luis.id, malo),
          ),
        ),
      ).toBe("invalid-argument");
    }
    // Y el CHECK también lo frena si se salta el servidor.
    await expect(
      (async () => {
        await db
          .update(schema.clientesRcv)
          .set({ vence: null })
          .where(eq(schema.clientesRcv.id, luis.id));
      })(),
    ).rejects.toThrow();
    expect(
      codigo(
        await comoAdmin(() =>
          clientes.borrarCliente(db, "otraTabla" as never, "x"),
        ),
      ),
    ).toBe("invalid-argument");
  });
});

describe("solicitudes y push", () => {
  test("el panel lista las solicitudes más nuevas primero y solo borra", async () => {
    await db.insert(schema.solicitudesCitas).values([
      { nombre: "A", whatsapp: "1", estado: "agendada", creadoEn: new Date(1) },
      { nombre: "B", whatsapp: "2", estado: "agendada", creadoEn: new Date(2) },
    ]);
    const lista = await solicitudes.listarSolicitudesCitas(db);
    expect(lista.map((s) => s.nombre)).toEqual(["B", "A"]);
    await solicitudes.borrarSolicitud(db, "solicitudesCitas", lista[0].id);
    expect(await solicitudes.listarSolicitudesCitas(db)).toHaveLength(1);
    expect(
      codigo(
        await comoAdmin(() => solicitudes.borrarSolicitud(db, "admins", "x")),
      ),
    ).toBe("invalid-argument");
    for (const raro of ["toString", "__proto__", "constructor"])
      expect(
        codigo(
          await comoAdmin(() => solicitudes.borrarSolicitud(db, raro, "x")),
        ),
      ).toBe("invalid-argument");
  });

  test("la suscripción queda a nombre de la sesión, no del cliente", async () => {
    const sub = {
      endpoint: "https://push.ejemplo.com/abc",
      p256dh: "k",
      auth: "a",
      dispositivo: "Chrome en Android",
    };
    const conUid = await comoAdmin((u) =>
      push.guardarSuscripcion(db, u, { ...sub, uid: "otro" }),
    );
    expect(codigo(conUid)).toBe("invalid-argument");
    await push.guardarSuscripcion(db, uid, sub);
    await push.guardarSuscripcion(db, uid, sub);
    const filas = await db.select().from(schema.suscripcionesPush);
    expect(filas).toHaveLength(1);
    expect(filas[0].userId).toBe(uid);
    const http = await comoAdmin((u) =>
      push.guardarSuscripcion(db, u, { ...sub, endpoint: "http://x" }),
    );
    expect(codigo(http)).toBe("invalid-argument");
  });
});
