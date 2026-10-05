/** Variables de entorno del bot (ver bot/.env.example). */

function requerida(nombre: string): string {
  const v = process.env[nombre]?.trim();
  if (!v) throw new Error(`Falta la variable de entorno ${nombre}`);
  return v;
}

export const config = {
  puerto: Number(process.env.PUERTO ?? 3000),
  /** Secreto en la ruta del webhook: Evolution llama a /webhook/<token>. */
  webhookToken: requerida("WEBHOOK_TOKEN"),
  evolutionUrl: (
    process.env.EVOLUTION_URL ?? "http://evolution-api:8080"
  ).replace(/\/$/, ""),
  evolutionApiKey: requerida("EVOLUTION_API_KEY"),
  instancia: process.env.EVOLUTION_INSTANCIA ?? "inversiones-js",
  /** Ruta a la clave JSON de la cuenta de servicio (Firestore lectura + Calendar). */
  credenciales:
    process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "/secretos/google.json",
  calendarId: requerida("GOOGLE_CALENDAR_ID"),
  /** Proyecto de Firebase del panel, si no es el mismo de la cuenta de servicio. */
  proyectoFirebase: process.env.FIREBASE_PROJECT_ID?.trim() ?? "",
  /** Número(s) del asesor que recibe los avisos, separados por coma (58412…). Opcional. */
  asesores: (process.env.ASESOR_NUMEROS ?? "")
    .split(",")
    .map((n) => n.replace(/\D/g, ""))
    .filter(Boolean),
  dataDir: process.env.DATA_DIR ?? "./data",
  /** Pausa "escribiendo…" antes de cada respuesta, en ms (aleatoria entre min y max). */
  demoraMin: Number(process.env.DEMORA_MIN_MS ?? 2500),
  demoraMax: Number(process.env.DEMORA_MAX_MS ?? 6000),
  /** Horas que Gaby se calla en un chat después de que escribes tú a mano en él. */
  horasPausa: Number(process.env.HORAS_PAUSA ?? 12),
  /** Frenos anti-baneo: máximo de respuestas por chat en 10 min y en total por hora. */
  maxPorChat10Min: Number(process.env.MAX_POR_CHAT_10MIN ?? 8),
  maxPorHora: Number(process.env.MAX_POR_HORA ?? 60),
};
