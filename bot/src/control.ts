/**
 * Control manual de Gaby (D028), puro para poder probarlo:
 * - comandos "gaby on/off/estado" para alternar entre Gaby y tú;
 * - registro de lo que envió el bot, para distinguirlo de lo que escribes tú a mano;
 * - topes de envío por chat y por hora (frenos anti-baneo).
 */

export type Comando = "on" | "off" | "estado";

const SINONIMOS: Record<string, Comando> = {
  on: "on",
  encender: "on",
  activar: "on",
  prender: "on",
  off: "off",
  apagar: "off",
  desactivar: "off",
  estado: "estado",
  status: "estado",
};

/** "Gaby off", "gaby apagar", "#gaby on"… → comando; cualquier otra cosa → null. */
export function comandoDe(texto: string): Comando | null {
  const m = texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .match(/^[#/!]?gaby\s+([a-z]+)[.!]*$/);
  return m ? (SINONIMOS[m[1]] ?? null) : null;
}

const normal = (t: string) => t.replace(/\s+/g, " ").trim();

/**
 * Lo que mandó el bot en los últimos minutos, por id y por texto. Si a Evolution le llega
 * como "fromMe" un mensaje que no está aquí, lo escribiste tú desde el teléfono.
 */
export class RegistroEnvios {
  private ids = new Map<string, number>();
  private textos = new Map<string, number>();
  constructor(
    private ahora: () => number = Date.now,
    private ventanaMs = 15 * 60_000,
  ) {}

  /** Llamar ANTES de enviar (el eco puede llegar antes de que Evolution conteste). */
  anotarTexto(jid: string, texto: string) {
    this.limpiar();
    this.textos.set(`${jid}|${normal(texto)}`, this.ahora());
  }

  anotarId(id: string) {
    this.ids.set(id, this.ahora());
  }

  esDelBot(jid: string, id: string | undefined, texto: string): boolean {
    this.limpiar();
    if (id && this.ids.has(id)) return true;
    return texto !== "" && this.textos.has(`${jid}|${normal(texto)}`);
  }

  private limpiar() {
    const limite = this.ahora() - this.ventanaMs;
    for (const mapa of [this.ids, this.textos]) {
      for (const [k, t] of mapa) if (t < limite) mapa.delete(k);
    }
  }
}

/** Topes de mensajes del bot: por chat en 10 min y en total por hora. */
export class Cupos {
  private global: number[] = [];
  private porChat = new Map<string, number[]>();
  constructor(
    private maxPorChat10Min: number,
    private maxPorHora: number,
    private ahora: () => number = Date.now,
  ) {}

  /** `true` y lo cuenta si hay cupo; `false` si hay que callar. */
  usar(jid: string): boolean {
    const t = this.ahora();
    this.global = this.global.filter((x) => t - x < 3_600_000);
    const chat = (this.porChat.get(jid) ?? []).filter((x) => t - x < 600_000);
    if (this.global.length >= this.maxPorHora) return false;
    if (chat.length >= this.maxPorChat10Min) {
      this.porChat.set(jid, chat);
      return false;
    }
    chat.push(t);
    this.global.push(t);
    this.porChat.set(jid, chat);
    return true;
  }
}
