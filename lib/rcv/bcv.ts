/**
 * Tasa oficial del euro del BCV (D031). Se consulta en DolarAPI (`ve.dolarapi.com`), que la
 * publica como JSON sin clave; el BCV no tiene API propia. Sin Firebase: lo usan la ruta
 * `/api/tasa-bcv` del panel y el bot.
 */

export const URL_EURO_BCV = "https://ve.dolarapi.com/v1/euros/oficial";

export interface TasaBcv {
  /** 1 € = `tasa` Bs. */
  tasa: number;
  /** Cuándo la publicó el BCV (ISO 8601), si la API lo dice. */
  fecha: string | null;
}

/**
 * Lee la respuesta de DolarAPI: `{ fuente, nombre, compra, venta, promedio, fechaActualizacion }`.
 * El BCV publica un solo valor; DolarAPI lo pone en `promedio` (y a veces también en `venta`).
 */
export function leerRespuestaBcv(json: unknown): TasaBcv | null {
  if (!json || typeof json !== "object") return null;
  const r = json as Record<string, unknown>;
  const tasa = [r.promedio, r.venta, r.compra].find(
    (v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0,
  );
  if (tasa === undefined) return null;
  const fecha =
    typeof r.fechaActualizacion === "string" ? r.fechaActualizacion : null;
  return { tasa, fecha };
}

/** Consulta la tasa; lanza si la API no responde o trae algo que no se entiende. */
export async function consultarEuroBcv(
  hacerFetch: typeof fetch = fetch,
  msLimite = 8000,
): Promise<TasaBcv> {
  const res = await hacerFetch(URL_EURO_BCV, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(msLimite),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`DolarAPI respondió ${res.status}`);
  const tasa = leerRespuestaBcv(await res.json());
  if (!tasa) throw new Error("DolarAPI no trajo la tasa del euro");
  return tasa;
}
