import { describe, expect, test } from "bun:test";
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
    expect(validarTasas("1,12", "979")).toEqual({
      ok: true,
      valor: { usd: 1.12, bs: 979 },
    });
    expect(validarTasas("", "x").ok).toBe(false);
  });
  test("tasasDe exige las dos", () => {
    expect(tasasDe({ tasaUsd: 1.1 })).toBeNull();
    expect(tasasDe({ tasaUsd: 1.1, tasaBs: 900 })).toEqual({
      usd: 1.1,
      bs: 900,
    });
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
