import { ImageResponse } from "next/og";

/**
 * Íconos de la app instalada (D035), generados al compilar: "JS" en tinta sobre el amarillo de
 * la marca, a sangre (sirve como `maskable`: el texto queda dentro de la zona segura del 80 %).
 * `96` es la insignia de Android: silueta blanca sobre transparente.
 */

const TAMANOS = { "96": 96, "180": 180, "192": 192, "512": 512 } as const;
type Tamano = keyof typeof TAMANOS;

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(TAMANOS).map((tamano) => ({ tamano }));
}

export async function GET(
  _: Request,
  { params }: RouteContext<"/icono/[tamano]">,
) {
  const { tamano } = await params;
  const lado = TAMANOS[tamano as Tamano];
  const insignia = tamano === "96";
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: lado * 0.05,
        background: insignia ? "transparent" : "#fec922",
        color: insignia ? "#ffffff" : "#1c1f26",
        fontSize: lado * (insignia ? 0.55 : 0.4),
        fontWeight: 800,
        letterSpacing: -lado * 0.01,
      }}
    >
      {!insignia && (
        <div
          style={{
            width: lado * 0.06,
            height: lado * 0.36,
            borderRadius: lado,
            background: "#1c1f26",
          }}
        />
      )}
      JS
    </div>,
    { width: lado, height: lado },
  );
}
