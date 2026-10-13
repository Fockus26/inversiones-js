import { consultarEuroMercado } from "@/lib/rcv/mercado";

/**
 * Tasa de mercado del euro en $ y COP para el panel (D036). Igual que `/api/tasa-bcv`: pasa
 * por el servidor para no depender del CORS y la CDN la guarda 15 min. Dato público.
 */
export async function GET() {
  try {
    const tasas = await consultarEuroMercado();
    return Response.json(tasas, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("[tasa-mercado] No se pudo consultar la tasa:", error);
    return Response.json(
      { error: "No se pudo consultar la tasa de mercado." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
