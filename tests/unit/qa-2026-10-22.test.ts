/** Casos de la QA funcional del 22/10/2026 (fechas, mayúsculas, teléfonos, búsqueda, enteros). */
import { describe, expect, test } from "bun:test";
import {
  contienePalabras,
  normalizarBusqueda,
} from "@/components/catalogo/formato";
import { validarProducto } from "@/lib/catalogo/validacion";
import {
  esFecha,
  fechaEnRango,
  sumarDias,
  sumarMeses,
} from "@/lib/financiamiento/fechas";
import { whatsappDe } from "@/lib/financiamiento/poliza";
import {
  type FormularioClienteRcv,
  validarClienteCelular,
  validarClienteRcv,
} from "@/lib/financiamiento/validacion";

const HOY = "2026-10-22";

describe("fechas con año de dos dígitos", () => {
  test("0026 no se convierte en 1926", () => {
    expect(esFecha("0026-10-28")).toBe(true);
    expect(sumarMeses("0026-10-28", 12)).toBe("0027-10-28");
    expect(sumarDias("0026-12-31", 1)).toBe("0027-01-01");
  });

  test("rango: 2020 hasta dos años por delante de hoy", () => {
    expect(fechaEnRango("0026-10-28", HOY)).toBe(false);
    expect(fechaEnRango("2019-12-31", HOY)).toBe(false);
    expect(fechaEnRango("2020-01-01", HOY)).toBe(true);
    expect(fechaEnRango("2028-10-22", HOY)).toBe(true);
    expect(fechaEnRango("2028-10-23", HOY)).toBe(false);
  });
});

const pagos = {
  inicial: "60",
  cuota: "25",
  numeroCuotas: "6",
  frecuencia: "quincenal" as const,
  primera: "2026-10-28",
};

describe("validación de clientes", () => {
  const celular = {
    nombre: "María",
    cedula: "",
    telefono: "0414-1234567",
    equipo: "HONOR",
    notas: "",
    ...pagos,
  };
  const rcv: FormularioClienteRcv = {
    nombre: "José",
    cedula: "",
    telefono: "0412-7654321",
    correo: "",
    direccion: "",
    vehiculo: "taxi",
    placa: "ab123cd",
    notas: "",
    emision: "2026-01-15",
    financiado: false,
    ...pagos,
  };

  test("primera cuota fuera de rango", () => {
    const r = validarClienteCelular(
      { ...celular, primera: "0026-11-01" },
      null,
      HOY,
    );
    expect(!r.ok && r.errores.primera).toBeTruthy();
  });

  test("emisión futura o del año 0026 se rechaza; la de una renovación se respeta", () => {
    const futura = validarClienteRcv(
      { ...rcv, emision: "2026-11-01" },
      null,
      HOY,
    );
    expect(!futura.ok && futura.errores.emision).toBeTruthy();
    const corta = validarClienteRcv(
      { ...rcv, emision: "0026-10-28" },
      null,
      HOY,
    );
    expect(!corta.ok && corta.errores.emision).toBeTruthy();
    const previo = {
      emision: "2026-11-01",
      recordatorio30: false,
      recordatorio3: false,
      pagos: null,
    };
    const renovada = validarClienteRcv(
      { ...rcv, emision: "2026-11-01" },
      previo,
      HOY,
    );
    expect(renovada.ok).toBe(true);
  });

  test("la placa se mide ya en mayúsculas (ß → SS)", () => {
    const r = validarClienteRcv({ ...rcv, placa: "ab-123-cdßß" }, null, HOY);
    expect(!r.ok && r.errores.placa).toBeTruthy();
  });

  test("teléfonos absurdos o con emojis", () => {
    expect(whatsappDe("00000000000")).toBeNull();
    expect(whatsappDe("0212-5551234")).toBe("582125551234");
    const emoji = validarClienteCelular(
      { ...celular, telefono: "👍0414-1234567" },
      null,
      HOY,
    );
    expect(!emoji.ok && emoji.errores.telefono).toBeTruthy();
  });
});

describe("búsqueda", () => {
  test("la ñ no es una n", () => {
    expect(normalizarBusqueda("Peña")).toBe("peña");
    expect(contienePalabras("Pena", "ñ")).toBe(false);
    expect(contienePalabras("José Peña", "jose pena")).toBe(false);
    expect(contienePalabras("José Peña", "jose peña")).toBe(true);
  });

  test("palabra por palabra, en cualquier orden", () => {
    expect(contienePalabras("HONOR 600 Elite 8/256", "honor 8/256")).toBe(true);
    expect(contienePalabras("HONOR 600 Elite 8/256", "8/256 elite")).toBe(true);
    expect(contienePalabras("HONOR 600 Elite 8/256", "honor 12/256")).toBe(
      false,
    );
  });
});

describe("mensajes de enteros", () => {
  const base = {
    marca: "HONOR",
    nombre: "X",
    variante: "",
    inicial: "60",
    cuota: "25",
    numeroCuotas: "6",
    cantidad: "1",
    activo: true,
  };
  const error = (numeroCuotas: string) => {
    const r = validarProducto({ ...base, numeroCuotas }, ["HONOR"]);
    return r.ok ? undefined : r.errores.numeroCuotas;
  };
  test("negativo, decimal y texto dan mensajes distintos", () => {
    expect(error("-1")).toContain("o más");
    expect(error("6.5")).toContain("sin decimales");
    expect(error("seis")).toContain("solo números");
  });
});
