import { config } from "./config";
import { RegistroEnvios } from "./control";

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

/** Lo que envió el bot: para no confundirlo con lo que escribes tú desde el teléfono. */
export const registro = new RegistroEnvios();

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
  registro.anotarTexto(jid, texto);
  const r = (await llamar(`/message/sendText/${config.instancia}`, {
    number: destino(jid),
    text: texto,
    delay,
    linkPreview: false,
  })) as { key?: { id?: string } } | null;
  if (r?.key?.id) registro.anotarId(r.key.id);
}

/**
 * Número (solo dígitos) del WhatsApp vinculado, para reconocer "Mensajes para mí".
 * `null` si Evolution no lo da (instancia sin vincular o versión distinta).
 */
export async function numeroPropio(): Promise<string | null> {
  try {
    const res = await fetch(
      `${config.evolutionUrl}/instance/fetchInstances?instanceName=${config.instancia}`,
      { headers: { apikey: config.evolutionApiKey } },
    );
    const datos = (await res.json()) as unknown;
    const lista = Array.isArray(datos) ? datos : [datos];
    for (const i of lista as Array<Record<string, unknown>>) {
      const inst = (i?.instance as Record<string, unknown>) ?? i;
      const jid = (inst?.ownerJid ?? inst?.owner) as string | undefined;
      if (jid) return jid.split("@")[0].split(":")[0];
    }
  } catch (e) {
    console.warn("No se pudo leer el número propio", (e as Error).message);
  }
  return null;
}

export async function marcarLeido(jid: string, id: string): Promise<void> {
  await llamar(`/chat/markMessageAsRead/${config.instancia}`, {
    readMessages: [{ remoteJid: jid, fromMe: false, id }],
  }).catch((e) => console.warn("No se pudo marcar como leído", e.message));
}
