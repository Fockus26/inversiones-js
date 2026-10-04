import type { proto, WAMessageKey, WASocket } from "baileys";
import { config } from "./config";

/**
 * Envío "humano" y con frenos (reglas anti-baneo, ver README):
 * - una sola cola global: nunca dos envíos a la vez, con pausa aleatoria entre ellos;
 * - marca como leído, "escribiendo…" con una duración según el largo del texto, y luego envía;
 * - tope por chat (MAX_POR_CHAT_10MIN) y global por hora (MAX_POR_HORA): si se pasan, no envía.
 */

const azar = (min: number, max: number) => min + Math.random() * (max - min);
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Ids de los mensajes que mandó el bot (para distinguirlos de los que escribes tú). */
export const idsDelBot = new Set<string>();
/** Mensajes enviados, por si WhatsApp pide reintentar (getMessage del socket). */
export const enviados = new Map<string, proto.IMessage>();

const porChat = new Map<string, number[]>();
let global: number[] = [];
let cola: Promise<void> = Promise.resolve();

function hayCupo(jid: string): boolean {
  const ahora = Date.now();
  global = global.filter((t) => ahora - t < 3_600_000);
  const delChat = (porChat.get(jid) ?? []).filter((t) => ahora - t < 600_000);
  porChat.set(jid, delChat);
  if (global.length >= config.maxPorHora) {
    console.warn("[envio] tope global por hora alcanzado, no se envía");
    return false;
  }
  if (delChat.length >= config.maxPorChat10Min) {
    console.warn(`[envio] tope por chat alcanzado en ${jid}, no se envía`);
    return false;
  }
  return true;
}

function recordar(id: string, mensaje: proto.IMessage | null | undefined) {
  idsDelBot.add(id);
  if (mensaje) enviados.set(id, mensaje);
  if (enviados.size > 500) {
    const viejo = enviados.keys().next().value;
    if (viejo) {
      enviados.delete(viejo);
      idsDelBot.delete(viejo);
    }
  }
}

/** Responde en `jid` con los textos dados, uno tras otro, como lo haría una persona. */
export function responder(
  sock: () => WASocket,
  jid: string,
  textos: string[],
  leer: WAMessageKey[],
): Promise<void> {
  const tarea = async () => {
    const s = sock();
    await esperar(azar(1_200, 3_000)); // "ve" el mensaje
    if (leer.length > 0) await s.readMessages(leer).catch(() => {});
    await s.presenceSubscribe(jid).catch(() => {});
    for (const texto of textos) {
      if (!hayCupo(jid)) return;
      await esperar(azar(400, 900));
      await s.sendPresenceUpdate("composing", jid).catch(() => {});
      // ~35 ms por carácter, entre 1,5 y 7 s, con algo de azar.
      await esperar(
        Math.min(7_000, Math.max(1_500, texto.length * 35)) + azar(0, 800),
      );
      await s.sendPresenceUpdate("paused", jid).catch(() => {});
      const enviado = await s.sendMessage(jid, { text: texto });
      const ahora = Date.now();
      global.push(ahora);
      porChat.get(jid)?.push(ahora);
      if (enviado?.key.id) recordar(enviado.key.id, enviado.message);
    }
    await esperar(azar(1_500, 3_500)); // respiro antes del siguiente chat
  };
  cola = cola.then(tarea).catch((e) => console.error("[envio] fallo", e));
  return cola;
}
