import { describe, expect, test } from "bun:test";
import {
  MARCA_MAX,
  normalizarMarca,
  unirMarcas,
  validarMarca,
} from "@/lib/catalogo/marcas";

const EXISTENTES = ["HONOR", "REDMI"];

describe("normalizarMarca", () => {
  test("recorta, colapsa espacios y pasa a mayúsculas", () => {
    expect(normalizarMarca("  redmi   note ")).toBe("REDMI NOTE");
    expect(normalizarMarca("motorola")).toBe("MOTOROLA");
  });
});

describe("validarMarca", () => {
  test("acepta una marca nueva normalizada", () => {
    expect(validarMarca(" xiaomi ", EXISTENTES)).toEqual({
      ok: true,
      valor: "XIAOMI",
    });
    expect(validarMarca("ZTE Blade-X", EXISTENTES).ok).toBe(true);
  });

  test("vacía, larga o con caracteres raros falla", () => {
    expect(validarMarca("   ", EXISTENTES).ok).toBe(false);
    expect(validarMarca("x".repeat(MARCA_MAX + 1), EXISTENTES).ok).toBe(false);
    expect(validarMarca("x".repeat(MARCA_MAX), EXISTENTES).ok).toBe(true);
    // "/" rompería el id del documento; "_" y "." al inicio, también.
    for (const mala of ["A/B", "__X__", ".", "..", "-NOKIA"]) {
      expect(validarMarca(mala, EXISTENTES).ok).toBe(false);
    }
  });

  test("duplicada falla, salvo al renombrarse a sí misma", () => {
    expect(validarMarca("honor", EXISTENTES).ok).toBe(false);
    expect(validarMarca("honor", EXISTENTES, "HONOR").ok).toBe(true);
    expect(validarMarca("redmi", EXISTENTES, "HONOR").ok).toBe(false);
  });
});

describe("unirMarcas", () => {
  test("une sin repetir y ordena alfabéticamente", () => {
    expect(unirMarcas(["TECNO", "HONOR"], ["HONOR", "APPLE"])).toEqual([
      "APPLE",
      "HONOR",
      "TECNO",
    ]);
  });
});
