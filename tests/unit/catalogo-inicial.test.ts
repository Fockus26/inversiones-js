import { describe, expect, test } from "bun:test";
import { CATALOGO_INICIAL, idDeSemilla } from "@/lib/catalogo/catalogo-inicial";
import { MARCAS_INICIALES } from "@/lib/catalogo/tipos";

describe("catálogo inicial (29/09)", () => {
  test("trae los 23 equipos de la lista del cliente", () => {
    expect(CATALOGO_INICIAL).toHaveLength(23);
  });

  test("ids únicos (el seed hace upsert por id)", () => {
    const ids = new Set(CATALOGO_INICIAL.map((p) => p.id));
    expect(ids.size).toBe(CATALOGO_INICIAL.length);
  });

  test("solo marcas conocidas y montos positivos", () => {
    for (const p of CATALOGO_INICIAL) {
      expect(MARCAS_INICIALES as readonly string[]).toContain(p.marca);
      expect(p.inicial).toBeGreaterThan(0);
      expect(p.cuota).toBeGreaterThan(0);
      expect(p.numeroCuotas).toBe(6);
    }
  });

  test("idDeSemilla quita acentos y símbolos", () => {
    expect(
      idDeSemilla({ marca: "TECNO", nombre: "Camón 50", variante: "8/256" }),
    ).toBe("tecno-camon-50-8-256");
  });
});
