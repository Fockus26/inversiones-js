import { config } from "./config";
import { guardarEstado, leerEstado, marcarProcesado } from "./estado";
import { enviarTexto, marcarLeido } from "./evolution";
import { type Contacto, type Entrada, procesar } from "./flujo";
import { correoCuentaServicio } from "./google";
import { iniciarRecordatorios } from "./recordatorios";
import { servicios } from "./servicios";

/**
 * Servidor de Gaby. Evolution API manda cada mensaje entrante a POST /webhook/<token>;
 * se responde 200 al instante y el mensaje se procesa en segundo plano, en orden por chat.
 */

interface MensajeEvolution {
  key?: {
    remoteJid?: string;
    remoteJidAlt?: string;
    senderPn?: string;
    fromMe?: boolean;
    id?: string;
  };
  pushName?: string;
  messageTimestamp?: number | string;
  message?: {
    conversation?: string;
    extendedTextMessage?: { text?: string };
    imageMessage?: { caption?: string };
    videoMessage?: { caption?: string };
    buttonsResponseMessage?: { selectedDisplayText?: string };
    listResponseMessage?: { title?: string };
    locationMessage?: {
      degreesLatitude?: number;
      degreesLongitude?: number;
      name?: string;
      address?: string;
    };
  };
}

/** Mensajes más viejos que esto se ignoran (historial que llega al vincular el número). */
const ANTIGUEDAD_MAX_S = 5 * 60;

const colas = new Map<string, Promise<void>>();

function enCola(jid: string, tarea: () => Promise<void>): void {
  const previa = colas.get(jid) ?? Promise.resolve();
  const siguiente = previa
    .then(tarea)
    .catch((e) => console.error("Error con", jid, e));
  colas.set(jid, siguiente);
  siguiente.finally(() => {
    if (colas.get(jid) === siguiente) colas.delete(jid);
  });
}

const digitos = (jid?: string) =>
  jid?.endsWith("@s.whatsapp.net") ? jid.split("@")[0].split(":")[0] : "";

function entradaDe(m: MensajeEvolution): Entrada {
  const msg = m.message ?? {};
  const texto =
    msg.conversation ??
    msg.extendedTextMessage?.text ??
    msg.buttonsResponseMessage?.selectedDisplayText ??
    msg.listResponseMessage?.title ??
    msg.imageMessage?.caption ??
    msg.videoMessage?.caption ??
    "";
  const loc = msg.locationMessage;
  const ubicacion =
    loc?.degreesLatitude != null && loc.degreesLongitude != null
      ? [
          [loc.name, loc.address].filter(Boolean).join(", "),
          `https://maps.google.com/?q=${loc.degreesLatitude},${loc.degreesLongitude}`,
        ]
          .filter(Boolean)
          .join(" ")
      : undefined;
  return { texto, ubicacion };
}

async function atender(m: MensajeEvolution): Promise<void> {
  const key = m.key ?? {};
  const jid = key.remoteJid ?? "";
  if (!jid || key.fromMe || !key.id) return;
  // Solo chats individuales: nada de grupos, estados, canales ni listas de difusión.
  if (!/@(s\.whatsapp\.net|lid)$/.test(jid)) return;
  const ts = Number(m.messageTimestamp ?? 0);
  if (ts && Date.now() / 1000 - ts > ANTIGUEDAD_MAX_S) return;
  if (!marcarProcesado(key.id)) return;

  const contacto: Contacto = {
    jid,
    telefono:
      digitos(jid) || digitos(key.remoteJidAlt) || digitos(key.senderPn),
    nombre: m.pushName ?? "",
  };
  const entrada = entradaDe(m);

  enCola(jid, async () => {
    await marcarLeido(jid, key.id as string);
    const r = await procesar(leerEstado(jid), entrada, contacto, servicios);
    guardarEstado(jid, r.estado);
    for (const texto of r.respuestas) await enviarTexto(jid, texto);
  });
}

const servidor = Bun.serve({
  port: config.puerto,
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "GET" && url.pathname === "/salud") {
      return Response.json({ ok: true, instancia: config.instancia });
    }
    if (
      req.method === "POST" &&
      url.pathname === `/webhook/${config.webhookToken}`
    ) {
      const cuerpo = (await req.json().catch(() => null)) as {
        event?: string;
        data?: MensajeEvolution | MensajeEvolution[];
      } | null;
      const evento = (cuerpo?.event ?? "").toLowerCase().replace("_", ".");
      if (evento === "messages.upsert" && cuerpo?.data) {
        const lista = Array.isArray(cuerpo.data) ? cuerpo.data : [cuerpo.data];
        for (const m of lista) {
          atender(m).catch((e) => console.error("Error atendiendo mensaje", e));
        }
      } else if (evento === "connection.update") {
        console.log("Conexión WhatsApp:", JSON.stringify(cuerpo?.data));
      }
      return new Response("ok");
    }
    return new Response("no encontrado", { status: 404 });
  },
});

iniciarRecordatorios();
console.log(
  `Gaby escuchando en :${servidor.port} · instancia ${config.instancia} · cuenta ${correoCuentaServicio} · asesores: ${config.asesores.length}`,
);
