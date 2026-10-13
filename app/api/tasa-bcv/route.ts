import { consultarEuroBcv } from "@/lib/rcv/bcv";

/**
 * Tasa BCV del euro para el panel (D031). Pasa por aquí y no directo desde el navegador para no
 * depender del CORS de DolarAPI; la CDN de Vercel la guarda 15 min. Es un dato público: sin sesión.
 */
export async function GET() {
  try {
    const tasa = await consultarEuroBcv();
    return Response.json(tasa, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("[tasa-bcv] No se pudo consultar DolarAPI:", error);
    return Response.json(
      { error: "No se pudo consultar la tasa del BCV." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
