/**
 * Horario de atención para las citas que agenda el chatbot (D027). Vive en Firestore en
 * `configuracion/horario`; el bot lo lee y, si no existe, usa `HORARIO_POR_DEFECTO`.
 * Las horas son de Caracas (UTC−4, sin horario de verano).
 */

export const COLECCION_CONFIGURACION = "configuracion";
export const DOC_HORARIO = "horario";

/** Tramo "HH:MM"–"HH:MM" de un día, p. ej. 09:00–12:00. */
export interface Tramo {
  desde: string;
  hasta: string;
}

export interface HorarioAtencion {
  /** Clave = día de la semana (0 domingo … 6 sábado). Día sin tramos = cerrado. */
  dias: Record<string, Tramo[]>;
  /** Duración de cada cita en minutos. */
  duracionMinutos: number;
  /** No ofrecer citas que empiecen antes de estas horas desde ahora. */
  anticipacionHoras: number;
  /** Cuántos días hacia adelante buscar huecos. */
  diasAdelante: number;
  /** Cuántas opciones mostrar como máximo en total. */
  maxOpciones: number;
  /** Cuántas opciones mostrar como máximo por día (repartidas a lo largo del día). */
  maxPorDia: number;
}

const LABORABLE: Tramo[] = [{ desde: "09:00", hasta: "17:00" }];

export const HORARIO_POR_DEFECTO: HorarioAtencion = {
  dias: {
    "0": [],
    "1": LABORABLE,
    "2": LABORABLE,
    "3": LABORABLE,
    "4": LABORABLE,
    "5": LABORABLE,
    "6": [{ desde: "09:00", hasta: "13:00" }],
  },
  duracionMinutos: 60,
  anticipacionHoras: 3,
  diasAdelante: 7,
  maxOpciones: 6,
  maxPorDia: 2,
};

/** Completa con los valores por defecto lo que falte o venga mal en el documento. */
export function normalizarHorario(dato: unknown): HorarioAtencion {
  const d = (dato ?? {}) as Partial<HorarioAtencion>;
  const num = (v: unknown, def: number, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v <= max
      ? v
      : def;
  const horaValida = (h: unknown) =>
    typeof h === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(h);
  const dias: Record<string, Tramo[]> = {};
  for (let i = 0; i < 7; i++) {
    const tramos = d.dias?.[String(i)];
    dias[String(i)] = Array.isArray(tramos)
      ? tramos.filter(
          (t) =>
            horaValida(t?.desde) && horaValida(t?.hasta) && t.desde < t.hasta,
        )
      : HORARIO_POR_DEFECTO.dias[String(i)];
  }
  const p = HORARIO_POR_DEFECTO;
  return {
    dias,
    duracionMinutos: num(d.duracionMinutos, p.duracionMinutos, 15, 480),
    anticipacionHoras: num(d.anticipacionHoras, p.anticipacionHoras, 0, 72),
    diasAdelante: num(d.diasAdelante, p.diasAdelante, 1, 30),
    maxOpciones: num(d.maxOpciones, p.maxOpciones, 1, 9),
    maxPorDia: num(d.maxPorDia, p.maxPorDia, 1, 9),
  };
}
