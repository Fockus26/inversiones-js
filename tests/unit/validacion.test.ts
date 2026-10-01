import { describe, expect, test } from "bun:test";
import {
  formatearCuota,
  formatearMonto,
  haceCuanto,
  normalizarBusqueda,
} from "@/components/catalogo/formato";
import {
  type FormularioProducto,
  parsearEntero,
  parsearMonto,
  validarCantidad,
  validarProducto,
  varianteConFormatoSugerido,
} from "@/lib/catalogo/validacion";

const base: FormularioProducto = {
  marca: "HONOR",
  nombre: "600 Elite",
  variante: "8/256",
  inicial: "125",
  cuota: "63",
  numeroCuotas: "6",
  cantidad: "3",
  activo: true,
};

describe("parsearMonto", () => {
  test.each([
    ["125", 125],
    ["125,50", 125.5],
    ["125.5", 125.5],
    ["125$", 125],
    [" 63 ", 63],
    ["$ 63", 63],
    ["0", 0],
  ])("%p → %p", (entrada, esperado) => {
    expect(parsearMonto(entrada)).toBe(esperado);
  });

  test.each([
    "",
    "abc",
    "-5",
    "1.250,00",
    "12,345",
    "1e3",
    "12$34",
  ])("%p → null", (entrada) => {
    expect(parsearMonto(entrada)).toBeNull();
  });
});

describe("parsearEntero", () => {
  test("acepta enteros con espacios", () => {
    expect(parsearEntero(" 12 ")).toBe(12);
    expect(parsearEntero("0")).toBe(0);
  });
  test.each(["3.5", "3,0", "-1", "3a", ""])("%p → null", (entrada) => {
    expect(parsearEntero(entrada)).toBeNull();
  });
  test("devuelve number entero (la regla exige int, no string)", () => {
    const n = parsearEntero("3");
    expect(typeof n).toBe("number");
    expect(Number.isInteger(n)).toBe(true);
  });
});

describe("validarProducto", () => {
  test("entrada válida → campos tipados y normalizados", () => {
    const r = validarProducto({
      ...base,
      marca: "honor",
      nombre: "  600   Elite ",
      variante: " 8 / 256 ",
      inicial: "125,50$",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor).toEqual({
      marca: "HONOR",
      nombre: "600 Elite",
      variante: "8/256",
      inicial: 125.5,
      cuota: 63,
      numeroCuotas: 6,
      cantidad: 3,
      activo: true,
    });
    expect(r.avisos).toEqual({});
  });

  test("nombre vacío o de más de 80", () => {
    expect(validarProducto({ ...base, nombre: "  " }).ok).toBe(false);
    const largo = validarProducto({ ...base, nombre: "x".repeat(81) });
    expect(largo.ok).toBe(false);
    if (!largo.ok) expect(largo.errores.nombre).toContain("80");
    expect(validarProducto({ ...base, nombre: "x".repeat(80) }).ok).toBe(true);
  });

  test("variante: vacía vale, >20 no, formato raro solo avisa", () => {
    expect(validarProducto({ ...base, variante: "" }).ok).toBe(true);
    expect(validarProducto({ ...base, variante: "x".repeat(21) }).ok).toBe(
      false,
    );
    const raro = validarProducto({ ...base, variante: "256GB" });
    expect(raro.ok).toBe(true);
    expect(raro.avisos.variante).toBeDefined();
  });

  test("marca fuera de la lista", () => {
    const r = validarProducto({ ...base, marca: "APPLE" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.marca).toBeDefined();
  });

  test("montos inválidos o fuera de rango", () => {
    for (const inicial of ["", "abc", "100001"]) {
      const r = validarProducto({ ...base, inicial });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errores.inicial).toBeDefined();
    }
    expect(validarProducto({ ...base, cuota: "100000" }).ok).toBe(true);
  });

  test("numeroCuotas entero 1..48", () => {
    for (const numeroCuotas of ["0", "49", "6.5", ""]) {
      expect(validarProducto({ ...base, numeroCuotas }).ok).toBe(false);
    }
    expect(validarProducto({ ...base, numeroCuotas: "48" }).ok).toBe(true);
  });

  test("cantidad entero ≥ 0", () => {
    for (const cantidad of ["-1", "2.5", "", "100001"]) {
      expect(validarProducto({ ...base, cantidad }).ok).toBe(false);
    }
    expect(validarProducto({ ...base, cantidad: "0" }).ok).toBe(true);
  });

  test("junta todos los errores a la vez", () => {
    const r = validarProducto({
      ...base,
      nombre: "",
      inicial: "x",
      cantidad: "-1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(Object.keys(r.errores).sort()).toEqual([
        "cantidad",
        "inicial",
        "nombre",
      ]);
  });
});

describe("validarCantidad y variante", () => {
  test("cantidad rápida", () => {
    expect(validarCantidad("7")).toBe(7);
    expect(validarCantidad("-1")).toBeNull();
    expect(validarCantidad("100001")).toBeNull();
  });
  test("formato sugerido N/N", () => {
    expect(varianteConFormatoSugerido("8/256")).toBe(true);
    expect(varianteConFormatoSugerido("8GB")).toBe(false);
  });
});

describe("formato", () => {
  test("montos como el cliente", () => {
    expect(formatearMonto(125)).toBe("125$");
    expect(formatearMonto(125.5)).toBe("125,50$");
    expect(formatearCuota(6, 63)).toBe("6 × 63$");
  });

  test("haceCuanto", () => {
    const ahora = new Date("2026-10-01T12:00:00Z");
    const menos = (s: number) => new Date(ahora.getTime() - s * 1000);
    expect(haceCuanto(menos(10), ahora)).toBe("hace un momento");
    expect(haceCuanto(menos(5 * 60), ahora)).toBe("hace 5 minutos");
    expect(haceCuanto(menos(2 * 3600), ahora)).toBe("hace 2 horas");
    expect(haceCuanto(menos(24 * 3600), ahora)).toBe("ayer");
  });

  test("búsqueda sin acentos ni mayúsculas", () => {
    expect(normalizarBusqueda("  Camón ")).toBe("camon");
  });
});
