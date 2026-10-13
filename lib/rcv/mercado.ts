/**
 * Tasa de mercado del euro en dólares y pesos colombianos (D036): la misma que muestra Google al
 * buscar "1 euro en dólares" (Google no tiene API; sus cifras vienen de proveedores de mercado).
 * Se consulta en ExchangeRate-API (`open.er-api.com`, gratis y sin clave, se actualiza a diario)
 * y, si falla, en la currency-api de jsDelivr. Sin Firebase: la usan `/api/tasa-mercado` y el bot.
 */

export const URL_MERCADO_PRINCIPAL = "https://open.er-api.com/v6/latest/EUR";
export const URL_MERCADO_RESPALDO =
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json";

export interface TasasMercado {
  /** 1 € = `usd` $. */
  usd: number;
  /** 1 € = `cop` pesos colombianos. */
  cop: number;
  /** Cuándo se publicó (ISO 8601), si la fuente lo dice. */
  fecha: string | null;
}

const positivo = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v > 0;

/**
 * Como lo pide el cliente: dólares a 2 decimales (1,11923 → 1,12) y pesos a la decena más
 * cercana (3877 → 3880; 3864 → 3860).
 */
export function redondear(usd: number, cop: number) {
  return {
    usd: Math.round(usd * 100) / 100,
    cop: Math.round(cop / 10) * 10,
  };
}

/** `{ result: "success", base_code: "EUR", time_last_update_unix, rates: { USD, COP } }` */
export function leerErApi(json: unknown): TasasMercado | null {
  if (!json || typeof json !== "object") return null;
  const r = json as Record<string, unknown>;
  if (r.result !== "success" || r.base_code !== "EUR") return null;
  const tasas = r.rates as Record<string, unknown> | undefined;
  if (!positivo(tasas?.USD) || !positivo(tasas?.COP)) return null;
  const unix = r.time_last_update_unix;
  return {
    ...redondear(tasas.USD, tasas.COP),
    fecha: positivo(unix) ? new Date(unix * 1000).toISOString() : null,
  };
}

/** `{ date: "2026-10-13", eur: { usd, cop } }` */
export function leerCurrencyApi(json: unknown): TasasMercado | null {
  if (!json || typeof json !== "object") return null;
  const r = json as Record<string, unknown>;
  const eur = r.eur as Record<string, unknown> | undefined;
  if (!positivo(eur?.usd) || !positivo(eur?.cop)) return null;
  return {
    ...redondear(eur.usd, eur.cop),
    fecha:
      typeof r.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date)
        ? `${r.date}T00:00:00.000Z`
        : null,
  };
}

async function leer(
  hacerFetch: typeof fetch,
  url: string,
  leerJson: (j: unknown) => TasasMercado | null,
  msLimite: number,
): Promise<TasasMercado> {
  const res = await hacerFetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(msLimite),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${new URL(url).host} respondió ${res.status}`);
  const tasas = leerJson(await res.json());
  if (!tasas) throw new Error(`${new URL(url).host} no trajo USD y COP`);
  return tasas;
}

/** Consulta la principal y, si falla, la de respaldo; lanza si ninguna responde. */
export async function consultarEuroMercado(
  hacerFetch: typeof fetch = fetch,
  msLimite = 8000,
): Promise<TasasMercado> {
  try {
    return await leer(hacerFetch, URL_MERCADO_PRINCIPAL, leerErApi, msLimite);
  } catch (e) {
    try {
      return await leer(
        hacerFetch,
        URL_MERCADO_RESPALDO,
        leerCurrencyApi,
        msLimite,
      );
    } catch {
      throw e;
    }
  }
}
