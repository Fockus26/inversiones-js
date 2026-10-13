import type { MetadataRoute } from "next";

/** Manifiesto de la app instalable (D035): el panel se abre como app, sin barra del navegador. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Inversiones JS · Panel",
    short_name: "Inversiones JS",
    description:
      "Catálogo, póliza RCV, clientes con financiamiento y avisos de citas de Inversiones JS.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1c1f26",
    theme_color: "#1c1f26",
    icons: [
      {
        src: "/icono/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icono/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icono/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Clientes",
        url: "/clientes",
        icons: [{ src: "/icono/192", sizes: "192x192" }],
      },
      {
        name: "Póliza RCV",
        url: "/rcv",
        icons: [{ src: "/icono/192", sizes: "192x192" }],
      },
    ],
  };
}
