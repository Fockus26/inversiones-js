/**
 * Fechas de calendario ("2026-10-13") sin hora ni zona: así las guarda Firestore para cuotas y
 * pólizas, se comparan como texto y no se corren un día por el huso horario. "Hoy" es el de
 * Caracas, como el resto del negocio.
 */

export type Fecha = string;

const PATRON = /^(\d{4})-(\d{2})-(\d{2})$/;

const hoyEnCaracas = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Caracas",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha de hoy en Caracas: "2026-10-13". */
export function hoyCaracas(ahora: Date = new Date()): Fecha {
  return hoyEnCaracas.format(ahora);
}

export function esFecha(texto: unknown): texto is Fecha {
  if (typeof texto !== "string") return false;
  const m = PATRON.exec(texto);
  if (!m) return false;
  const d = aUtc(texto);
  return (
    d.getUTCMonth() + 1 === Number(m[2]) && d.getUTCDate() === Number(m[3])
  );
}

function aUtc(f: Fecha): Date {
  const [a, m, d] = f.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}

function deUtc(d: Date): Fecha {
  return d.toISOString().slice(0, 10);
}

export function sumarDias(f: Fecha, dias: number): Fecha {
  const d = aUtc(f);
  d.setUTCDate(d.getUTCDate() + dias);
  return deUtc(d);
}

/** Suma meses sin desbordar: 31/01 + 1 mes = 28/02 (o 29). */
export function sumarMeses(f: Fecha, meses: number): Fecha {
  const [a, m, d] = f.split("-").map(Number);
  const total = a * 12 + (m - 1) + meses;
  const anio = Math.floor(total / 12);
  const mes = total % 12;
  const ultimo = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  return deUtc(new Date(Date.UTC(anio, mes, Math.min(d, ultimo))));
}

/** Días de `desde` a `hasta` (negativo si `hasta` ya pasó). */
export function diasEntre(desde: Fecha, hasta: Fecha): number {
  return Math.round(
    (aUtc(hasta).getTime() - aUtc(desde).getTime()) / 86_400_000,
  );
}

/** "2026-11-05" → "05/11/2026" */
export function fechaCorta(f: Fecha): string {
  const [a, m, d] = f.split("-");
  return `${d}/${m}/${a}`;
}

const formatoLargo = new Intl.DateTimeFormat("es-VE", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-11-05" → "5 de noviembre de 2026" */
export function fechaLarga(f: Fecha): string {
  return formatoLargo.format(aUtc(f));
}
