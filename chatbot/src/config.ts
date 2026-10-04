/** Configuración por variables de entorno (ver .env.example). */

function numero(nombre: string, porDefecto: number): number {
  const v = process.env[nombre];
  if (!v) return porDefecto;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${nombre} debe ser un número`);
  return n;
}

/** Solo dígitos, con código de país: "+58 412-123.4567" → "584121234567". */
function telefono(nombre: string): string | undefined {
  const v = process.env[nombre]?.replace(/\D/g, "");
  return v ? v : undefined;
}

export const config = {
  /** Número del bot para vincular con código (sin QR). Vacío = se muestra QR. */
  numeroBot: telefono("NUMERO_BOT"),
  /** Número personal del dueño: recibe aviso cuando alguien pide asesor. Opcional. */
  numeroAvisos: telefono("NUMERO_AVISOS"),
  /** Carpeta de la sesión de WhatsApp y del estado de los chats. */
  carpetaDatos: process.env.CARPETA_DATOS ?? "./datos",
  /** Horas que el bot se calla en un chat tras pedir asesor o escribir tú desde el teléfono. */
  horasPausa: numero("HORAS_PAUSA", 12),
  /** Tope de mensajes del bot por chat en 10 minutos. */
  maxPorChat10Min: numero("MAX_POR_CHAT_10MIN", 6),
  /** Tope global de mensajes del bot por hora (protege el número si algo se descontrola). */
  maxPorHora: numero("MAX_POR_HORA", 80),
  agotados: (process.env.AGOTADOS === "ocultar" ? "ocultar" : "marcar") as
    | "ocultar"
    | "marcar",
  zonaHoraria: process.env.ZONA_HORARIA ?? "America/Caracas",
  /** Solo para probar: si se define, el bot SOLO responde a estos números (separados por coma). */
  soloNumeros: (process.env.SOLO_NUMEROS ?? "")
    .split(",")
    .map((n) => n.replace(/\D/g, ""))
    .filter(Boolean),
};
