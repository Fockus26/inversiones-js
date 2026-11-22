import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  borrarBorrador,
  borrarTodosLosBorradores,
  claveBorrador,
  esSesionTerminada,
  guardarBorrador,
  leerBorrador,
  mismaForma,
  VIGENCIA_MS,
} from "@/lib/borrador";
import { ErrorDatos } from "@/lib/data/errores";
import { escribir, sondear } from "@/lib/data/sondeo";

/** `sessionStorage` de mentira (bun no trae uno). */
function almacen(entradas: Record<string, string> = {}) {
  const m = new Map(Object.entries(entradas));
  return {
    m,
    get length() {
      return m.size;
    },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

/** Uno que lanza en todo, como Safari en modo privado o con la cuota llena. */
const roto = {
  length: 0,
  key: () => {
    throw new Error("bloqueado");
  },
  getItem: () => {
    throw new Error("bloqueado");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
  removeItem: () => {
    throw new Error("bloqueado");
  },
};

const FORM = {
  marca: "TECNO",
  nombre: "Spark 40",
  variante: "",
  inicial: "40",
  cuota: "20",
  numeroCuotas: "6",
  cantidad: "0",
  activo: true,
};
const AHORA = 1_800_000_000_000;

describe("claveBorrador", () => {
  test("una por registro, y 'nuevo' para el alta", () => {
    expect(claveBorrador("producto", "abc")).toBe("ijs:borrador:producto:abc");
    expect(claveBorrador("cliente-rcv", null)).toBe(
      "ijs:borrador:cliente-rcv:nuevo",
    );
    expect(claveBorrador("producto", "abc")).not.toBe(
      claveBorrador("plan-rcv", "abc"),
    );
  });
});

describe("esSesionTerminada", () => {
  test("solo unauthenticated guarda borrador", () => {
    expect(esSesionTerminada(new ErrorDatos("unauthenticated"))).toBe(true);
    expect(esSesionTerminada(new ErrorDatos("permission-denied"))).toBe(false);
    expect(esSesionTerminada(new ErrorDatos("unavailable"))).toBe(false);
    expect(esSesionTerminada(new Error("unauthenticated"))).toBe(false);
    expect(esSesionTerminada(undefined)).toBe(false);
  });
});

describe("guardar y leer", () => {
  test("lo guardado se lee igual, con su hora", () => {
    const a = almacen();
    const k = claveBorrador("producto", "p1");
    const editado = { ...FORM, nombre: "QA-escrito-a-mano" };
    expect(guardarBorrador(k, editado, a, AHORA)).toBe(true);
    expect(leerBorrador(k, FORM, a, AHORA + 1000)).toEqual({
      valor: editado,
      guardadoEn: AHORA,
    });
  });

  test("otro registro no ve el borrador", () => {
    const a = almacen();
    guardarBorrador(claveBorrador("producto", "p1"), FORM, a, AHORA);
    expect(
      leerBorrador(claveBorrador("producto", "p2"), FORM, a, AHORA),
    ).toBeNull();
    expect(
      leerBorrador(claveBorrador("producto", null), FORM, a, AHORA),
    ).toBeNull();
  });

  test("vencido, del futuro, con otra forma o JSON roto: se descarta y se borra", () => {
    const k = claveBorrador("producto", "p1");
    const casos = [
      JSON.stringify({ valor: FORM, guardadoEn: AHORA - VIGENCIA_MS - 1 }),
      JSON.stringify({ valor: FORM, guardadoEn: AHORA + 3_600_000 }),
      JSON.stringify({ valor: { ...FORM, activo: "sí" }, guardadoEn: AHORA }),
      JSON.stringify({ valor: { nombre: "x" }, guardadoEn: AHORA }),
      JSON.stringify({ valor: FORM }),
      "null",
    ];
    for (const crudo of casos) {
      const a = almacen({ [k]: crudo });
      expect(leerBorrador(k, FORM, a, AHORA)).toBeNull();
      expect(a.m.has(k)).toBe(false);
    }
    const a = almacen({ [k]: "{no es json" });
    expect(leerBorrador(k, FORM, a, AHORA)).toBeNull();
  });

  test("sin sessionStorage o si lanza, no pasa nada", () => {
    const k = claveBorrador("producto", "p1");
    expect(guardarBorrador(k, FORM, null)).toBe(false);
    expect(leerBorrador(k, FORM, null)).toBeNull();
    expect(guardarBorrador(k, FORM, roto)).toBe(false);
    expect(leerBorrador(k, FORM, roto)).toBeNull();
    expect(() => borrarBorrador(k, roto)).not.toThrow();
    expect(() => borrarTodosLosBorradores(roto)).not.toThrow();
  });

  test("borrarTodos quita solo los borradores", () => {
    const a = almacen({ "otra-cosa": "1" });
    guardarBorrador(claveBorrador("producto", "p1"), FORM, a);
    guardarBorrador(claveBorrador("cliente-celular", null), FORM, a);
    borrarTodosLosBorradores(a);
    expect([...a.m.keys()]).toEqual(["otra-cosa"]);
  });
});

describe("mismaForma", () => {
  test("anidado (plan RCV) y listas", () => {
    const molde = {
      form: { clase: "", categorias: [] as string[], activo: true },
      orden: "3",
    };
    expect(
      mismaForma(molde, {
        form: { clase: "MOTO", categorias: ["publico"], activo: false },
        orden: "4",
      }),
    ).toBe(true);
    expect(
      mismaForma(molde, {
        form: { clase: "MOTO", categorias: [1], activo: false },
        orden: "4",
      }),
    ).toBe(false);
    expect(
      mismaForma(molde, {
        form: { clase: "MOTO", categorias: "publico", activo: false },
        orden: "4",
      }),
    ).toBe(false);
    expect(mismaForma(molde, { ...molde, extra: 1 })).toBe(false);
    expect(mismaForma(molde, null)).toBe(false);
  });
});

describe("escribir", () => {
  // `sondear` escucha `visibilitychange`: basta con un documento mínimo.
  const doc = globalThis.document;
  beforeAll(() => {
    globalThis.document = {
      visibilityState: "visible",
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as Document;
  });
  afterAll(() => {
    globalThis.document = doc;
  });

  async function consultasTras(
    resultado: Awaited<ReturnType<Parameters<typeof escribir>[1]>>,
  ) {
    let consultas = 0;
    const parar = sondear(
      ["prueba"],
      async () => {
        consultas++;
        return { ok: true, datos: consultas };
      },
      () => {},
      () => {},
      60_000,
    );
    await Bun.sleep(5);
    const antes = consultas;
    await escribir(["prueba"], async () => resultado).catch(() => {});
    await Bun.sleep(5);
    parar();
    return consultas - antes;
  }

  test("refresca la pantalla al guardar y al fallar", async () => {
    expect(await consultasTras({ ok: true, datos: 1 })).toBe(1);
    expect(await consultasTras({ ok: false, codigo: "invalid-argument" })).toBe(
      1,
    );
  });

  test("con la sesión terminada no refresca: el diálogo no se desmonta", async () => {
    expect(await consultasTras({ ok: false, codigo: "unauthenticated" })).toBe(
      0,
    );
  });
});
