import {
  formatearFechaCorta,
  formatearMonto,
  type ProductoDeLista,
} from "../../lib/catalogo/texto-lista";
import { compararMarcas } from "../../lib/catalogo/tipos";
import type { Turno } from "../../lib/horario/turnos";
import * as T from "./textos";

/**
 * Árbol de conversación de Gaby. Puro salvo por los `Servicios` que recibe (catálogo,
 * agenda, avisos), así los tests lo recorren con datos falsos.
 */

export type Paso =
  | "menu"
  | "loteria_cita"
  | "loteria_horario"
  | "loteria_direccion"
  | "telefono_lista"
  | "rcv_tipo";

export interface DatosCita {
  direccion: string;
}

export interface Estado {
  paso: Paso;
  /** Horarios ofrecidos (para traducir "2" → turno). */
  turnos?: Turno[];
  turnoElegido?: Turno;
  /** Equipos mostrados (para traducir "5" → equipo). */
  equipos?: string[];
  /** ms epoch de la última interacción. */
  actualizado: number;
}

export interface Contacto {
  /** JID de WhatsApp para responder. */
  jid: string;
  /** Teléfono en dígitos (58412…), si se conoce. */
  telefono: string;
  /** Nombre de perfil de WhatsApp (puede venir vacío). */
  nombre: string;
}

export interface Servicios {
  catalogo(): Promise<ProductoDeLista[]>;
  turnosDisponibles(): Promise<Turno[]>;
  /** Crea la cita. `false` si el horario ya no está libre. */
  agendar(turno: Turno, contacto: Contacto, datos: DatosCita): Promise<boolean>;
  /** Aviso interno al asesor (WhatsApp). Puede no hacer nada si no hay número configurado. */
  avisarAsesor(texto: string): Promise<void>;
  ahora(): Date;
  azar(): number;
}

export interface Entrada {
  /** Texto del mensaje (vacío si es audio, foto, etc.). */
  texto: string;
  /** Si el cliente mandó una ubicación, su descripción. */
  ubicacion?: string;
}

export interface Resultado {
  respuestas: string[];
  estado: Estado;
}

/** Tras este tiempo sin escribir, la conversación vuelve a empezar con el saludo. */
export const INACTIVIDAD_MS = 2 * 3_600_000;

export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9ñ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PALABRAS_MENU = new Set([
  "menu",
  "hola",
  "inicio",
  "volver",
  "0",
  "buenas",
  "buenos dias",
  "buenas tardes",
  "buenas noches",
  "opciones",
]);

const NUMEROS: Record<string, number> = {
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
};

/** "2", "2.", "opcion 2", "la 2", "dos" → 2. */
export function numeroElegido(texto: string): number | null {
  const n = normalizar(texto);
  const m = n.match(/^(?:opcion |la |el |numero |nro )?(\d{1,2})$/);
  if (m) return Number(m[1]);
  return NUMEROS[n] ?? null;
}

export function esSi(texto: string): boolean {
  const n = normalizar(texto);
  return /^(si|sii+|s|claro|ok|okey|dale|por supuesto|si quiero|si por favor|si claro|de acuerdo|perfecto|me interesa|1)\b/.test(
    n,
  );
}

export function esNo(texto: string): boolean {
  const n = normalizar(texto);
  return /^(no|nop|nah|n|ahora no|todavia no|despues|luego|2)\b/.test(n);
}

function opcionDeMenu(texto: string): 1 | 2 | 3 | null {
  const num = numeroElegido(texto);
  if (num === 1 || num === 2 || num === 3) return num;
  const n = normalizar(texto);
  if (/loteri|agencia|emprend/.test(n)) return 1;
  if (/telefono|celular|credito|equipo/.test(n)) return 2;
  if (/poliza|rcv|seguro/.test(n)) return 3;
  return null;
}

function conNombre(contacto: Contacto): Record<string, string> {
  const primero = contacto.nombre.trim().split(/\s+/)[0] ?? "";
  // Solo nombres "normales": nada de emojis ni textos raros del perfil.
  const ok = /^[\p{L}]{2,20}$/u.test(primero);
  return { nombre: ok ? ` ${primero}` : "" };
}

function menu(s: Servicios, contacto: Contacto, saludo: boolean): string {
  const intro = saludo
    ? T.elegir(T.SALUDO, conNombre(contacto), s.azar)
    : T.elegir(T.MENU_DE_NUEVO, {}, s.azar);
  return `${intro}\n\n${T.OPCIONES_MENU}\n\n${T.elegir(T.PIE_MENU, {}, s.azar)}`;
}

function listaTurnos(turnos: Turno[]): string {
  return turnos.map((t, i) => `${i + 1}. ${t.etiqueta}`).join("\n");
}

function nuevo(paso: Paso, s: Servicios, extra: Partial<Estado> = {}): Estado {
  return { paso, actualizado: s.ahora().getTime(), ...extra };
}

/** Lista numerada de equipos con stock, agrupada por marca. */
export function listaEquipos(
  productos: ProductoDeLista[],
  fecha: Date,
): { texto: string; equipos: string[] } {
  const visibles = productos.filter((p) => p.activo && p.cantidad > 0);
  const marcas = [...new Set(visibles.map((p) => p.marca))].sort(
    compararMarcas,
  );
  const equipos: string[] = [];
  const bloques: string[] = [];
  for (const marca of marcas) {
    const lineas = visibles
      .filter((p) => p.marca === marca)
      .sort((a, b) => a.orden - b.orden)
      .map((p) => {
        const nombre = [marca, p.nombre.trim(), p.variante.trim()]
          .filter(Boolean)
          .join(" ");
        equipos.push(nombre);
        const quincenas = p.numeroCuotas === 1 ? "quincena" : "quincenas";
        return `${equipos.length}. ${[p.nombre.trim(), p.variante.trim()].filter(Boolean).join(" ")}\n    Inic ${formatearMonto(p.inicial)} · ${p.numeroCuotas} ${quincenas} de ${formatearMonto(p.cuota)}`;
      });
    bloques.push(`*${marca.toUpperCase()}*\n${lineas.join("\n")}`);
  }
  const titulo = `📱 Equipos disponibles (${formatearFechaCorta(fecha)})`;
  return { texto: `${titulo}\n\n${bloques.join("\n\n")}`, equipos };
}

async function ofrecerTurnos(
  s: Servicios,
  contacto: Contacto,
  intro: T.Variantes,
): Promise<Resultado> {
  let turnos: Turno[];
  try {
    turnos = await s.turnosDisponibles();
  } catch (e) {
    console.error("No se pudieron leer los horarios", e);
    await s.avisarAsesor(
      `⚠️ Gaby no pudo leer la agenda. Contactar a ${contacto.nombre || "cliente"} (+${contacto.telefono}) para cita de agencia de loterías.`,
    );
    return {
      respuestas: [T.elegir(T.ERROR_AGENDA, {}, s.azar)],
      estado: nuevo("menu", s),
    };
  }
  if (turnos.length === 0) {
    await s.avisarAsesor(
      `📅 Sin horarios libres. Contactar a ${contacto.nombre || "cliente"} (+${contacto.telefono}) para cita de agencia de loterías.`,
    );
    return {
      respuestas: [T.elegir(T.LOTERIA_SIN_HORARIOS, {}, s.azar)],
      estado: nuevo("menu", s),
    };
  }
  return {
    respuestas: [
      `${T.elegir(intro, {}, s.azar)}\n\n${listaTurnos(turnos)}\n\n${T.elegir(T.LOTERIA_ELIGE_HORARIO, {}, s.azar)}`,
    ],
    estado: nuevo("loteria_horario", s, { turnos }),
  };
}

async function agendar(
  s: Servicios,
  contacto: Contacto,
  turno: Turno,
  direccion: string,
): Promise<Resultado> {
  let ok: boolean;
  try {
    ok = await s.agendar(turno, contacto, { direccion });
  } catch (e) {
    console.error("No se pudo crear la cita", e);
    await s.avisarAsesor(
      `⚠️ Gaby no pudo guardar la cita en el calendario.\nCliente: ${contacto.nombre} (+${contacto.telefono})\nHorario pedido: ${turno.etiqueta}\nDirección: ${direccion}`,
    );
    return {
      respuestas: [T.elegir(T.ERROR_AGENDA, {}, s.azar)],
      estado: nuevo("menu", s),
    };
  }
  if (!ok) {
    const r = await ofrecerTurnos(s, contacto, T.LOTERIA_TURNO_OCUPADO);
    return r;
  }
  await s.avisarAsesor(
    `📅 Nueva cita (agencia de loterías)\nCliente: ${contacto.nombre || "—"} (+${contacto.telefono})\nCuándo: ${turno.etiqueta}\nDirección y contacto: ${direccion}`,
  );
  return {
    respuestas: [
      `${T.elegir(T.LOTERIA_CONFIRMADA, { turno: turno.etiqueta }, s.azar)}\n\n${T.elegir(T.MENU_DE_NUEVO, {}, s.azar)} Escribe *MENU* para ver las opciones.`,
    ],
    estado: nuevo("menu", s),
  };
}

export async function procesar(
  estadoPrevio: Estado | null,
  entrada: Entrada,
  contacto: Contacto,
  s: Servicios,
): Promise<Resultado> {
  const ahora = s.ahora().getTime();
  const vencido =
    !estadoPrevio || ahora - estadoPrevio.actualizado > INACTIVIDAD_MS;
  const estado: Estado = vencido
    ? { paso: "menu", actualizado: ahora }
    : estadoPrevio;
  const texto = entrada.texto.trim();
  const n = normalizar(texto);

  // Primer mensaje (o tras mucho tiempo) o pide el menú: saludo + opciones.
  if (vencido || PALABRAS_MENU.has(n)) {
    // Si el primer mensaje ya trae la opción ("quiero un teléfono a crédito"), se atiende.
    const directo = vencido && !PALABRAS_MENU.has(n) && opcionDeMenu(texto);
    if (!directo || numeroElegido(texto) !== null) {
      return {
        respuestas: [menu(s, contacto, true)],
        estado: nuevo("menu", s),
      };
    }
  }

  switch (estado.paso) {
    case "loteria_cita": {
      if (esSi(texto)) return ofrecerTurnos(s, contacto, T.LOTERIA_HORARIOS);
      if (esNo(texto)) {
        return {
          respuestas: [
            `${T.elegir(T.LOTERIA_NO, {}, s.azar)}\n\n${menu(s, contacto, false)}`,
          ],
          estado: nuevo("menu", s),
        };
      }
      return {
        respuestas: [
          `${T.elegir(T.NO_ENTENDI, {}, s.azar)} ${T.elegir(T.LOTERIA_PREGUNTA_CITA, {}, s.azar)}`,
        ],
        estado: nuevo("loteria_cita", s),
      };
    }

    case "loteria_horario": {
      const turnos = estado.turnos ?? [];
      const num = numeroElegido(texto);
      const turno = num ? turnos[num - 1] : undefined;
      if (!turno) {
        return {
          respuestas: [
            `${T.elegir(T.NO_ENTENDI, {}, s.azar)} ${T.elegir(T.LOTERIA_ELIGE_HORARIO, {}, s.azar)}\n\n${listaTurnos(turnos)}`,
          ],
          estado: nuevo("loteria_horario", s, { turnos }),
        };
      }
      return {
        respuestas: [T.elegir(T.LOTERIA_PIDE_DIRECCION, {}, s.azar)],
        estado: nuevo("loteria_direccion", s, { turnoElegido: turno }),
      };
    }

    case "loteria_direccion": {
      const turno = estado.turnoElegido;
      if (!turno) return ofrecerTurnos(s, contacto, T.LOTERIA_HORARIOS);
      const direccion = entrada.ubicacion
        ? [entrada.ubicacion, texto].filter(Boolean).join(" — ")
        : texto;
      if (direccion.length < 10) {
        return {
          respuestas: [T.elegir(T.LOTERIA_DIRECCION_CORTA, {}, s.azar)],
          estado: nuevo("loteria_direccion", s, { turnoElegido: turno }),
        };
      }
      return agendar(s, contacto, turno, direccion);
    }

    case "telefono_lista": {
      const equipos = estado.equipos ?? [];
      const num = numeroElegido(texto);
      const equipo = num ? equipos[num - 1] : undefined;
      if (equipo) {
        await s.avisarAsesor(
          `📱 Interesado en teléfono a crédito\nCliente: ${contacto.nombre || "—"} (+${contacto.telefono})\nEquipo: ${equipo}`,
        );
        return {
          respuestas: [
            `${T.elegir(T.TELEFONO_ELEGIDO, { equipo }, s.azar)}\n\n${T.elegir(T.MENU_DE_NUEVO, {}, s.azar)} Escribe *MENU* para ver las opciones.`,
          ],
          estado: nuevo("menu", s),
        };
      }
      // No es un número de equipo: se trata como un mensaje del menú.
      break;
    }

    case "rcv_tipo": {
      const num = numeroElegido(texto);
      let tipo: string | null = null;
      if (num === 1 || /public/.test(n)) tipo = "Transporte público";
      else if (num === 2 || /privad|particular/.test(n))
        tipo = "Transporte privado";
      if (!tipo) {
        return {
          respuestas: [
            `${T.elegir(T.NO_ENTENDI, {}, s.azar)} ${T.elegir(T.RCV_PREGUNTA, {}, s.azar)}\n\n${T.OPCIONES_RCV}`,
          ],
          estado: nuevo("rcv_tipo", s),
        };
      }
      await s.avisarAsesor(
        `🚗 Póliza RCV\nCliente: ${contacto.nombre || "—"} (+${contacto.telefono})\nTipo: ${tipo}`,
      );
      return {
        respuestas: [T.elegir(T.RCV_CONFIRMADA, {}, s.azar)],
        estado: nuevo("menu", s),
      };
    }

    case "menu":
      break;
  }

  // Paso "menu": elegir opción.
  switch (opcionDeMenu(texto)) {
    case 1:
      return {
        respuestas: [
          `${T.elegir(T.LOTERIA_INFO, {}, s.azar)}\n\n${T.elegir(T.LOTERIA_PREGUNTA_CITA, {}, s.azar)}`,
        ],
        estado: nuevo("loteria_cita", s),
      };
    case 2: {
      const info = T.elegir(T.TELEFONO_INFO, {}, s.azar);
      let lista: ReturnType<typeof listaEquipos> | null = null;
      try {
        lista = listaEquipos(await s.catalogo(), s.ahora());
      } catch (e) {
        console.error("No se pudo leer el catálogo", e);
      }
      if (!lista || lista.equipos.length === 0) {
        await s.avisarAsesor(
          `📱 Pidió la lista de teléfonos pero no se pudo mostrar.\nCliente: ${contacto.nombre || "—"} (+${contacto.telefono})`,
        );
        return {
          respuestas: [
            `${info}\n\n${T.elegir(T.TELEFONO_SIN_EQUIPOS, {}, s.azar)}`,
          ],
          estado: nuevo("menu", s),
        };
      }
      return {
        respuestas: [
          info,
          `${T.elegir(T.TELEFONO_LISTA, {}, s.azar)}\n\n${lista.texto}\n\n${T.elegir(T.TELEFONO_ELIGE, {}, s.azar)} (Escribe *MENU* para volver al inicio.)`,
        ],
        estado: nuevo("telefono_lista", s, { equipos: lista.equipos }),
      };
    }
    case 3:
      return {
        respuestas: [
          `${T.elegir(T.RCV_INFO, {}, s.azar)}\n\n${T.elegir(T.RCV_PREGUNTA, {}, s.azar)}\n\n${T.OPCIONES_RCV}`,
        ],
        estado: nuevo("rcv_tipo", s),
      };
    default:
      return {
        respuestas: [
          `${T.elegir(T.NO_ENTENDI, {}, s.azar)}\n\n${T.OPCIONES_MENU}\n\n${T.elegir(T.PIE_MENU, {}, s.azar)}`,
        ],
        estado: nuevo("menu", s),
      };
  }
}
