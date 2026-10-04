import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config";
import { type EstadoChat, estadoInicial } from "./flujo";

/**
 * Estado por chat (saludado, pausas) guardado en disco, para que un reinicio no haga que el
 * bot vuelva a saludar a todos ni interrumpa una conversación que llevas tú.
 */

interface Guardado extends EstadoChat {
  /** ms epoch hasta el que el bot no responde en este chat. */
  pausadoHasta?: number;
  /** ms epoch del último mensaje (para limpiar chats viejos). */
  visto: number;
}

const archivo = join(config.carpetaDatos, "chats.json");
let chats: Record<string, Guardado> = {};
let pendiente: NodeJS.Timeout | null = null;

mkdirSync(config.carpetaDatos, { recursive: true });
if (existsSync(archivo)) {
  try {
    chats = JSON.parse(readFileSync(archivo, "utf8"));
  } catch {
    console.warn("[estado] chats.json ilegible, se empieza de cero");
  }
}

function guardar() {
  if (pendiente) return;
  pendiente = setTimeout(() => {
    pendiente = null;
    const limite = Date.now() - 30 * 24 * 3_600_000; // olvida chats de hace más de 30 días
    for (const [jid, c] of Object.entries(chats)) {
      if (c.visto < limite) delete chats[jid];
    }
    writeFileSync(archivo, JSON.stringify(chats));
  }, 2_000);
}

export function leerChat(jid: string): EstadoChat {
  const c = chats[jid];
  if (!c) return estadoInicial();
  const { pausadoHasta: _p, visto: _v, ...estado } = c;
  return estado;
}

export function escribirChat(jid: string, estado: EstadoChat) {
  chats[jid] = { ...chats[jid], ...estado, visto: Date.now() };
  guardar();
}

export function pausar(jid: string, horas = config.horasPausa) {
  chats[jid] = {
    ...(chats[jid] ?? estadoInicial()),
    saludado: true,
    pausadoHasta: Date.now() + horas * 3_600_000,
    visto: Date.now(),
  };
  guardar();
}

export function estaPausado(jid: string): boolean {
  return (chats[jid]?.pausadoHasta ?? 0) > Date.now();
}
