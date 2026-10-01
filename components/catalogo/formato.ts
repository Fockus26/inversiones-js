/**
 * Formatos de la lista del panel. Montos como los escribe el cliente ("125$"); decimales solo
 * si los hay, con coma ("125,50$").
 */
export function formatearMonto(n: number): string {
  if (Number.isInteger(n)) return `${n}$`;
  return `${n.toFixed(2).replace(".", ",")}$`;
}

/** "6 × 63$" */
export function formatearCuota(numeroCuotas: number, cuota: number): string {
  return `${numeroCuotas} × ${formatearMonto(cuota)}`;
}

const relativo = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

const PASOS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "hace 5 minutos", "ayer"… Menos de un minuto → "hace un momento". */
export function haceCuanto(fecha: Date, ahora: Date = new Date()): string {
  const segundos = Math.round((fecha.getTime() - ahora.getTime()) / 1000);
  if (Math.abs(segundos) < 60) return "hace un momento";
  for (const [unidad, tamano] of PASOS) {
    if (Math.abs(segundos) >= tamano) {
      return relativo.format(Math.round(segundos / tamano), unidad);
    }
  }
  return "hace un momento";
}

/** Normaliza para buscar sin importar mayúsculas ni acentos. */
export function normalizarBusqueda(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Anillo de foco a opacidad completa: el `ring-ring/50` de shadcn deja el verde azulado por
 * debajo de 3:1 sobre blanco. Se aplica a cada control de esta pantalla (no se toca components/ui).
 */
export const FOCO =
  "focus-visible:ring-ring aria-invalid:focus-visible:ring-ring aria-invalid:focus-visible:border-ring";
