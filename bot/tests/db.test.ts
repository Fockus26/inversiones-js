import { beforeAll, describe, expect, mock, test } from "bun:test";
import { join } from "node:path";
import { baseDePrueba } from "../../lib/db/pruebas";
import * as schema from "../../lib/db/schema";

/**
 * Gaby sobre Postgres (migración al VPS): `src/db.ts` contra la migración real en PGlite. El
 * cliente de `lib/db` se sustituye para no abrir conexiones al VPS.
 */
const base = await baseDePrueba(join(import.meta.dir, "..", "..", "drizzle"));
mock.module("../../lib/db/client", () => ({ db: base }));
const bd = await import("../src/db");

const clienteRcv = (vence: string) => ({
  nombre: "Luis",
  telefono: "0412",
  vehiculo: "Moto",
  emision: "2026-01-01",
  vence,
});

beforeAll(async () => {
  await base.insert(schema.marcas).values({ nombre: "HONOR" });
  await base.insert(schema.productos).values([
    {
      marca: "HONOR",
      nombre: "A",
      inicial: 1,
      cuota: 1,
      numeroCuotas: 6,
      cantidad: 1,
      orden: 1,
    },
    {
      marca: "HONOR",
      nombre: "B",
      inicial: 1,
      cuota: 1,
      numeroCuotas: 6,
      cantidad: 0,
      orden: 2,
      activo: false,
    },
  ]);
}, 30_000);

describe("lecturas", () => {
  test("el catálogo trae solo los activos", async () => {
    const lista = await bd.leerCatalogo();
    expect(lista.map((p) => p.nombre)).toEqual(["A"]);
  });

  test("sin configuracion/horario usa el horario por defecto", async () => {
    const h = await bd.leerHorario();
    expect(h.duracionMinutos).toBe(60);
  });
});

describe("escrituras del bot", () => {
  test("las solicitudes se guardan con fecha del servidor", async () => {
    await bd.guardarSolicitudCelular({
      nombre: "Ana",
      whatsapp: "58414",
      equipo: null,
    });
    await bd.guardarSolicitudCita({
      nombre: "Ana",
      whatsapp: "58414",
      estado: "agendada",
      horario: "lun 9:00",
      direccion: null,
    });
    await bd.guardarSolicitudRcv({
      nombre: "Ana",
      correo: "",
      telefono: "58414",
      whatsapp: "58414",
      categoria: "extranjeras",
      planId: "cotizacion-extranjera",
      clase: "",
      descripcion: "",
      vehiculo: "Carro 2020",
      precioEur: null,
      precioUsd: null,
      precioBs: null,
      financiamiento: null,
    });
    const [cita] = await base.select().from(schema.solicitudesCitas);
    expect(cita.creadoEn).toBeInstanceOf(Date);
    const [rcv] = await base.select().from(schema.solicitudesRcv);
    expect(rcv.vehiculo).toBe("Carro 2020");
    expect(rcv.precioCop).toBeNull();
  });

  test("un estado de cita desconocido no entra (CHECK)", async () => {
    await expect(
      bd.guardarSolicitudCita({
        nombre: "x",
        whatsapp: "1",
        estado: "otro" as never,
        horario: null,
        direccion: null,
      }),
    ).rejects.toThrow();
  });

  test("marcar el aviso respeta el vencimiento y no se repite", async () => {
    const [c] = await base
      .insert(schema.clientesRcv)
      .values(clienteRcv("2026-12-01"))
      .returning();
    const porVencer = await bd.clientesRcvPorVencer("2026-11-01", "2026-12-31");
    expect(porVencer.map((x) => x.id)).toContain(c.id);
    // Si el dueño renovó (otra fecha), no se marca.
    expect(await bd.marcarAvisoRcv(c.id, "2027-12-01", "recordatorio30")).toBe(
      false,
    );
    expect(await bd.marcarAvisoRcv(c.id, "2026-12-01", "recordatorio30")).toBe(
      true,
    );
    expect(await bd.marcarAvisoRcv(c.id, "2026-12-01", "recordatorio30")).toBe(
      false,
    );
    // El final marca también el del mes.
    expect(await bd.marcarAvisoRcv(c.id, "2026-12-01", "recordatorio3")).toBe(
      true,
    );
    const [d] = await base.select().from(schema.clientesRcv);
    expect(d.recordatorio3 && d.recordatorio30).toBe(true);
  });

  test("las suscripciones push llegan con el uid y se borran por id", async () => {
    await base
      .insert(schema.user)
      .values({ id: "u1", name: "a", email: "a@b.c" });
    await base.insert(schema.suscripcionesPush).values({
      endpoint: "https://push.ejemplo.com/1",
      p256dh: "k",
      auth: "a",
      userId: "u1",
    });
    const [s] = await bd.suscripcionesPush();
    expect(s.uid).toBe("u1");
    await bd.borrarSuscripcionPush(s.id);
    expect(await bd.suscripcionesPush()).toHaveLength(0);
  });
});

test("baseDeDatos no muestra la contraseña", () => {
  const antes = process.env.DATABASE_URL;
  process.env.DATABASE_URL =
    "postgresql://rol:secreta@10.0.0.1:6432/inversiones_js";
  expect(bd.baseDeDatos()).toBe("10.0.0.1:6432/inversiones_js");
  process.env.DATABASE_URL = antes;
});
