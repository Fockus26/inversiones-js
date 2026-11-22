"use client";

import { ErrorDatos as ClaseErrorDatos, type ErrorDatos } from "./errores";
import { llamar, type Resultado } from "./resultado";

/**
 * Reemplazo de `onSnapshot` (migración al VPS): consulta al abrir, cada `intervaloMs`, al volver
 * a la pestaña y en cuanto este panel guarda algo en la misma tabla (`avisarCambio`). Solo avisa
 * a la pantalla si los datos cambiaron, para no repintar (ni pisar un formulario) sin motivo.
 *
 * Un fallo de red con datos ya mostrados no tumba la pantalla: se conservan y se reintenta.
 * Sin sesión o sin acceso sí se avisa siempre.
 */

type Oyente = () => void;
const oyentes = new Map<string, Set<Oyente>>();

/** Lo llama cada escritura del panel: las pantallas de esa tabla se refrescan al momento. */
export function avisarCambio(...tablas: string[]): void {
  for (const t of tablas) for (const f of oyentes.get(t) ?? []) f();
}

export const INTERVALO_MS = 20_000;

export function sondear<T>(
  tablas: string[],
  consulta: () => Promise<Resultado<T>>,
  alCambiar: (datos: T) => void,
  alFallar: (error: ErrorDatos) => void,
  intervaloMs = INTERVALO_MS,
): () => void {
  let activo = true;
  let enVuelo = false;
  let pendiente = false;
  let ultimo: string | null = null;

  const ejecutar = async () => {
    if (!activo) return;
    if (enVuelo) {
      pendiente = true;
      return;
    }
    enVuelo = true;
    try {
      const datos = await llamar(consulta);
      if (!activo) return;
      const huella = JSON.stringify(datos);
      if (huella !== ultimo) {
        ultimo = huella;
        alCambiar(datos);
      }
    } catch (e) {
      if (!activo) return;
      const error =
        e instanceof ClaseErrorDatos ? e : new ClaseErrorDatos("internal");
      const grave =
        error.code === "unauthenticated" || error.code === "permission-denied";
      if (grave || ultimo === null) alFallar(error);
      else console.warn("[sondeo] se conservan los datos anteriores:", error);
    } finally {
      enVuelo = false;
      if (pendiente && activo) {
        pendiente = false;
        void ejecutar();
      }
    }
  };

  const alVolver = () => {
    if (document.visibilityState === "visible") void ejecutar();
  };
  const reloj = setInterval(() => {
    if (document.visibilityState === "visible") void ejecutar();
  }, intervaloMs);
  document.addEventListener("visibilitychange", alVolver);
  for (const t of tablas) {
    if (!oyentes.has(t)) oyentes.set(t, new Set());
    oyentes.get(t)?.add(ejecutar);
  }
  void ejecutar();

  return () => {
    activo = false;
    clearInterval(reloj);
    document.removeEventListener("visibilitychange", alVolver);
    for (const t of tablas) oyentes.get(t)?.delete(ejecutar);
  };
}

/** "Reintentar" de una pantalla que no cargó: consulta ya todo lo que se está sondeando. */
export function reintentarTodo(): void {
  for (const fs of oyentes.values()) for (const f of fs) f();
}

/**
 * Ejecuta una escritura y avisa a las pantallas de esas tablas, también si falló: lo que se
 * muestre debe ser lo que hay en la base. Menos si falló porque la sesión terminó: la consulta
 * fallaría igual y la pantalla pasaría a "Tu sesión terminó", desmontando el diálogo que se
 * estaba guardando (QA 2026-11-22). Así el diálogo sigue a la vista con su aviso, y lo escrito
 * queda como borrador (`lib/borrador.ts`) para cuando vuelva a entrar.
 */
export async function escribir<T>(
  tablas: string[],
  accion: () => Promise<Resultado<T>>,
): Promise<T> {
  try {
    const datos = await llamar(accion);
    avisarCambio(...tablas);
    return datos;
  } catch (e) {
    if (!(e instanceof ClaseErrorDatos && e.code === "unauthenticated"))
      avisarCambio(...tablas);
    throw e;
  }
}
