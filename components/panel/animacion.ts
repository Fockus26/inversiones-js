/**
 * Animaciones del panel (tw-animate-css). Todas van con `motion-safe:`: con «reducir movimiento»
 * activado en el teléfono, nada se mueve.
 */

/** Entrada suave de una sección o página: aparece y sube un poco. */
export const ENTRADA =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:ease-out motion-safe:fill-mode-both";

/** Tarjeta que se levanta un poco al pasar el ratón (en el teléfono no hay hover: no molesta). */
export const TARJETA_VIVA =
  "transition-[translate,box-shadow] duration-200 ease-out motion-safe:hover:-translate-y-0.5 hover:shadow-md";

/** Retraso escalonado para listas: cada elemento entra 40 ms después del anterior (tope 12). */
export function escalonado(indice: number): React.CSSProperties {
  return { animationDelay: `${Math.min(indice, 12) * 40}ms` };
}
