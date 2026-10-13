import { describe, expect, test } from "bun:test";
import type { ProductoDeLista } from "../../lib/catalogo/texto-lista";
import type { Turno } from "../../lib/horario/turnos";
import { cotizar, planesDe, textoPrecio } from "../../lib/rcv/cotizacion";
import {
  PLANES_RCV_INICIALES,
  TASAS_RCV_INICIALES,
} from "../../lib/rcv/planes-iniciales";
import {
  type CategoriaRcv,
  REQUISITOS_RCV_POR_DEFECTO as REQUISITOS,
  type SolicitudRcv,
} from "../../lib/rcv/tipos";
import {
  type Contacto,
  correoValido,
  type Estado,
  esNo,
  esSi,
  nombreValido,
  numeroElegido,
  procesar,
  type Servicios,
  telefonoValido,
} from "../src/flujo";
import type { DatosRcvFirestore } from "../src/rcv";

const datosRcv: DatosRcvFirestore = {
  planes: PLANES_RCV_INICIALES,
  tasas: TASAS_RCV_INICIALES,
  requisitos: REQUISITOS,
};

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
  const solicitudes: SolicitudRcv[] = [];
  const s: Servicios = {
    catalogo: async () => productos,
    turnosDisponibles: async () => turnos,
    agendar: async (turno, _c, datos) => {
      citas.push({ turno, direccion: datos.direccion });
      return true;
    },
    rcv: async () => datosRcv,
    guardarSolicitudRcv: async (sol) => {
      solicitudes.push(sol);
    },
    avisarAsesor: async (t) => {
      avisos.push(t);
    },
    ahora: () => AHORA,
    azar: () => 0,
    ...extra,
  };
  return { s, avisos, citas, solicitudes };
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

  test("textos pedidos por el cliente", () => {
    expect(T.OPCIONES_MENU).toContain("3️⃣ Adquirir o comercializar póliza RCV");
    for (const t of T.LOTERIA_INFO) expect(t).not.toContain("ganar dinero");
    expect(T.LOTERIA_INFO[0]).toContain("muchas ganas de generar dinero");
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
    expect(respuestas[2][0]).toContain(
      "• Copia de la cédula\n• Copia del RIF actualizado\n• 2 referencias familiares",
    );
    expect(avisos[0]).toContain("REDMI Note 15 8/256");
    expect(estado?.paso).toBe("menu");
  });

  test("planes RCV: privado 1–4, público 1–6 y 8, extranjeras solo 7", () => {
    const nros = (c: CategoriaRcv) =>
      planesDe(PLANES_RCV_INICIALES, c).map((p) => p.orden);
    expect(nros("privado")).toEqual([1, 2, 3, 4]);
    expect(nros("publico")).toEqual([1, 2, 3, 4, 5, 6, 8]);
    expect(nros("extranjeras")).toEqual([7]);
    // Las tasas iniciales reproducen la tabla del cliente.
    expect(textoPrecio(cotizar(15, TASAS_RCV_INICIALES))).toBe(
      "15,00 € · 16,79$ · Bs. 14.686,18",
    );
    expect(textoPrecio(cotizar(131, TASAS_RCV_INICIALES))).toBe(
      "131,00 € · 146,63$ · Bs. 128.259,32",
    );
    expect(textoPrecio(cotizar(15, null))).toBe("15,00 €");
    expect(textoPrecio(cotizar(null, TASAS_RCV_INICIALES))).toBe(
      "Solicitar cotización",
    );
  });

  test("opción 3 → privado → pick up → precio y requisitos → datos guardados", async () => {
    const { s, avisos, solicitudes } = falsos();
    const { respuestas, estado } = await conversar(s, [
      "hola",
      "3",
      "2",
      "4",
      "María Pérez",
      "Maria@Correo.com",
      "este",
    ]);
    expect(respuestas[1][0]).toContain("3️⃣ Placas extranjeras");
    const lista = respuestas[2][0];
    expect(lista).toContain("1. MOTO — MOTOCICLETAS");
    expect(lista).toContain("4. PICK UP — PLAN BÁSICO PARTICULAR PICK UP");
    expect(lista).not.toContain("TAXI");
    expect(lista).toContain("0414-7221091");
    const ficha = respuestas[3][0];
    expect(ficha).toContain("45,00 € · 50,37$ · Bs. 44.058,55");
    expect(ficha).toContain(REQUISITOS.privado[0]);
    expect(respuestas[3][1]).toContain("nombre");
    expect(respuestas[4][0]).toContain("María");
    expect(respuestas[6][0]).toContain("asesor");
    expect(solicitudes).toEqual([
      {
        nombre: "María Pérez",
        correo: "maria@correo.com",
        telefono: "584121234567",
        whatsapp: "584121234567",
        categoria: "privado",
        planId: "pick-up",
        clase: "PICK UP",
        descripcion: "PLAN BÁSICO PARTICULAR PICK UP",
        precioEur: 45,
        precioUsd: 50.37,
        precioBs: 44058.55,
        precioCop: null,
        financiamiento: null,
      },
    ]);
    expect(avisos[0]).toContain("Transporte privado");
    expect(avisos[0]).toContain("PICK UP");
    expect(estado?.paso).toBe("menu");
  });

  test("público → minibuses pregunta financiamiento; taxi no", async () => {
    const { s, solicitudes, avisos } = falsos();
    const { respuestas } = await conversar(s, [
      "hola",
      "3",
      "publico",
      "7",
      "si",
      "José Rodríguez",
      "jose@gmail.com",
      "0414-555.12.34",
    ]);
    expect(respuestas[2][0]).toContain("7. MINIBUSES URBANOS Y SUBURBANOS");
    expect(respuestas[3][0]).toContain("131,00 €");
    expect(respuestas[3][0]).toContain(REQUISITOS.publico[3]);
    expect(respuestas[3][1]).toContain("financiar");
    expect(solicitudes[0].financiamiento).toBe(true);
    expect(solicitudes[0].telefono).toBe("04145551234");
    expect(avisos[0]).toContain("Financiamiento: Sí");

    const taxi = await conversar(falsos().s, ["hola", "3", "1", "6"]);
    expect(taxi.respuestas[3][1]).not.toContain("financiar");
    expect(taxi.estado?.paso).toBe("rcv_nombre");
  });

  test("placas extranjeras → cotización y requisitos sin lista", async () => {
    const { s } = falsos();
    const { respuestas, estado } = await conversar(s, ["hola", "3", "3"]);
    expect(respuestas[2][0]).toContain("Solicitar cotización");
    expect(respuestas[2][0]).toContain(REQUISITOS.extranjeras[0]);
    expect(estado?.paso).toBe("rcv_nombre");
    expect(estado?.rcv?.plan?.id).toBe("placas-extranjeras");
  });

  test("sin tasas el chat muestra solo euros; oculto no aparece", async () => {
    const { s } = falsos({
      rcv: async () => ({
        ...datosRcv,
        tasas: null,
        planes: datosRcv.planes.map((p) =>
          p.id === "taxi" ? { ...p, activo: false } : p,
        ),
      }),
    });
    const { respuestas } = await conversar(s, ["hola", "3", "1", "1"]);
    expect(respuestas[2][0]).not.toContain("TAXI");
    expect(respuestas[3][0]).toContain("💵 Precio: 15,00 €\n");
  });

  test("datos inválidos se vuelven a pedir", async () => {
    const { s, solicitudes } = falsos();
    const { respuestas, estado } = await conversar(s, [
      "hola",
      "3",
      "2",
      "9",
      "1",
      "María",
      "María Pérez",
      "maria",
      "maria@correo.com",
      "123",
    ]);
    expect(respuestas[3][0]).toContain(T.NO_ENTENDI[0]);
    expect(respuestas[5][0]).toBe(T.RCV_NOMBRE_INVALIDO[0]);
    expect(respuestas[7][0]).toBe(T.RCV_CORREO_INVALIDO[0]);
    expect(respuestas[9][0]).toBe(T.RCV_TELEFONO_INVALIDO[0]);
    expect(estado?.paso).toBe("rcv_telefono");
    expect(solicitudes).toHaveLength(0);
  });

  test("validadores de datos", () => {
    expect(nombreValido("  ana   maría  ")).toBe("ana maría");
    expect(nombreValido("Ana")).toBeNull();
    expect(nombreValido("Ana 123")).toBeNull();
    expect(correoValido(" A@B.co ")).toBe("a@b.co");
    expect(correoValido("a@b")).toBeNull();
    expect(telefonoValido("+58 412-123-4567", contacto)).toBe("584121234567");
    expect(telefonoValido("el mismo", contacto)).toBe("584121234567");
    expect(telefonoValido("llámame", contacto)).toBeNull();
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
