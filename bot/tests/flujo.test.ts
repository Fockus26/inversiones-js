import { describe, expect, test } from "bun:test";
import type { ProductoDeLista } from "../../lib/catalogo/texto-lista";
import type { Turno } from "../../lib/horario/turnos";
import {
  type Contacto,
  type Estado,
  esNo,
  esSi,
  numeroElegido,
  procesar,
  type Servicios,
} from "../src/flujo";
import * as T from "../src/textos";

const AHORA = new Date("2026-10-01T14:00:00Z");
const contacto: Contacto = {
  jid: "584121234567@s.whatsapp.net",
  telefono: "584121234567",
  nombre: "María Pérez",
};

const turnos: Turno[] = [
  {
    inicio: "2026-10-02T13:00:00.000Z",
    fin: "2026-10-02T14:00:00.000Z",
    etiqueta: "Viernes 02 9am",
  },
  {
    inicio: "2026-10-02T19:00:00.000Z",
    fin: "2026-10-02T20:00:00.000Z",
    etiqueta: "Viernes 02 3pm",
  },
];

const productos: ProductoDeLista[] = [
  {
    marca: "REDMI",
    nombre: "Note 15",
    variante: "8/256",
    inicial: 80,
    cuota: 40,
    numeroCuotas: 6,
    cantidad: 3,
    activo: true,
    orden: 1,
  },
  {
    marca: "HONOR",
    nombre: "600 Elite",
    variante: "8/256",
    inicial: 125,
    cuota: 63,
    numeroCuotas: 6,
    cantidad: 1,
    activo: true,
    orden: 1,
  },
  {
    marca: "HONOR",
    nombre: "X6",
    variante: "4/128",
    inicial: 50,
    cuota: 25,
    numeroCuotas: 6,
    cantidad: 0,
    activo: true,
    orden: 2,
  },
];

function falsos(extra: Partial<Servicios> = {}) {
  const avisos: string[] = [];
  const citas: { turno: Turno; direccion: string }[] = [];
  const s: Servicios = {
    catalogo: async () => productos,
    turnosDisponibles: async () => turnos,
    agendar: async (turno, _c, datos) => {
      citas.push({ turno, direccion: datos.direccion });
      return true;
    },
    avisarAsesor: async (t) => {
      avisos.push(t);
    },
    ahora: () => AHORA,
    azar: () => 0,
    ...extra,
  };
  return { s, avisos, citas };
}

/** Recorre una conversación y devuelve todas las respuestas y el estado final. */
async function conversar(
  s: Servicios,
  mensajes: string[],
  inicial: Estado | null = null,
) {
  let estado = inicial;
  const respuestas: string[][] = [];
  for (const texto of mensajes) {
    const r = await procesar(estado, { texto }, contacto, s);
    respuestas.push(r.respuestas);
    estado = r.estado;
  }
  return { respuestas, estado };
}

describe("interpretación", () => {
  test("números", () => {
    expect(numeroElegido("2")).toBe(2);
    expect(numeroElegido(" 2. ")).toBe(2);
    expect(numeroElegido("opción 3")).toBe(3);
    expect(numeroElegido("dos")).toBe(2);
    expect(numeroElegido("quiero 2 cosas")).toBeNull();
  });
  test("sí / no", () => {
    for (const t of ["si", "Sí", "SI!", "claro", "dale", "si quiero"])
      expect(esSi(t)).toBe(true);
    for (const t of ["no", "No gracias", "ahora no"])
      expect(esNo(t)).toBe(true);
    expect(esSi("no")).toBe(false);
    expect(esSi("seguro que no")).toBe(false);
  });
});

describe("flujo", () => {
  test("primer mensaje: saludo con nombre y menú", async () => {
    const { s } = falsos();
    const { respuestas, estado } = await conversar(s, ["buenas"]);
    expect(respuestas[0][0]).toContain("Hola María, soy Gaby");
    expect(respuestas[0][0]).toContain(T.OPCIONES_MENU);
    expect(estado?.paso).toBe("menu");
  });

  test("un número como primer mensaje solo muestra el menú", async () => {
    const { s } = falsos();
    const { estado } = await conversar(s, ["2"]);
    expect(estado?.paso).toBe("menu");
  });

  test("opción 1 → sí → horario → dirección → cita agendada", async () => {
    const { s, avisos, citas } = falsos();
    const { respuestas, estado } = await conversar(s, [
      "hola",
      "1",
      "si",
      "2",
      "Av. Bolívar, edificio Sol, frente a la plaza. 0412-1234567",
    ]);
    expect(respuestas[1][0]).toContain("espíritu emprendedor");
    expect(respuestas[2][0]).toContain("1. Viernes 02 9am\n2. Viernes 02 3pm");
    expect(respuestas[3][0]).toContain("dirección exacta");
    expect(respuestas[4][0]).toContain("*Viernes 02 3pm*");
    expect(citas).toEqual([
      {
        turno: turnos[1],
        direccion: "Av. Bolívar, edificio Sol, frente a la plaza. 0412-1234567",
      },
    ]);
    expect(avisos[0]).toContain("Nueva cita");
    expect(estado?.paso).toBe("menu");
  });

  test("opción 1 → no → vuelve al menú", async () => {
    const { s } = falsos();
    const { respuestas, estado } = await conversar(s, ["hola", "1", "no"]);
    expect(respuestas[2][0]).toContain("Quedamos a tus órdenes");
    expect(respuestas[2][0]).toContain(T.OPCIONES_MENU);
    expect(estado?.paso).toBe("menu");
  });

  test("horario ocupado al confirmar → ofrece de nuevo", async () => {
    const { s } = falsos({ agendar: async () => false });
    const { respuestas, estado } = await conversar(s, [
      "hola",
      "1",
      "si",
      "1",
      "Calle 5 casa 10, al lado de la panadería",
    ]);
    expect(respuestas[4][0]).toContain(T.LOTERIA_TURNO_OCUPADO[0]);
    expect(estado?.paso).toBe("loteria_horario");
  });

  test("sin horarios libres → avisa al asesor y vuelve al menú", async () => {
    const { s, avisos } = falsos({ turnosDisponibles: async () => [] });
    const { estado } = await conversar(s, ["hola", "1", "si"]);
    expect(avisos[0]).toContain("Sin horarios libres");
    expect(estado?.paso).toBe("menu");
  });

  test("opción 2 → lista numerada sin agotados → elegir equipo", async () => {
    const { s, avisos } = falsos();
    const { respuestas, estado } = await conversar(s, ["hola", "2", "2"]);
    const lista = respuestas[1][1];
    expect(lista).toContain(
      "*HONOR*\n1. 600 Elite 8/256\n    Inic 125$ · 6 quincenas de 63$",
    );
    expect(lista).toContain("*REDMI*\n2. Note 15 8/256");
    expect(lista).not.toContain("X6");
    expect(respuestas[2][0]).toContain("*REDMI Note 15 8/256*");
    expect(avisos[0]).toContain("REDMI Note 15 8/256");
    expect(estado?.paso).toBe("menu");
  });

  test("opción 3 → transporte público → asesor", async () => {
    const { s, avisos } = falsos();
    const { respuestas, estado } = await conversar(s, ["hola", "3", "1"]);
    expect(respuestas[1][0]).toContain("1️⃣ Transporte público");
    expect(respuestas[2][0]).toContain("asesor");
    expect(avisos[0]).toContain("Transporte público");
    expect(estado?.paso).toBe("menu");
  });

  test("MENU en medio de un flujo reinicia", async () => {
    const { s } = falsos();
    const { estado } = await conversar(s, ["hola", "3", "menu"]);
    expect(estado?.paso).toBe("menu");
  });

  test("tras 2 h sin escribir vuelve a saludar", async () => {
    const { s } = falsos();
    const viejo: Estado = {
      paso: "rcv_tipo",
      actualizado: AHORA.getTime() - 3 * 3_600_000,
    };
    const { respuestas, estado } = await conversar(s, ["1"], viejo);
    expect(respuestas[0][0]).toContain("soy Gaby");
    expect(estado?.paso).toBe("menu");
  });

  test("textos: varían y reemplazan claves", () => {
    expect(T.elegir(T.SALUDO, { nombre: "" }, () => 0)).toBe(
      "Hola, soy Gaby, asesora comercial de Inversiones JS. ¿En qué te puedo servir?",
    );
    expect(new Set(T.SALUDO).size).toBe(5);
  });
});
