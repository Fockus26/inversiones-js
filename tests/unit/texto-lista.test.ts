import { describe, expect, test } from "bun:test";
import { CATALOGO_INICIAL } from "@/lib/catalogo/catalogo-inicial";
import {
  formatearFechaCorta,
  formatearMonto,
  type ProductoDeLista,
  textoListaDePrecios,
} from "@/lib/catalogo/texto-lista";

// 29/09/2026 a las 22:00 en Caracas = 30/09 02:00 UTC: prueba la zona horaria.
const FECHA = new Date("2026-09-30T02:00:00Z");

/**
 * Lista del 29/09 del cliente con su forma exacta: una línea en blanco tras el título y entre
 * productos, dos entre marcas. Los nombres van normalizados como quedaron en el seed.
 */
const LISTA_DEL_CLIENTE = `Lista de precios actualizada (29/09)

HONOR
600 Elite 8/256
Inic 125$.   6 quincenas 63$

Magic 8 Lite 8/256
Inic 130$.   6 quincenas 65$

Play 10 3/64
Inic 33$.   6 quincenas 16$

T10 4/128
Inic 42$.   6 quincenas 20$

X5D 4/256
Inic 60$.   6 quincenas 30$

X6E 4/256
Inic 73$.   6 quincenas 36$

X7D 8/256
Inic 92$.   6 quincenas 46$


INFINIX
Smart 20 4/128
Inic 52$.   6 quincenas 26$

Smart 20 4/64
Inic 47$.   6 quincenas 24$


REDMI
15 6/128
Inic 62$.   6 quincenas 31$

15 8/256
Inic 72$.   6 quincenas 36$

A7 Pro 4/64
Inic 39$.   6 quincenas 20$

Note 15 8/256
Inic 80$.   6 quincenas 40$

Note 17 6/256
Inic 82$.   6 quincenas 41$


SAMSUNG
A06 4/64
Inic 40$.   6 quincenas 20$

A07 4/64
Inic 42$.   6 quincenas 21$

A07 4/128
Inic 44$.   6 quincenas 22$

A16 4/128
Inic 53$.   6 quincenas 27$

A17 4/128
Inic 52$.   6 quincenas 26$

A57 12/512
Inic 255$.   6 quincenas 100$


TECNO
Camon 50 Ultra 5G 8/256
Inic 136$.   6 quincenas 68$

Spark GO 3 4/128
Inic 48$.   6 quincenas 24$

Spark GO 3 4/64
Inic 42$.   6 quincenas 24$`;

/** El seed arranca con cantidad 0; para comparar con la lista del cliente, todo con stock. */
const conStock: ProductoDeLista[] = CATALOGO_INICIAL.map((p) => ({
  ...p,
  cantidad: 3,
}));

describe("textoListaDePrecios", () => {
  test("el catálogo inicial reproduce la lista del cliente del 29/09", () => {
    expect(textoListaDePrecios(conStock, FECHA)).toBe(LISTA_DEL_CLIENTE);
  });

  test("omite siempre los productos inactivos", () => {
    const productos = conStock.map((p) =>
      p.marca === "INFINIX" || p.nombre === "600 Elite"
        ? { ...p, activo: false }
        : p,
    );
    const texto = textoListaDePrecios(productos, FECHA);
    expect(texto).not.toContain("INFINIX");
    expect(texto).not.toContain("600 Elite");
    expect(texto).toContain("Magic 8 Lite 8/256");
  });

  test("agotados: por defecto se marcan con (agotado)", () => {
    const productos = conStock.map((p) =>
      p.nombre === "A06" ? { ...p, cantidad: 0 } : p,
    );
    const texto = textoListaDePrecios(productos, FECHA);
    expect(texto).toContain("A06 4/64 (agotado)\nInic 40$.   6 quincenas 20$");
    expect(texto.match(/\(agotado\)/g)).toHaveLength(1);
  });

  test("agotados: 'ocultar' los quita y una marca vacía desaparece", () => {
    const productos = conStock.map((p) =>
      p.nombre === "A06" || p.marca === "INFINIX" ? { ...p, cantidad: 0 } : p,
    );
    const texto = textoListaDePrecios(productos, FECHA, {
      agotados: "ocultar",
    });
    expect(texto).not.toContain("A06");
    expect(texto).not.toContain("INFINIX");
    expect(texto).not.toContain("agotado");
    expect(texto).toContain("A07 4/64");
  });

  test("ordena por marca (orden de MARCAS) y por `orden` dentro de la marca", () => {
    const productos: ProductoDeLista[] = [
      { ...conStock[22], orden: 1 },
      { ...conStock[0], orden: 9 },
      { ...conStock[1], orden: 2 },
    ];
    const texto = textoListaDePrecios(productos, FECHA);
    expect(texto.indexOf("HONOR")).toBeLessThan(texto.indexOf("TECNO"));
    expect(texto.indexOf("Magic 8 Lite")).toBeLessThan(
      texto.indexOf("600 Elite"),
    );
  });

  test("sin productos visibles queda solo el título", () => {
    expect(textoListaDePrecios([], FECHA)).toBe(
      "Lista de precios actualizada (29/09)",
    );
  });

  test("respeta numeroCuotas y montos con decimales", () => {
    const [p] = conStock;
    expect(
      textoListaDePrecios([{ ...p, numeroCuotas: 1, cuota: 62.5 }], FECHA),
    ).toContain("Inic 125$.   1 quincena 62.5$");
    expect(
      textoListaDePrecios([{ ...p, numeroCuotas: 8, cuota: 47.123 }], FECHA),
    ).toContain("8 quincenas 47.12$");
  });
});

describe("formatos", () => {
  test("formatearMonto", () => {
    expect(formatearMonto(125)).toBe("125$");
    expect(formatearMonto(12.5)).toBe("12.5$");
    expect(formatearMonto(0)).toBe("0$");
  });

  test("formatearFechaCorta usa la zona horaria (Caracas por defecto)", () => {
    expect(formatearFechaCorta(FECHA)).toBe("29/09");
    expect(formatearFechaCorta(FECHA, "UTC")).toBe("30/09");
    expect(formatearFechaCorta(new Date("2026-01-05T15:00:00Z"))).toBe("05/01");
  });
});
