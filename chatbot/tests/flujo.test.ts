import { describe, expect, test } from "bun:test";
import { CATALOGO_INICIAL } from "../../lib/catalogo/catalogo-inicial";
import { buscar } from "../src/buscar";
import { decidir, estadoInicial } from "../src/flujo";
import * as T from "../src/textos";

const conStock = CATALOGO_INICIAL.map((p) => ({ ...p, cantidad: 3 }));
const AHORA = Date.UTC(2026, 9, 4, 15);
const saludado = { saludado: true };

describe("buscar", () => {
  test("note 15 no trae el Redmi 15", () => {
    const r = buscar(conStock, "cuanto esta el redmi note 15");
    expect(r.map((p) => p.nombre)).toEqual(["Note 15"]);
  });
  test("sin acentos ni mayúsculas", () => {
    expect(buscar(conStock, "HONOR 600 ÉLITE")).toHaveLength(1);
  });
  test("nada que ver", () => {
    expect(buscar(conStock, "quiero un iphone")).toEqual([]);
  });
});

describe("decidir", () => {
  test("primer mensaje cualquiera: saludo con menú", () => {
    const d = decidir("buenas tardes", estadoInicial(), conStock, AHORA);
    expect(d.respuestas).toEqual([T.SALUDO]);
    expect(d.estado.saludado).toBe(true);
  });

  test("hola + modelo responde el modelo, no el saludo", () => {
    const d = decidir(
      "hola, precio del note 15?",
      estadoInicial(),
      conStock,
      AHORA,
    );
    expect(d.respuestas[0]).toContain("Note 15");
    expect(d.respuestas[0]).toContain("Inic 80$");
  });

  test("1 manda la lista y no la repite enseguida", () => {
    const d = decidir("1", saludado, conStock, AHORA);
    expect(d.respuestas[0]).toStartWith("Lista de precios actualizada (04/10)");
    const otra = decidir("lista", d.estado, conStock, AHORA + 60_000);
    expect(otra.respuestas).toEqual([T.LISTA_RECIENTE]);
  });

  test("3 o 'asesor' pasa a una persona", () => {
    expect(decidir("3", saludado, conStock, AHORA).pasarAAsesor).toBe(true);
    expect(
      decidir("quiero hablar con un asesor", saludado, conStock, AHORA)
        .pasarAAsesor,
    ).toBe(true);
  });

  test("agotado: lo marca y no ofrece apartarlo", () => {
    const d = decidir("note 15", saludado, CATALOGO_INICIAL, AHORA);
    expect(d.respuestas[0]).toContain("(agotado)");
    expect(d.respuestas[1]).toBe(T.TODOS_AGOTADOS);
  });

  test("'ok' no genera respuesta", () => {
    expect(decidir("ok", saludado, conStock, AHORA).respuestas).toEqual([]);
  });

  test("no entendido: contesta una vez y luego calla 10 min", () => {
    const d = decidir("asdf qwer", saludado, conStock, AHORA);
    expect(d.respuestas).toEqual([T.NO_ENCONTRADO]);
    expect(
      decidir("zzz", d.estado, conStock, AHORA + 60_000).respuestas,
    ).toEqual([]);
  });

  test("sin catálogo (Firestore caído) no inventa precios", () => {
    expect(decidir("1", saludado, null, AHORA).respuestas).toEqual([
      T.SIN_CATALOGO,
    ]);
  });
});
