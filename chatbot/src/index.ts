import { join } from "node:path";
import {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  isLidUser,
  isPnUser,
  makeWASocket,
  normalizeMessageContent,
  useMultiFileAuthState,
  type WAMessage,
  type WAMessageKey,
  type WASocket,
} from "baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";
import { catalogo } from "./catalogo";
import { config } from "./config";
import { enviados, idsDelBot, responder } from "./envio";
import { escribirChat, estaPausado, leerChat, pausar } from "./estado";
import { decidir } from "./flujo";
import { avisoAsesor } from "./textos";

const inicio = Date.now();
let sock: WASocket;
let reintentos = 0;
let codigoPedido = false;

/** Espera para juntar varios mensajes seguidos del cliente en una sola respuesta. */
const AGRUPAR_MS = 3_500;
const pendientes = new Map<
  string,
  {
    textos: string[];
    claves: WAMessageKey[];
    nombre?: string;
    timer: NodeJS.Timeout;
  }
>();

function textoDe(m: WAMessage): string | undefined {
  const c = normalizeMessageContent(m.message);
  return (
    c?.conversation ??
    c?.extendedTextMessage?.text ??
    c?.imageMessage?.caption ??
    c?.videoMessage?.caption ??
    c?.buttonsResponseMessage?.selectedDisplayText ??
    c?.listResponseMessage?.title ??
    undefined
  )?.trim();
}

/** Teléfono (solo dígitos) del contacto, si WhatsApp lo da (con LID puede venir en remoteJidAlt). */
function telefonoDe(key: WAMessageKey): string | undefined {
  const pn = isPnUser(key.remoteJid ?? "") ? key.remoteJid : key.remoteJidAlt;
  return pn?.split("@")[0].split(":")[0];
}

async function atender(jid: string) {
  const p = pendientes.get(jid);
  pendientes.delete(jid);
  if (!p || estaPausado(jid)) return;

  const estado = leerChat(jid);
  const texto = p.textos.join(" ").trim();
  // Fotos, audios o stickers en una conversación ya empezada: que los vea una persona.
  if (!texto && estado.saludado) return;

  const decision = decidir(texto, estado, await catalogo(), Date.now(), {
    agotados: config.agotados,
    zonaHoraria: config.zonaHoraria,
  });
  escribirChat(jid, decision.estado);
  if (decision.pasarAAsesor) pausar(jid);
  if (decision.respuestas.length > 0) {
    await responder(() => sock, jid, decision.respuestas, p.claves);
  }
  if (decision.pasarAAsesor && config.numeroAvisos) {
    const contacto = telefonoDe(p.claves[0]) ?? jid;
    await responder(
      () => sock,
      `${config.numeroAvisos}@s.whatsapp.net`,
      [avisoAsesor(`+${contacto}`, p.nombre)],
      [],
    );
  }
}

function recibir(m: WAMessage) {
  const jid = m.key.remoteJid;
  // Solo chats privados: nada de grupos, estados, difusiones ni canales.
  if (!jid || !(isPnUser(jid) || isLidUser(jid))) return;
  // Nada de mensajes viejos (al reconectar WhatsApp reenvía lo pendiente).
  if (Number(m.messageTimestamp) * 1000 < inicio - 30_000) return;

  if (m.key.fromMe) {
    // Si escribiste tú desde el teléfono, el bot se calla en ese chat.
    if (m.key.id && !idsDelBot.has(m.key.id)) {
      pausar(jid);
      pendientes.delete(jid);
      console.log(`[bot] pausado en ${jid}: respondiste tú`);
    }
    return;
  }

  const tel = telefonoDe(m.key);
  // El número de avisos es el tuyo: no le contestamos como a un cliente.
  if (tel && tel === config.numeroAvisos) return;
  if (
    config.soloNumeros.length > 0 &&
    !(tel && config.soloNumeros.includes(tel))
  ) {
    return;
  }
  if (estaPausado(jid)) return;

  const p = pendientes.get(jid) ?? {
    textos: [],
    claves: [],
    timer: setTimeout(() => {}, 0),
  };
  clearTimeout(p.timer);
  const texto = textoDe(m);
  if (texto) p.textos.push(texto);
  p.claves.push(m.key);
  p.nombre = m.pushName ?? p.nombre;
  p.timer = setTimeout(() => {
    atender(jid).catch((e) => console.error("[bot] error atendiendo", e));
  }, AGRUPAR_MS);
  pendientes.set(jid, p);
}

async function conectar() {
  // biome-ignore lint/correctness/useHookAtTopLevel: no es un hook de React, es de Baileys.
  const { state, saveCreds } = await useMultiFileAuthState(
    join(config.carpetaDatos, "sesion"),
  );
  const { version } = await fetchLatestBaileysVersion().catch(() => ({
    version: undefined,
  }));

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "warn" }),
    browser: Browsers.ubuntu("Chrome"),
    // No aparecer "en línea" todo el tiempo y que tu teléfono siga recibiendo notificaciones.
    markOnlineOnConnect: false,
    syncFullHistory: false,
    getMessage: async (key) => (key.id ? enviados.get(key.id) : undefined),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (u) => {
    if (u.qr) {
      if (config.numeroBot) {
        if (!codigoPedido) {
          codigoPedido = true;
          const codigo = await sock.requestPairingCode(config.numeroBot);
          console.log(
            `\nCódigo de vinculación: ${codigo}\nEn el teléfono: WhatsApp › Dispositivos vinculados › Vincular › "Vincular con número de teléfono".\n`,
          );
        }
      } else {
        console.log(
          "\nEscanea este QR: WhatsApp › Dispositivos vinculados › Vincular.\n",
        );
        qrcode.generate(u.qr, { small: true });
      }
    }

    if (u.connection === "open") {
      reintentos = 0;
      console.log("[bot] conectado ✅");
    }

    if (u.connection === "close") {
      const codigo = (
        u.lastDisconnect?.error as
          | { output?: { statusCode?: number } }
          | undefined
      )?.output?.statusCode;
      if (codigo === DisconnectReason.loggedOut) {
        console.error(
          "[bot] la sesión se cerró desde el teléfono. Borra la carpeta datos/sesion y vuelve a vincular.",
        );
        process.exit(1);
      }
      if (codigo === DisconnectReason.connectionReplaced) {
        console.error(
          "[bot] otra instancia del bot tomó la sesión. Deja corriendo solo una.",
        );
        process.exit(1);
      }
      if (codigo === DisconnectReason.forbidden) {
        console.error(
          "[bot] WhatsApp rechazó la cuenta (403): posible restricción o baneo.",
        );
        process.exit(1);
      }
      const espera = Math.min(60_000, 2_000 * 2 ** reintentos++);
      console.warn(
        `[bot] desconectado (${codigo}), reconectando en ${espera / 1000}s`,
      );
      setTimeout(() => conectar().catch(console.error), espera);
    }
  });

  sock.ev.on("messages.upsert", ({ messages, type }) => {
    if (type !== "notify") return;
    for (const m of messages) recibir(m);
  });
}

conectar().catch((e) => {
  console.error(e);
  process.exit(1);
});
