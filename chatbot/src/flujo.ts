import {
  lineasDeProducto,
  type OpcionesTextoLista,
  type ProductoDeLista,
  textoListaDePrecios,
} from "../../lib/catalogo/texto-lista";
import { buscar, palabras } from "./buscar";
import * as T from "./textos";

/**
 * Flujo de conversación, puro (sin WhatsApp ni Firebase) para poder probarlo.
 * Dado lo que escribió el cliente y el estado de su chat, decide qué responder.
 */

export interface EstadoChat {
  /** Ya le mandamos el saludo con el menú. */
  saludado: boolean;
  /** ms epoch de la última lista completa enviada (para no reenviarla en bucle). */
  ultimaLista?: number;
  /** ms epoch del último "no entendí" (para no contestar a cada "ok"). */
  ultimoNoEntendi?: number;
}

export interface Decision {
  respuestas: string[];
  estado: EstadoChat;
  /** El cliente pidió asesor: el bot se calla en este chat y se avisa al dueño. */
  pasarAAsesor?: boolean;
}

const MIN = 60_000;
const LISTA_REPETIDA_MS = 5 * MIN;
const NO_ENTENDI_MS = 10 * MIN;

const SALUDOS = new Set([
  "hola",
  "buenas",
  "buenos",
  "buen",
  "saludos",
  "hey",
  "epa",
  "info",
  "informacion",
  "menu",
]);
const PIDE_LISTA = new Set(["lista", "precios", "precio", "catalogo"]);
const PIDE_ASESOR = new Set([
  "asesor",
  "asesora",
  "humano",
  "persona",
  "vendedor",
  "comprar",
  "apartar",
]);
const ACUSE = new Set(["ok", "listo", "dale", "vale", "bien", "perfecto"]);

export function estadoInicial(): EstadoChat {
  return { saludado: false };
}

export function decidir(
  texto: string,
  estado: EstadoChat,
  productos: readonly ProductoDeLista[] | null,
  ahora: number,
  opciones: OpcionesTextoLista = {},
): Decision {
  const w = palabras(texto);
  const solo = w.length === 1 ? w[0] : undefined;
  const nuevo: EstadoChat = { ...estado, saludado: true };

  const enviarLista = (): Decision => {
    if (!productos) return { respuestas: [T.SIN_CATALOGO], estado: nuevo };
    if (estado.ultimaLista && ahora - estado.ultimaLista < LISTA_REPETIDA_MS) {
      return { respuestas: [T.LISTA_RECIENTE], estado: nuevo };
    }
    return {
      respuestas: [
        textoListaDePrecios(productos, new Date(ahora), opciones),
        T.TRAS_PRODUCTO,
      ],
      estado: { ...nuevo, ultimaLista: ahora },
    };
  };

  if (solo === "3" || w.some((x) => PIDE_ASESOR.has(x))) {
    return { respuestas: [T.ASESOR], estado: nuevo, pasarAAsesor: true };
  }

  if (solo === "1") return enviarLista();
  if (solo === "2") return { respuestas: [T.PEDIR_MODELO], estado: nuevo };

  // Antes que el saludo: "hola, cuánto está el note 15" debe responder el modelo.
  const visibles = (productos ?? []).filter((p) => p.activo);
  const encontrados = buscar(visibles, texto);
  if (encontrados.length > 0) {
    const ocultarAgotados = opciones.agotados === "ocultar";
    const mostrar = ocultarAgotados
      ? encontrados.filter((p) => p.cantidad > 0)
      : encontrados;
    if (mostrar.length === 0) {
      return { respuestas: [T.TODOS_AGOTADOS], estado: nuevo };
    }
    const bloque = mostrar
      .map((p) =>
        lineasDeProducto(p, { agotados: opciones.agotados }).join("\n"),
      )
      .join("\n\n");
    const hayDisponible = mostrar.some((p) => p.cantidad > 0);
    return {
      respuestas: [
        `*${mostrar[0].marca}*\n${bloque}`,
        hayDisponible ? T.TRAS_PRODUCTO : T.TODOS_AGOTADOS,
      ],
      estado: nuevo,
    };
  }

  if (w.length <= 5 && w.some((x) => PIDE_LISTA.has(x))) return enviarLista();

  if (!estado.saludado || w.some((x) => SALUDOS.has(x))) {
    return { respuestas: [T.SALUDO], estado: nuevo };
  }

  if (w.length > 0 && w.length <= 3 && w.every((x) => ACUSE.has(x))) {
    return { respuestas: [], estado: nuevo };
  }
  if (w.some((x) => x === "gracias" || x === "grax")) {
    return { respuestas: [T.GRACIAS], estado: nuevo };
  }

  // No entendimos: contestamos como mucho una vez cada 10 min; si no, silencio
  // (dos bots o un cliente insistente no deben generar una ráfaga de mensajes).
  if (
    estado.ultimoNoEntendi &&
    ahora - estado.ultimoNoEntendi < NO_ENTENDI_MS
  ) {
    return { respuestas: [], estado: nuevo };
  }
  return {
    respuestas: [productos ? T.NO_ENCONTRADO : T.SIN_CATALOGO],
    estado: { ...nuevo, ultimoNoEntendi: ahora },
  };
}
