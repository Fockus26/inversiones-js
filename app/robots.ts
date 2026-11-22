import type { MetadataRoute } from "next";

/**
 * Panel privado: no hay nada que indexar y por eso no hay `sitemap`. El `noindex` va en la
 * cabecera `X-Robots-Tag` de todas las rutas (`next.config.ts`). Aquí no se bloquea `/`: un
 * buscador que no puede pedir la página tampoco ve ese `noindex`, y algunas vistas previas de
 * enlaces (WhatsApp, Facebook) respetan `robots.txt` y se quedarían sin título ni imagen.
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" } };
}
