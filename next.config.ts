import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // D035: el service worker nunca se sirve de caché, así una versión nueva llega enseguida.
  async headers() {
    return [
      // Panel privado: nadie lo indexa. Va como cabecera y no como <meta>, porque en el 404
      // Next ya pone su propio <meta name="robots"> y quedaban dos.
      {
        source: "/:ruta*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
