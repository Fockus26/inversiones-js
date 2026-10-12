import { describe, expect, test } from "bun:test";
import { HORARIO_POR_DEFECTO, normalizarHorario } from "@/lib/horario/tipos";
import { etiquetaTurno, turnosDisponibles } from "@/lib/horario/turnos";

// Miércoles 30/09/2026, 10:00 en Caracas (14:00 UTC).
const AHORA = new Date("2026-09-30T14:00:00Z");

describe("turnos de citas", () => {
  test("etiqueta en hora de Caracas", () => {
    expect(etiquetaTurno(new Date("2026-10-07T21:00:00Z"))).toBe(
      "Miércoles 07 5pm",
    );
    expect(etiquetaTurno(new Date("2026-10-08T19:30:00Z"))).toBe(
      "Jueves 08 3:30pm",
    );
    expect(etiquetaTurno(new Date("2026-10-08T16:00:00Z"))).toBe(
      "Jueves 08 12m",
    );
  });

  test("respeta anticipación, días cerrados, máximos y reparte en el día", () => {
    const t = turnosDisponibles(HORARIO_POR_DEFECTO, AHORA, []);
    expect(t.map((x) => x.etiqueta)).toEqual([
      "Miércoles 30 1pm",
      "Miércoles 30 4pm",
      "Jueves 01 9am",
      "Jueves 01 4pm",
      "Viernes 02 9am",
      "Viernes 02 4pm",
    ]);
  });

  test("salta lo ocupado y los domingos", () => {
    const h = normalizarHorario({
      ...HORARIO_POR_DEFECTO,
      maxPorDia: 9,
      maxOpciones: 9,
      diasAdelante: 7,
    });
    const ocupados = [
      {
        inicio: new Date("2026-10-03T13:00:00Z"),
        fin: new Date("2026-10-03T15:00:00Z"),
      },
    ];
    const t = turnosDisponibles(h, new Date("2026-10-03T10:00:00Z"), ocupados);
    expect(t.map((x) => x.etiqueta)).toEqual([
      "Sábado 03 11am",
      "Sábado 03 12m",
      "Lunes 05 9am",
      "Lunes 05 10am",
      "Lunes 05 11am",
      "Lunes 05 12m",
      "Lunes 05 1pm",
      "Lunes 05 2pm",
      "Lunes 05 3pm",
    ]);
  });

  test("normalizar descarta valores inválidos", () => {
    const h = normalizarHorario({
      duracionMinutos: -5,
      dias: { "1": [{ desde: "18:00", hasta: "09:00" }] },
    });
    expect(h.duracionMinutos).toBe(60);
    expect(h.dias["1"]).toEqual([]);
    expect(h.dias["2"]).toEqual(HORARIO_POR_DEFECTO.dias["2"]);
  });
});
