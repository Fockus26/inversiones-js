import { describe, expect, test } from "bun:test";
import { textoAvisoVencimiento } from "../src/avisos-rcv";

describe("recordatorio de vencimiento de la póliza (D033)", () => {
  const cliente = {
    nombre: "José Rodríguez",
    placa: "AB123CD",
    vence: "2026-11-12",
  };

  test("aviso del mes: nombre, placa, fecha y días", () => {
    const t = textoAvisoVencimiento(cliente, "mes", "2026-10-13", () => 0);
    expect(t).toContain("Hola José");
    expect(t).toContain("placa *AB123CD*");
    expect(t).toContain("12 de noviembre de 2026");
    expect(t).toContain("30 días");
  });

  test("aviso final: «mañana» / «hoy» y sin placa ni nombre raro", () => {
    const manana = textoAvisoVencimiento(
      { ...cliente, placa: "", nombre: "🚗" },
      "final",
      "2026-11-11",
      () => 0,
    );
    expect(manana).toContain("mañana");
    expect(manana).toStartWith("Hola ⚠️");
    expect(manana).not.toContain("placa");
    expect(
      textoAvisoVencimiento(cliente, "final", "2026-11-12", () => 0),
    ).toContain("(hoy)");
  });
});
