import { ImageResponse } from "next/og";

/**
 * Imagen al compartir el enlace del panel (HANDOFF §4): tinta con franja amarilla, logo y
 * "Inversiones JS · Panel", todo dentro del margen de seguridad de 80 px.
 */
export const alt = "Inversiones JS · Panel";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Geist desde Google Fonts, solo con los caracteres que se usan (se genera al compilar). Si no
 * hay red, sale con la fuente por defecto de `next/og`: la imagen no debe romper el build.
 */
const TITULO = "Inversiones JS · Panel";
const SUBTITULO = "Catálogo de equipos a crédito";

async function geist(
  peso: 400 | 800,
  texto: string,
): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=Geist:wght@${peso}&text=${encodeURIComponent(texto)}`,
      )
    ).text();
    const url = css.match(
      /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/,
    )?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function ImagenOpenGraph() {
  const [negrita, regular] = await Promise.all([
    geist(800, TITULO),
    geist(400, SUBTITULO),
  ]);
  const fuente = negrita && regular;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: "#1c1f26",
        color: "#f4f4f1",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 16,
          background: "#fec922",
        }}
      />
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: 26,
          background: "#fec922",
          color: "#1c1f26",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          fontFamily: fuente ? "Geist" : undefined,
          fontSize: 48,
          fontWeight: 800,
          letterSpacing: -1.2,
        }}
      >
        <div
          style={{
            width: 7,
            height: 43,
            borderRadius: 120,
            background: "#1c1f26",
          }}
        />
        JS
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            display: "flex",
            fontFamily: fuente ? "Geist" : undefined,
            fontSize: 76,
            fontWeight: 800,
            letterSpacing: -1.9,
            lineHeight: 1.05,
          }}
        >
          Inversiones JS
          <span style={{ color: "#fec922", margin: "0 20px" }}>·</span>
          Panel
        </div>
        <div
          style={{
            fontFamily: fuente ? "Geist" : undefined,
            fontSize: 30,
            fontWeight: 400,
            color: "#a6a9b2",
          }}
        >
          {SUBTITULO}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts:
        negrita && regular
          ? [
              { name: "Geist", data: negrita, weight: 800, style: "normal" },
              { name: "Geist", data: regular, weight: 400, style: "normal" },
            ]
          : undefined,
    },
  );
}
