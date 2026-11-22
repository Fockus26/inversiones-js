import { imagenDelSello } from "@/lib/marca/sello";

/** Favicon de la pestaña (PNG; `favicon.ico` queda para quien pide la ruta fija). */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icono() {
  return imagenDelSello(size.width, "pestana");
}
