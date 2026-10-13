import {
  formatearFechaCorta,
  formatearMonto,
  type ProductoDeLista,
} from "../../lib/catalogo/texto-lista";
import { compararMarcas } from "../../lib/catalogo/tipos";
import type { Turno } from "../../lib/horario/turnos";
import {
  type CategoriaRcv,
  NOMBRES_CATEGORIA,
  type SolicitudRcv,
} from "../../lib/rcv/tipos";
import {
  type DatosRcvFirestore,
  type PlanMostrado,
  planesMostrados,
  TELEFONO_RCV,
  textoPrecio,
} from "./rcv";
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
  | "rcv_tipo"
  | "rcv_plan"
  | "rcv_vehiculo"
  | "rcv_financiamiento"
  | "rcv_nombre"
  | "rcv_correo"
  | "rcv_telefono";

export interface DatosCita {
  direccion: string;
}

/** Lo que se va juntando en el flujo de póliza RCV. */
export interface DatosRcv {
  categoria: CategoriaRcv;
  /** Planes mostrados (para traducir "2" → plan). */
  planes?: PlanMostrado[];
  plan?: PlanMostrado;
  /** Requisitos (los mismos para todo vehículo, D034), leídos al mostrar la lista. */
  requisitos?: string[];
  /** Placas extranjeras: el vehículo como lo describe el cliente, para cotizar (D034). */
  vehiculo?: string;
  financiamiento?: boolean;
  nombre?: string;
  correo?: string;
}

export interface Estado {
  paso: Paso;
  /** Horarios ofrecidos (para traducir "2" → turno). */
  turnos?: Turno[];
  turnoElegido?: Turno;
  /** Equipos mostrados (para traducir "5" → equipo). */
  equipos?: string[];
  rcv?: DatosRcv;
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
  /** Transportes, tasas y requisitos de la póliza RCV (panel /rcv). */
  rcv(): Promise<DatosRcvFirestore>;
  /** Guarda nombre, correo y teléfono de quien pidió la póliza. */
  guardarSolicitudRcv(solicitud: SolicitudRcv): Promise<void>;
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

function categoriaRcv(texto: string): CategoriaRcv | null {
  const num = numeroElegido(texto);
  const n = normalizar(texto);
  if (num === 1 || /public/.test(n)) return "publico";
  if (num === 2 || /privad|particular/.test(n)) return "privado";
  if (num === 3 || /extranjer/.test(n)) return "extranjeras";
  return null;
}

function listaPlanes(planes: PlanMostrado[]): string {
  return planes
    .map((p, i) => `${i + 1}. ${p.clase} — ${p.descripcion}`)
    .join("\n");
}

/** Precio y requisitos del plan elegido. */
export function fichaPlan(plan: PlanMostrado, requisitos: string[]): string {
  return [
    `🚗 *${plan.clase}* — ${plan.descripcion}`,
    `💵 Precio: ${textoPrecio(plan.precios)}`,
    "",
    "📋 Requisitos:",
    requisitos.map((r) => `• ${r}`).join("\n"),
  ].join("\n");
}

/** Nombre y apellido: al menos dos palabras con letras. */
export function nombreValido(texto: string): string | null {
  const limpio = texto.trim().replace(/\s+/g, " ");
  const palabras = limpio.split(" ");
  if (palabras.length < 2 || limpio.length > 80) return null;
  if (!palabras.every((p) => /^[\p{L}'.-]+$/u.test(p))) return null;
  return limpio;
}

export function correoValido(texto: string): string | null {
  const c = texto.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(c) && c.length <= 120 ? c : null;
}

/** Solo dígitos (con o sin +58, guiones o espacios); "este" = el número de WhatsApp. */
export function telefonoValido(
  texto: string,
  contacto: Contacto,
): string | null {
  const n = normalizar(texto);
  if (/^(este|el mismo|mismo|este mismo|este numero|el de whatsapp)$/.test(n)) {
    return contacto.telefono || null;
  }
  if (!/^[+\d\s().-]+$/.test(texto.trim())) return null;
  const digitos = texto.replace(/\D/g, "");
  return digitos.length >= 10 && digitos.length <= 15 ? digitos : null;
}

function primerNombre(nombre: string): string {
  return nombre.split(" ")[0] ?? nombre;
}

async function ofrecerPlanes(
  s: Servicios,
  contacto: Contacto,
  categoria: CategoriaRcv,
): Promise<Resultado> {
  let planes: PlanMostrado[] = [];
  let requisitos: string[] = [];
  try {
    const datos = await s.rcv();
    planes = planesMostrados(datos, categoria);
    requisitos = datos.requisitos;
  } catch (e) {
    console.error("No se pudieron leer los planes RCV", e);
  }
  if (planes.length === 0) {
    await s.avisarAsesor(
      `🚗 Póliza RCV: no se pudieron mostrar los planes.\nCliente: ${contacto.nombre || "—"} (+${contacto.telefono})\nTipo: ${NOMBRES_CATEGORIA[categoria]}`,
    );
    return {
      respuestas: [T.elegir(T.RCV_SIN_PLANES, {}, s.azar)],
      estado: nuevo("menu", s),
    };
  }
  const intro = T.elegir(
    T.RCV_LISTA,
    { categoria: NOMBRES_CATEGORIA[categoria].toLowerCase() },
    s.azar,
  );
  const noAparece = T.RCV_NO_APARECE.replace("{telefono}", TELEFONO_RCV);
  return {
    respuestas: [
      `${intro}\n\n${listaPlanes(planes)}\n\n${noAparece}\n\n${T.elegir(T.RCV_ELIGE, {}, s.azar)}`,
    ],
    estado: nuevo("rcv_plan", s, { rcv: { categoria, planes, requisitos } }),
  };
}

/**
 * Placas extranjeras (D034): no hay precio fijo. Se explican los requisitos y se pide el
 * vehículo para que el asesor cotice; después, los mismos datos que el resto.
 */
async function pedirVehiculoExtranjero(s: Servicios): Promise<Resultado> {
  let requisitos: string[] = [];
  try {
    requisitos = (await s.rcv()).requisitos;
  } catch (e) {
    console.error("No se pudieron leer los requisitos RCV", e);
  }
  const lista =
    requisitos.length > 0
      ? `\n\n📋 Requisitos:\n${requisitos.map((r) => `• ${r}`).join("\n")}`
      : "";
  return {
    respuestas: [
      `${T.elegir(T.RCV_EXTRANJERAS, {}, s.azar)}${lista}`,
      T.elegir(T.RCV_PIDE_VEHICULO, {}, s.azar),
    ],
    estado: nuevo("rcv_vehiculo", s, {
      rcv: { categoria: "extranjeras", requisitos },
    }),
  };
}

/** Descripción libre del vehículo: al menos 3 letras/números, hasta 120 caracteres. */
export function vehiculoValido(texto: string): string | null {
  const limpio = texto.trim().replace(/\s+/g, " ");
  if (limpio.length > 120) return null;
  return (limpio.match(/[\p{L}\d]/gu) ?? []).length >= 3 ? limpio : null;
}

function elegirPlan(
  s: Servicios,
  rcv: DatosRcv,
  plan: PlanMostrado,
): Resultado {
  const ficha = fichaPlan(plan, rcv.requisitos ?? []);
  const datos: DatosRcv = { categoria: rcv.categoria, plan };
  if (plan.financiamiento && rcv.categoria === "publico") {
    return {
      respuestas: [ficha, T.elegir(T.RCV_PREGUNTA_FINANCIAMIENTO, {}, s.azar)],
      estado: nuevo("rcv_financiamiento", s, { rcv: datos }),
    };
  }
  return {
    respuestas: [ficha, T.elegir(T.RCV_PIDE_NOMBRE, {}, s.azar)],
    estado: nuevo("rcv_nombre", s, { rcv: datos }),
  };
}

/** Lo que se guarda y se avisa: el plan elegido o, en placas extranjeras, el vehículo a cotizar. */
function planDeSolicitud(rcv: DatosRcv): PlanMostrado | null {
  if (rcv.plan) return rcv.plan;
  if (rcv.categoria === "extranjeras" && rcv.vehiculo)
    return {
      id: ID_COTIZACION_EXTRANJERA,
      clase: "PLACAS EXTRANJERAS",
      descripcion: "SOLICITAR COTIZACIÓN",
      precios: null,
      financiamiento: false,
    };
  return null;
}

export const ID_COTIZACION_EXTRANJERA = "cotizacion-extranjera";

async function cerrarRcv(
  s: Servicios,
  contacto: Contacto,
  rcv: DatosRcv,
  telefono: string,
): Promise<Resultado> {
  const { nombre, correo } = rcv;
  const plan = planDeSolicitud(rcv);
  if (!plan || !nombre || !correo) {
    return {
      respuestas: [menu(s, contacto, false)],
      estado: nuevo("menu", s),
    };
  }
  const solicitud: SolicitudRcv = {
    nombre,
    correo,
    telefono,
    whatsapp: contacto.telefono,
    categoria: rcv.categoria,
    planId: plan.id,
    clase: plan.clase,
    descripcion: plan.descripcion,
    ...(rcv.vehiculo ? { vehiculo: rcv.vehiculo } : {}),
    precioEur: plan.precios?.eur ?? null,
    precioUsd: plan.precios?.usd ?? null,
    precioBs: plan.precios?.bs ?? null,
    precioCop: plan.precios?.cop ?? null,
    financiamiento: rcv.financiamiento ?? null,
  };
  try {
    await s.guardarSolicitudRcv(solicitud);
  } catch (e) {
    // El aviso al asesor lleva los mismos datos: no se pierden.
    console.error("No se pudo guardar la solicitud RCV", e);
  }
  const financiamiento =
    rcv.financiamiento === undefined
      ? ""
      : `\nFinanciamiento: ${rcv.financiamiento ? "Sí" : "No"}`;
  const detalle = rcv.vehiculo
    ? `Vehículo: ${rcv.vehiculo}\nPrecio: por cotizar`
    : `Plan: ${plan.clase} — ${plan.descripcion}\nPrecio: ${textoPrecio(plan.precios)}`;
  await s.avisarAsesor(
    `🚗 Póliza RCV\nTipo: ${NOMBRES_CATEGORIA[rcv.categoria]}\n${detalle}${financiamiento}\nNombre: ${nombre}\nCorreo: ${correo}\nTeléfono: ${telefono}\nWhatsApp: +${contacto.telefono}`,
  );
  const confirmada = rcv.vehiculo
    ? T.RCV_COTIZACION_CONFIRMADA
    : T.RCV_CONFIRMADA;
  return {
    respuestas: [
      `${T.elegir(confirmada, { nombre: primerNombre(nombre) }, s.azar)}\n\n${T.elegir(T.MENU_DE_NUEVO, {}, s.azar)} Escribe *MENU* para ver las opciones.`,
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
            `${T.elegir(T.TELEFONO_ELEGIDO, { equipo }, s.azar)}\n\n${T.TELEFONO_REQUISITOS}\n\n${T.elegir(T.MENU_DE_NUEVO, {}, s.azar)} Escribe *MENU* para ver las opciones.`,
          ],
          estado: nuevo("menu", s),
        };
      }
      // No es un número de equipo: se trata como un mensaje del menú.
      break;
    }

    case "rcv_tipo": {
      const categoria = categoriaRcv(texto);
      if (!categoria) {
        return {
          respuestas: [
            `${T.elegir(T.NO_ENTENDI, {}, s.azar)} ${T.elegir(T.RCV_PREGUNTA, {}, s.azar)}\n\n${T.OPCIONES_RCV}`,
          ],
          estado: nuevo("rcv_tipo", s),
        };
      }
      if (categoria === "extranjeras") return pedirVehiculoExtranjero(s);
      return ofrecerPlanes(s, contacto, categoria);
    }

    case "rcv_vehiculo": {
      const rcv = estado.rcv;
      if (!rcv) break;
      const vehiculo = vehiculoValido(texto);
      if (!vehiculo) {
        return {
          respuestas: [T.elegir(T.RCV_VEHICULO_INVALIDO, {}, s.azar)],
          estado: nuevo("rcv_vehiculo", s, { rcv }),
        };
      }
      return {
        respuestas: [T.elegir(T.RCV_PIDE_NOMBRE, {}, s.azar)],
        estado: nuevo("rcv_nombre", s, { rcv: { ...rcv, vehiculo } }),
      };
    }

    case "rcv_plan": {
      const rcv = estado.rcv;
      if (!rcv) break;
      const planes = rcv.planes ?? [];
      const num = numeroElegido(texto);
      const plan = num ? planes[num - 1] : undefined;
      if (!plan) {
        return {
          respuestas: [
            `${T.elegir(T.NO_ENTENDI, {}, s.azar)} ${T.elegir(T.RCV_ELIGE, {}, s.azar)}\n\n${listaPlanes(planes)}`,
          ],
          estado: nuevo("rcv_plan", s, { rcv }),
        };
      }
      return elegirPlan(s, rcv, plan);
    }

    case "rcv_financiamiento": {
      const rcv = estado.rcv;
      if (!rcv) break;
      const si = esSi(texto);
      if (!si && !esNo(texto)) {
        return {
          respuestas: [
            `${T.elegir(T.NO_ENTENDI, {}, s.azar)} ${T.elegir(T.RCV_PREGUNTA_FINANCIAMIENTO, {}, s.azar)}`,
          ],
          estado: nuevo("rcv_financiamiento", s, { rcv }),
        };
      }
      return {
        respuestas: [T.elegir(T.RCV_PIDE_NOMBRE, {}, s.azar)],
        estado: nuevo("rcv_nombre", s, { rcv: { ...rcv, financiamiento: si } }),
      };
    }

    case "rcv_nombre": {
      const rcv = estado.rcv;
      if (!rcv) break;
      const nombre = nombreValido(texto);
      if (!nombre) {
        return {
          respuestas: [T.elegir(T.RCV_NOMBRE_INVALIDO, {}, s.azar)],
          estado: nuevo("rcv_nombre", s, { rcv }),
        };
      }
      return {
        respuestas: [
          T.elegir(T.RCV_PIDE_CORREO, { nombre: primerNombre(nombre) }, s.azar),
        ],
        estado: nuevo("rcv_correo", s, { rcv: { ...rcv, nombre } }),
      };
    }

    case "rcv_correo": {
      const rcv = estado.rcv;
      if (!rcv) break;
      const correo = correoValido(texto);
      if (!correo) {
        return {
          respuestas: [T.elegir(T.RCV_CORREO_INVALIDO, {}, s.azar)],
          estado: nuevo("rcv_correo", s, { rcv }),
        };
      }
      return {
        respuestas: [T.elegir(T.RCV_PIDE_TELEFONO, {}, s.azar)],
        estado: nuevo("rcv_telefono", s, { rcv: { ...rcv, correo } }),
      };
    }

    case "rcv_telefono": {
      const rcv = estado.rcv;
      if (!rcv) break;
      const telefono = telefonoValido(texto, contacto);
      if (!telefono) {
        return {
          respuestas: [T.elegir(T.RCV_TELEFONO_INVALIDO, {}, s.azar)],
          estado: nuevo("rcv_telefono", s, { rcv }),
        };
      }
      return cerrarRcv(s, contacto, rcv, telefono);
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
