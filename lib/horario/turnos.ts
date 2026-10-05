import type { HorarioAtencion } from "./tipos";

/**
 * Cálculo de huecos libres para citas (D027). Puro: recibe "ahora" y los tramos ocupados del
 * calendario, y devuelve las opciones a ofrecer. Caracas es UTC−4 fijo (no tiene horario de
 * verano), así que se trabaja con un desfase constante en vez de una base de zonas horarias.
 */

const DESFASE_CARACAS_MS = -4 * 3_600_000;

export interface Intervalo {
  inicio: Date;
  fin: Date;
}

export interface Turno {
  /** ISO 8601 en UTC. */
  inicio: string;
  fin: string;
  /** Texto para el cliente: "Miércoles 07 5pm". */
  etiqueta: string;
}

const DIAS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** "Miércoles 07 5pm" / "Jueves 08 3:30pm" en hora de Caracas. */
export function etiquetaTurno(inicio: Date): string {
  const local = new Date(inicio.getTime() + DESFASE_CARACAS_MS);
  const dia = DIAS[local.getUTCDay()];
  const fecha = String(local.getUTCDate()).padStart(2, "0");
  return `${dia} ${fecha} ${horaCorta(inicio)}`;
}

/** "5pm" / "3:30pm" / "12m" en hora de Caracas. */
export function horaCorta(inicio: Date): string {
  const local = new Date(inicio.getTime() + DESFASE_CARACAS_MS);
  const h = local.getUTCHours();
  const m = local.getUTCMinutes();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const sufijo = h === 12 && m === 0 ? "m" : h < 12 ? "am" : "pm";
  return `${h12}${m ? `:${String(m).padStart(2, "0")}` : ""}${sufijo}`;
}

/** Elige `n` elementos repartidos de forma pareja (primero, medio, último…). */
function repartidos<T>(lista: T[], n: number): T[] {
  if (lista.length <= n) return lista;
  if (n === 1) return [lista[0]];
  const salto = (lista.length - 1) / (n - 1);
  return Array.from({ length: n }, (_, i) => lista[Math.round(i * salto)]);
}

export function turnosDisponibles(
  horario: HorarioAtencion,
  ahora: Date,
  ocupados: Intervalo[],
): Turno[] {
  const duracionMs = horario.duracionMinutos * 60_000;
  const minimo = ahora.getTime() + horario.anticipacionHoras * 3_600_000;
  const hoyLocal = new Date(ahora.getTime() + DESFASE_CARACAS_MS);
  const resultado: Turno[] = [];

  for (let d = 0; d < horario.diasAdelante; d++) {
    // Medianoche de Caracas del día d, expresada en UTC.
    const medianocheUtc =
      Date.UTC(
        hoyLocal.getUTCFullYear(),
        hoyLocal.getUTCMonth(),
        hoyLocal.getUTCDate() + d,
      ) - DESFASE_CARACAS_MS;
    const diaSemana = new Date(medianocheUtc + DESFASE_CARACAS_MS).getUTCDay();
    const libres: Turno[] = [];
    for (const tramo of horario.dias[String(diaSemana)] ?? []) {
      const fin = medianocheUtc + minutos(tramo.hasta) * 60_000;
      for (
        let t = medianocheUtc + minutos(tramo.desde) * 60_000;
        t + duracionMs <= fin;
        t += duracionMs
      ) {
        if (t < minimo) continue;
        const choca = ocupados.some(
          (o) => t < o.fin.getTime() && t + duracionMs > o.inicio.getTime(),
        );
        if (choca) continue;
        libres.push({
          inicio: new Date(t).toISOString(),
          fin: new Date(t + duracionMs).toISOString(),
          etiqueta: etiquetaTurno(new Date(t)),
        });
      }
    }
    resultado.push(...repartidos(libres, horario.maxPorDia));
    if (resultado.length >= horario.maxOpciones) break;
  }
  return resultado.slice(0, horario.maxOpciones);
}
