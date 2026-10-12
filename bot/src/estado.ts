import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config";
import type { Estado } from "./flujo";

/** Estado de cada conversación y mensajes ya procesados, en SQLite (volumen /data). */

mkdirSync(config.dataDir, { recursive: true });
const db = new Database(join(config.dataDir, "gaby.sqlite"), { create: true });
db.exec("PRAGMA journal_mode = WAL;");
db.exec(
  "CREATE TABLE IF NOT EXISTS conversaciones (jid TEXT PRIMARY KEY, estado TEXT NOT NULL, actualizado INTEGER NOT NULL)",
);
db.exec(
  "CREATE TABLE IF NOT EXISTS procesados (id TEXT PRIMARY KEY, cuando INTEGER NOT NULL)",
);

db.exec(
  "CREATE TABLE IF NOT EXISTS ajustes (clave TEXT PRIMARY KEY, valor TEXT NOT NULL)",
);
db.exec(
  "CREATE TABLE IF NOT EXISTS pausas (jid TEXT PRIMARY KEY, hasta INTEGER NOT NULL)",
);

const qLeer = db.query<{ estado: string }, [string]>(
  "SELECT estado FROM conversaciones WHERE jid = ?",
);
const qGuardar = db.query(
  "INSERT INTO conversaciones (jid, estado, actualizado) VALUES (?1, ?2, ?3) ON CONFLICT(jid) DO UPDATE SET estado = ?2, actualizado = ?3",
);
const qMarcar = db.query(
  "INSERT OR IGNORE INTO procesados (id, cuando) VALUES (?, ?)",
);
const qLimpiar = db.query("DELETE FROM procesados WHERE cuando < ?");

export function leerEstado(jid: string): Estado | null {
  const fila = qLeer.get(jid);
  return fila ? (JSON.parse(fila.estado) as Estado) : null;
}

export function guardarEstado(jid: string, estado: Estado): void {
  qGuardar.run(jid, JSON.stringify(estado), Date.now());
}

/** `true` si el mensaje es nuevo (y lo marca); `false` si ya se había procesado. */
export function marcarProcesado(id: string): boolean {
  return qMarcar.run(id, Date.now()).changes > 0;
}

const qAjuste = db.query<{ valor: string }, [string]>(
  "SELECT valor FROM ajustes WHERE clave = ?",
);
const qFijarAjuste = db.query(
  "INSERT INTO ajustes (clave, valor) VALUES (?1, ?2) ON CONFLICT(clave) DO UPDATE SET valor = ?2",
);
const qPausa = db.query<{ hasta: number }, [string]>(
  "SELECT hasta FROM pausas WHERE jid = ?",
);
const qPausar = db.query(
  "INSERT INTO pausas (jid, hasta) VALUES (?1, ?2) ON CONFLICT(jid) DO UPDATE SET hasta = ?2",
);
const qContarPausas = db.query<{ n: number }, [number]>(
  "SELECT COUNT(*) AS n FROM pausas WHERE hasta > ?",
);

/** Interruptor general (gaby on/off). Sobrevive a reinicios. Encendida por defecto. */
export function gabyActiva(): boolean {
  return qAjuste.get("activa")?.valor !== "0";
}

export function fijarGabyActiva(activa: boolean): void {
  qFijarAjuste.run("activa", activa ? "1" : "0");
}

/** Gaby se calla en este chat hasta `hasta` (ms epoch): escribiste tú a mano. */
export function pausarChat(jid: string, hasta: number): void {
  qPausar.run(jid, hasta);
}

export function chatPausado(jid: string): boolean {
  return (qPausa.get(jid)?.hasta ?? 0) > Date.now();
}

export function chatsPausados(): number {
  return qContarPausas.get(Date.now())?.n ?? 0;
}

/** Quita todas las pausas por chat (al encender con "gaby on"). */
export function reanudarChats(): void {
  db.exec("DELETE FROM pausas");
}

setInterval(() => qLimpiar.run(Date.now() - 3 * 86_400_000), 3_600_000);
