/**
 * Sello de la marca para `next/og` (íconos, favicon): "JS" en tinta con su barrita, sobre el
 * amarillo. Es el mismo que el de la cabecera (`components/estado/pantalla-estado.tsx`).
 *
 * - `app`: a sangre, para el ícono instalado y el de iPhone (el sistema le pone las esquinas;
 *   sirve como `maskable`: el texto queda dentro de la zona segura del 80 %).
 * - `pestana`: el favicon. Esquinas redondeadas y letra más grande, que a 32 px se lea.
 * - `insignia`: la de las notificaciones de Android, silueta blanca sobre transparente.
 */
import { ImageResponse } from "next/og";
import { geist } from "./fuente";

export const TINTA = "#1c1f26";
export const AMARILLO = "#fec922";

export function Sello({
  lado,
  variante,
}: {
  lado: number;
  variante: "app" | "pestana" | "insignia";
}) {
  const insignia = variante === "insignia";
  const pestana = variante === "pestana";
  const letra = lado * (insignia ? 0.55 : pestana ? 0.52 : 0.4);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: letra * 0.125,
        background: insignia ? "transparent" : AMARILLO,
        borderRadius: pestana ? lado * 0.22 : 0,
        color: insignia ? "#ffffff" : TINTA,
        fontSize: letra,
        fontFamily: "Geist",
        fontWeight: 800,
        letterSpacing: -letra * 0.025,
      }}
    >
      {!insignia && (
        <div
          style={{
            width: Math.max(letra * 0.15, 2),
            height: letra * 0.9,
            borderRadius: lado,
            background: TINTA,
          }}
        />
      )}
      JS
    </div>
  );
}

/** El sello como PNG de `lado` × `lado`, en Geist extranegrita (sin red, la fuente por defecto). */
export async function imagenDelSello(
  lado: number,
  variante: "app" | "pestana" | "insignia",
) {
  const negrita = await geist(800, "JS");
  return new ImageResponse(<Sello lado={lado} variante={variante} />, {
    width: lado,
    height: lado,
    fonts: negrita
      ? [{ name: "Geist", data: negrita, weight: 800, style: "normal" }]
      : undefined,
  });
}
