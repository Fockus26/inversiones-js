import { config } from "./config";

/** Llamadas salientes a Evolution API (enviar texto, marcar leído). */

async function llamar(ruta: string, cuerpo: unknown): Promise<unknown> {
  const res = await fetch(`${config.evolutionUrl}${ruta}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.evolutionApiKey,
    },
    body: JSON.stringify(cuerpo),
  });
  if (!res.ok)
    throw new Error(`Evolution ${ruta} ${res.status}: ${await res.text()}`);
  return res.json().catch(() => null);
}

const azarEntre = (min: number, max: number) =>
  Math.round(min + Math.random() * Math.max(0, max - min));

/** Destino aceptado por Evolution: dígitos para números normales, JID completo para @lid. */
function destino(jid: string): string {
  return jid.endsWith("@s.whatsapp.net") ? jid.split("@")[0] : jid;
}

/**
 * Envía un texto mostrando "escribiendo…" durante una pausa aleatoria, más larga cuanto más
 * largo el mensaje: así el número no responde de forma instantánea y robótica.
 */
export async function enviarTexto(jid: string, texto: string): Promise<void> {
  const porLargo = Math.min(4000, texto.length * 15);
  const delay = azarEntre(config.demoraMin, config.demoraMax) + porLargo;
  await llamar(`/message/sendText/${config.instancia}`, {
    number: destino(jid),
    text: texto,
    delay,
    linkPreview: false,
  });
}

export async function marcarLeido(jid: string, id: string): Promise<void> {
  await llamar(`/chat/markMessageAsRead/${config.instancia}`, {
    readMessages: [{ remoteJid: jid, fromMe: false, id }],
  }).catch((e) => console.warn("No se pudo marcar como leído", e.message));
}

/** Aviso interno a los asesores configurados (no falla el flujo si no se puede enviar). */
export async function avisarAsesores(texto: string): Promise<void> {
  for (const numero of config.asesores) {
    await enviarTexto(`${numero}@s.whatsapp.net`, texto).catch((e) =>
      console.error("No se pudo avisar al asesor", numero, e.message),
    );
  }
}
