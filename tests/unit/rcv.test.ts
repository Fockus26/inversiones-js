import { describe, expect, test } from "bun:test";
import { leerRespuestaBcv } from "@/lib/rcv/bcv";
import { cotizar, planesDe, textoPrecio } from "@/lib/rcv/cotizacion";
import {
  consultarEuroMercado,
  leerCurrencyApi,
  leerErApi,
  redondear,
} from "@/lib/rcv/mercado";
import {
  PLANES_RCV_INICIALES,
  TASAS_RCV_INICIALES,
} from "@/lib/rcv/planes-iniciales";
import {
  REQUISITOS_RCV_POR_DEFECTO,
  requisitosEfectivos,
  tasasDe,
} from "@/lib/rcv/tipos";
import {
  lineasDeRequisitos,
  parsearTasa,
  validarPlanRcv,
  validarRequisitos,
  validarTasas,
} from "@/lib/rcv/validacion";

const base = {
  clase: " moto ",
  descripcion: "motocicletas",
  precioEur: "15",
  categorias: ["publico" as const],
  financiamiento: false,
  activo: true,
};

const MANUAL = { bs: "manual", usd: "manual", cop: "manual" } as const;

describe("validarPlanRcv", () => {
  test("normaliza a mayúsculas y precio", () => {
    const r = validarPlanRcv({ ...base, precioEur: "15,50€" });
    expect(r).toEqual({
      ok: true,
      valor: {
        clase: "MOTO",
        descripcion: "MOTOCICLETAS",
        precioEur: 15.5,
        categorias: ["publico"],
        financiamiento: false,
        activo: true,
      },
    });
  });
  test("precio vacío = solicitar cotización", () => {
    const r = validarPlanRcv({ ...base, precioEur: " " });
    expect(r.ok && r.valor.precioEur).toBeNull();
  });
  test("financiamiento solo con transporte público", () => {
    const r = validarPlanRcv({
      ...base,
      categorias: ["privado"],
      financiamiento: true,
    });
    expect(r.ok && r.valor.financiamiento).toBe(false);
  });
  test("errores", () => {
    const r = validarPlanRcv({
      ...base,
      clase: "",
      precioEur: "1.500,00",
      categorias: [],
    });
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(Object.keys(r.errores).sort()).toEqual([
        "categorias",
        "clase",
        "precioEur",
      ]);
  });
});

describe("tasas", () => {
  test("parsearTasa", () => {
    expect(parsearTasa("1,1193")).toBe(1.1193);
    expect(parsearTasa("979.08")).toBe(979.08);
    expect(parsearTasa("1.234,5")).toBeNull();
    expect(parsearTasa("0")).toBeNull();
  });
  test("validarTasas", () => {
    expect(
      validarTasas({ usd: "1,12", bs: "979", cop: "4350" }, MANUAL),
    ).toEqual({
      ok: true,
      valor: { usd: 1.12, bs: 979, cop: 4350 },
    });
    expect(validarTasas({ usd: "", bs: "x", cop: "1" }, MANUAL).ok).toBe(false);
    const sinCop = validarTasas({ usd: "1", bs: "1", cop: "" }, MANUAL);
    expect(sinCop.ok).toBe(false);
    if (!sinCop.ok) expect(Object.keys(sinCop.errores)).toEqual(["cop"]);
  });
  test("validarTasas con fuentes automáticas ignora lo escrito en ellas", () => {
    expect(
      validarTasas(
        { usd: "1,1", bs: "x", cop: "4350" },
        { ...MANUAL, bs: "bcv" },
      ),
    ).toEqual({ ok: true, valor: { usd: 1.1, bs: null, cop: 4350 } });
    expect(
      validarTasas(
        { usd: "", bs: "979", cop: "" },
        { bs: "manual", usd: "mercado", cop: "mercado" },
      ),
    ).toEqual({ ok: true, valor: { usd: null, bs: 979, cop: null } });
  });
  test("tasasDe exige dólares y bolívares; pesos opcionales", () => {
    expect(tasasDe({ tasaUsd: 1.1 })).toBeNull();
    expect(tasasDe({ tasaUsd: 1.1, tasaBs: 900 })).toEqual({
      usd: 1.1,
      bs: 900,
      cop: null,
    });
    expect(tasasDe({ tasaUsd: 1.1, tasaBs: 900, tasaCop: 4350 })?.cop).toBe(
      4350,
    );
  });
  test("tasasDe con BCV usa la consultada y, si falta, la guardada", () => {
    const config = { tasaUsd: 1.1, tasaBs: 900, fuenteBs: "bcv" as const };
    expect(tasasDe(config, { bs: 950 })?.bs).toBe(950);
    expect(tasasDe(config, { bs: null })?.bs).toBe(900);
    // En manual, la del BCV no cuenta.
    expect(tasasDe({ ...config, fuenteBs: "manual" }, { bs: 950 })?.bs).toBe(
      900,
    );
  });
  test("tasasDe con mercado (D036) usa la consultada para $ y COP", () => {
    const config = {
      tasaUsd: 1.1,
      tasaBs: 900,
      tasaCop: 4000,
      fuenteUsd: "mercado" as const,
      fuenteCop: "mercado" as const,
    };
    expect(tasasDe(config, { usd: 1.1175, cop: 3571.84 })).toEqual({
      usd: 1.1175,
      bs: 900,
      cop: 3571.84,
    });
    // API caída: las guardadas.
    expect(tasasDe(config, {})).toEqual({ usd: 1.1, bs: 900, cop: 4000 });
    // Manual: la de mercado no cuenta.
    expect(
      tasasDe({ ...config, fuenteUsd: "manual" }, { usd: 2, cop: 1 }),
    ).toEqual({ usd: 1.1, bs: 900, cop: 1 });
  });
  test("redondeo: $ a 2 decimales, COP a la decena más cercana", () => {
    expect(redondear(1.11923, 3877)).toEqual({ usd: 1.12, cop: 3880 });
    expect(redondear(1.1149, 3864)).toEqual({ usd: 1.11, cop: 3860 });
    expect(redondear(1.12, 3789.95)).toEqual({ usd: 1.12, cop: 3790 });
  });
  test("lee las dos fuentes de mercado y cae a la de respaldo", async () => {
    expect(
      leerErApi({
        result: "success",
        base_code: "EUR",
        time_last_update_unix: 1791849451,
        rates: { USD: 1.117512, COP: 3571.838184 },
      }),
    ).toEqual({ usd: 1.12, cop: 3570, fecha: "2026-10-12T23:57:31.000Z" });
    expect(leerErApi({ result: "error" })).toBeNull();
    expect(
      leerCurrencyApi({
        date: "2026-10-13",
        eur: { usd: 1.1175, cop: 3571.8 },
      }),
    ).toEqual({ usd: 1.12, cop: 3570, fecha: "2026-10-13T00:00:00.000Z" });
    expect(leerCurrencyApi({ eur: { usd: 1 } })).toBeNull();

    const falso = (async (url: string) =>
      url.includes("er-api")
        ? new Response("caído", { status: 503 })
        : Response.json({
            date: "2026-10-13",
            eur: { usd: 1.12, cop: 3600 },
          })) as unknown as typeof fetch;
    expect((await consultarEuroMercado(falso)).usd).toBe(1.12);
    const roto = (async () =>
      new Response("x", { status: 500 })) as unknown as typeof fetch;
    await expect(consultarEuroMercado(roto)).rejects.toThrow("er-api");
  });
  test("leerRespuestaBcv", () => {
    expect(
      leerRespuestaBcv({
        fuente: "oficial",
        promedio: 662.2453,
        fechaActualizacion: "2026-10-13T00:00:00.000Z",
      }),
    ).toEqual({ tasa: 662.2453, fecha: "2026-10-13T00:00:00.000Z" });
    expect(leerRespuestaBcv({ promedio: null, venta: 650 })?.tasa).toBe(650);
    expect(leerRespuestaBcv({ promedio: 0 })).toBeNull();
    expect(leerRespuestaBcv(null)).toBeNull();
  });
});

describe("cotización", () => {
  test("reproduce la tabla del cliente", () => {
    const precios = PLANES_RCV_INICIALES.map((p) =>
      textoPrecio(cotizar(p.precioEur, TASAS_RCV_INICIALES)),
    );
    expect(precios[0]).toBe("15,00 € · 16,79$ · Bs. 14.686,18");
    expect(precios[5]).toBe("114,00 € · 127,60$ · Bs. 111.614,98");
    expect(precios[6]).toBe("131,00 € · 146,63$ · Bs. 128.259,32");
    // Sin precio fijo, el texto pide cotización.
    expect(textoPrecio(cotizar(null, TASAS_RCV_INICIALES))).toBe(
      "Solicitar cotización",
    );
  });
  test("con tasa de pesos los muestra sin céntimos", () => {
    expect(
      textoPrecio(cotizar(15, { ...TASAS_RCV_INICIALES, cop: 4350.4 })),
    ).toBe("15,00 € · 16,79$ · Bs. 14.686,18 · 65.256 COP");
  });
  test("planesDe filtra activos y ordena", () => {
    const planes = PLANES_RCV_INICIALES.map((p) =>
      p.id === "moto" ? { ...p, activo: false } : p,
    );
    expect(planesDe(planes, "privado").map((p) => p.orden)).toEqual([2, 3, 4]);
  });
});

describe("requisitos", () => {
  test("una línea por requisito, sin viñetas", () => {
    expect(lineasDeRequisitos("• Cédula\n\n- RIF  actualizado \n")).toEqual([
      "Cédula",
      "RIF actualizado",
    ]);
  });
  test("una sola lista (D034): al menos un requisito y hasta 20", () => {
    expect(validarRequisitos("  \n").ok).toBe(false);
    expect(validarRequisitos("a\n".repeat(21)).ok).toBe(false);
    expect(validarRequisitos("x".repeat(201)).ok).toBe(false);
    expect(validarRequisitos("Cédula\nTítulo")).toEqual({
      ok: true,
      valor: ["Cédula", "Título"],
    });
  });
  test("sin lista guardada caen los de arranque (también con la de antes por categoría)", () => {
    expect(requisitosEfectivos(null)).toEqual([...REQUISITOS_RCV_POR_DEFECTO]);
    expect(
      requisitosEfectivos({ requisitos: { publico: ["Solo cédula"] } }),
    ).toEqual([...REQUISITOS_RCV_POR_DEFECTO]);
    expect(
      requisitosEfectivos({ requisitosGenerales: ["Solo cédula"] }),
    ).toEqual(["Solo cédula"]);
  });
  test("los de arranque son los que pidió el cliente", () => {
    expect(REQUISITOS_RCV_POR_DEFECTO).toEqual([
      "Fotos de la cédula de identidad",
      "Foto del título o carnet de circulación o certificado de origen",
      "Correo electrónico",
      "Teléfono",
      "Dirección",
    ]);
  });
});
