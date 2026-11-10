import { describe, expect, test } from "bun:test";
import {
  aFecha,
  CopiaFallida,
  copiarDocumentos,
  type Documentos,
} from "../../lib/db/desde-firestore";
import { baseDePrueba } from "../../lib/db/pruebas";
import * as schema from "../../lib/db/schema";

// Migración al VPS, paso 6: la copia de Firestore a Postgres contra la migración real.
const ts = (iso: string) => ({ toDate: () => new Date(iso) });
const vacio = (): Documentos => ({
  marcas: [],
  productos: [],
  admins: [],
  configuracion: [],
  planesRcv: [],
  solicitudesRcv: [],
  solicitudesCelulares: [],
  solicitudesCitas: [],
  clientesCelulares: [],
  clientesRcv: [],
  suscripcionesPush: [],
});

const cuota = {
  numero: 1,
  vence: "2026-12-01",
  monto: 40,
  pagada: false,
  pagadaEl: null,
};

function documentos(): Documentos {
  const d = vacio();
  d.marcas = [{ id: "HONOR", data: { nombre: "HONOR", actualizadoPor: "u1" } }];
  d.productos = [
    {
      id: "honor-600",
      data: {
        marca: "HONOR",
        nombre: "600",
        variante: "8/256",
        inicial: 125,
        cuota: 40,
        numeroCuotas: 6,
        cantidad: 2,
        activo: true,
        orden: 1,
        actualizadoEn: ts("2026-10-01T12:00:00Z"),
        actualizadoPor: "u1",
      },
    },
    // Marca de antes de D025, sin documento en `marcas`.
    {
      id: "tecno-x",
      data: {
        marca: "TECNO",
        nombre: "X",
        inicial: 1,
        cuota: 1,
        numeroCuotas: 6,
        cantidad: 0,
        activo: false,
        orden: 2,
      },
    },
  ];
  d.admins = [
    { id: "u1", data: { email: "a@b.c" } },
    { id: "fantasma", data: {} },
  ];
  d.configuracion = [
    {
      id: "rcv",
      data: {
        tasaUsd: 1.1,
        requisitosGenerales: ["Cédula"],
        actualizadoPor: "u1",
      },
    },
  ];
  d.planesRcv = [
    {
      id: "moto",
      data: {
        clase: "Moto",
        descripcion: "Hasta 200 cc",
        precioEur: null,
        categorias: ["publico"],
        financiamiento: false,
        activo: true,
        orden: 1,
      },
    },
  ];
  d.solicitudesCitas = [
    {
      id: "c1",
      data: {
        nombre: "Ana",
        whatsapp: "58414",
        estado: "agendada",
        creadoEn: ts("2026-11-01T10:00:00Z"),
      },
    },
  ];
  d.clientesCelulares = [
    {
      id: "cc1",
      data: {
        nombre: "Ana",
        telefono: "0414",
        equipo: "HONOR 600",
        pagos: { inicial: 125, frecuencia: "quincenal", cuotas: [cuota] },
      },
    },
  ];
  d.clientesRcv = [
    {
      id: "cr1",
      data: {
        nombre: "Luis",
        telefono: "0412",
        vehiculo: "Moto",
        emision: "2026-01-01",
        vence: "2027-01-01",
        pagos: null,
      },
    },
  ];
  d.suscripcionesPush = [
    {
      id: "hash1",
      data: {
        endpoint: "https://push.ejemplo.com/1",
        p256dh: "k",
        auth: "a",
        uid: "u1",
        dispositivo: "Chrome",
        creadaEn: ts("2026-10-02T00:00:00Z"),
      },
    },
  ];
  return d;
}

async function baseConUsuario() {
  const db = await baseDePrueba("drizzle");
  await db.insert(schema.user).values({ id: "u1", name: "a", email: "a@b.c" });
  return db;
}

describe("copia de Firestore a Postgres", () => {
  test("copia todo, conserva ids y fechas y crea las marcas que faltan", async () => {
    const db = await baseConUsuario();
    const r = await copiarDocumentos(db, documentos(), new Set(["u1"]));
    expect(r.marcasCreadas).toEqual(["TECNO"]);
    expect(r.omitidos).toEqual([
      {
        coleccion: "admins",
        id: "fantasma",
        motivo: "su usuario no está en la base",
      },
    ]);
    expect(r.porColeccion.productos).toEqual({ documentos: 2, filas: 2 });
    const [p] = await db
      .select()
      .from(schema.productos)
      .orderBy(schema.productos.orden);
    expect(p.id).toBe("honor-600");
    expect(p.actualizadoEn?.toISOString()).toBe("2026-10-01T12:00:00.000Z");
    const [cfg] = await db.select().from(schema.configuracion);
    expect(cfg.valor).toEqual({
      tasaUsd: 1.1,
      requisitosGenerales: ["Cédula"],
    });
    const [s] = await db.select().from(schema.suscripcionesPush);
    expect(s.userId).toBe("u1");
    expect(
      (await db.select().from(schema.admins)).map((a) => a.userId),
    ).toEqual(["u1"]);
  }, 30_000);

  test("un documento que no pasa los CHECK revierte todo y se reporta con su id", async () => {
    const db = await baseConUsuario();
    const d = documentos();
    d.productos[0].data.numeroCuotas = 0;
    d.clientesCelulares[0].data.pagos = { formaVieja: true };
    try {
      await copiarDocumentos(db, d, new Set(["u1"]));
      throw new Error("debió fallar");
    } catch (e) {
      expect(e).toBeInstanceOf(CopiaFallida);
      const ids = (e as CopiaFallida).informe.fallos.map(
        (f) => `${f.coleccion}/${f.id}`,
      );
      expect(ids).toEqual(["productos/honor-600", "clientesCelulares/cc1"]);
    }
    // Nada quedó guardado.
    expect(await db.select().from(schema.marcas)).toHaveLength(0);
    expect(await db.select().from(schema.planesRcv)).toHaveLength(0);
  }, 30_000);

  test("aFecha entiende Timestamp, Date y nada más", () => {
    expect(aFecha(ts("2026-01-01T00:00:00Z"))?.getUTCFullYear()).toBe(2026);
    expect(aFecha(new Date(0))?.getTime()).toBe(0);
    expect(aFecha("2026-01-01")).toBeNull();
  });
});
