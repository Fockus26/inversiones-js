import { describe, expect, test } from "bun:test";
import { leerRespuestaBcv } from "@/lib/rcv/bcv";
import { cotizar, planesDe, textoPrecio } from "@/lib/rcv/cotizacion";
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
      validarTasas({ usd: "1,12", bs: "979", cop: "4350" }, "manual"),
    ).toEqual({
      ok: true,
      valor: { usd: 1.12, bs: 979, cop: 4350 },
    });
    expect(validarTasas({ usd: "", bs: "x", cop: "1" }, "manual").ok).toBe(
      false,
    );
    const sinCop = validarTasas({ usd: "1", bs: "1", cop: "" }, "manual");
    expect(sinCop.ok).toBe(false);
    if (!sinCop.ok) expect(Object.keys(sinCop.errores)).toEqual(["cop"]);
  });
  test("validarTasas con BCV ignora los bolívares escritos", () => {
    expect(validarTasas({ usd: "1,1", bs: "x", cop: "4350" }, "bcv")).toEqual({
      ok: true,
      valor: { usd: 1.1, bs: null, cop: 4350 },
    });
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
    expect(tasasDe(config, 950)?.bs).toBe(950);
    expect(tasasDe(config, null)?.bs).toBe(900);
    // En manual, la del BCV no cuenta.
    expect(tasasDe({ ...config, fuenteBs: "manual" }, 950)?.bs).toBe(900);
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
    expect(precios[6]).toBe("Solicitar cotización");
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
  test("cada tipo necesita al menos uno", () => {
    const r = validarRequisitos({
      publico: "a",
      privado: "",
      extranjeras: "c",
    });
    expect(r.ok).toBe(false);
  });
  test("faltantes caen en los provisionales", () => {
    const r = requisitosEfectivos({ requisitos: { publico: ["Solo cédula"] } });
    expect(r.publico).toEqual(["Solo cédula"]);
    expect(r.privado).toEqual(REQUISITOS_RCV_POR_DEFECTO.privado);
  });
});
