/**
 * Geist desde Google Fonts para `next/og`, solo con los caracteres que se usan (las imágenes se
 * generan al compilar). Si no hay red, `null`: la imagen sale con la fuente por defecto de
 * `next/og` y el build no se rompe.
 */
export async function geist(
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
