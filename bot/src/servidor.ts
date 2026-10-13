import { avisosPushActivos } from "./avisos-push";
import { config } from "./config";
import { type Comando, Cupos, comandoDe } from "./control";
import {
  chatPausado,
  chatsPausados,
  fijarGabyActiva,
  gabyActiva,
  guardarEstado,
  leerEstado,
  marcarProcesado,
  pausarChat,
  reanudarChats,
} from "./estado";
import { enviarTexto, marcarLeido, numeroPropio, registro } from "./evolution";
import { type Contacto, type Entrada, procesar } from "./flujo";
import { correoCuentaServicio } from "./google";
import { iniciarRecordatorios } from "./recordatorios";
import { servicios } from "./servicios";
import { iniciarVencimientos } from "./vencimientos";

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

const cupos = new Cupos(config.maxPorChat10Min, config.maxPorHora);

/** Número del WhatsApp vinculado (para reconocer "Mensajes para mí"); se lee al conectar. */
let propio: string | null = null;
const leerPropio = () =>
  numeroPropio().then((n) => {
    if (n) propio = n;
  });

/** Aplica gaby on/off/estado y devuelve el texto de confirmación. */
function ejecutar(comando: Comando): string {
  if (comando === "off") {
    fijarGabyActiva(false);
    return "🔴 *Gaby apagada.* Ahora respondes tú: no contestará a nadie hasta que escribas *gaby on*. (Los recordatorios de citas ya agendadas sí siguen saliendo.)";
  }
  if (comando === "on") {
    fijarGabyActiva(true);
    reanudarChats();
    return "🟢 *Gaby encendida.* Vuelve a responder a todos, también en los chats donde habías escrito tú.";
  }
  const pausados = chatsPausados();
  return `Gaby está ${gabyActiva() ? "🟢 *encendida*" : "🔴 *apagada*"}.${
    pausados > 0
      ? ` Chats donde está callada porque escribiste tú: ${pausados}.`
      : ""
  }\nComandos: *gaby on* · *gaby off* · *gaby estado*`;
}

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
  if (!jid || !key.id) return;
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
  const comando = comandoDe(entrada.texto);

  if (key.fromMe) {
    const chatPropio = propio !== null && contacto.telefono === propio;
    if (comando) {
      const respuesta = ejecutar(comando);
      console.log(`Comando "gaby ${comando}" desde el teléfono del negocio`);
      // Solo se contesta en "Mensajes para mí": en el chat de un cliente lo vería él.
      if (chatPropio) enCola(jid, () => enviarTexto(jid, respuesta));
      return;
    }
    if (chatPropio || registro.esDelBot(jid, key.id, entrada.texto)) return;
    // Lo escribiste tú desde el teléfono: Gaby se calla en este chat un rato.
    pausarChat(jid, Date.now() + config.horasPausa * 3_600_000);
    console.log(
      `Escribiste a mano en ${contacto.telefono || jid}: Gaby se calla ahí ${config.horasPausa} h`,
    );
    return;
  }

  if (comando && config.asesores.includes(contacto.telefono)) {
    console.log(
      `Comando "gaby ${comando}" desde el asesor ${contacto.telefono}`,
    );
    const respuesta = ejecutar(comando);
    enCola(jid, () => enviarTexto(jid, respuesta));
    return;
  }

  // Apagada o callada en este chat: ni marca leído, así ves el mensaje sin leer.
  if (!gabyActiva() || chatPausado(jid)) return;

  enCola(jid, async () => {
    if (!gabyActiva() || chatPausado(jid)) return;
    await marcarLeido(jid, key.id as string);
    const r = await procesar(leerEstado(jid), entrada, contacto, servicios);
    guardarEstado(jid, r.estado);
    for (const texto of r.respuestas) {
      // Si escribiste tú mientras Gaby "escribía", no te pisa.
      if (chatPausado(jid)) return;
      if (!cupos.usar(jid)) {
        console.warn(
          `Tope de mensajes alcanzado (${jid}): Gaby no envía más por ahora`,
        );
        return;
      }
      await enviarTexto(jid, texto);
    }
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
        leerPropio();
      }
      return new Response("ok");
    }
    // Control desde el VPS: scripts/gaby.sh on|off|estado
    const control = url.pathname.match(
      new RegExp(`^/control/${config.webhookToken}/(on|off|estado)$`),
    );
    if (req.method === "POST" && control) {
      return new Response(
        `${ejecutar(control[1] as Comando).replace(/\*/g, "")}\n`,
      );
    }
    return new Response("no encontrado", { status: 404 });
  },
});

iniciarRecordatorios();
iniciarVencimientos();
leerPropio();
console.log(
  `Gaby escuchando en :${servidor.port} · instancia ${config.instancia} · cuenta ${correoCuentaServicio} · asesores: ${config.asesores.length} · avisos push ${avisosPushActivos ? "sí" : "no"} · ${gabyActiva() ? "ENCENDIDA" : "APAGADA (gaby on para encender)"}`,
);
