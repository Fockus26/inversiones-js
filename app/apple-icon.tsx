import { imagenDelSello } from "@/lib/marca/sello";

/** Ícono al agregar el panel a la pantalla de inicio del iPhone (iOS le pone las esquinas). */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function IconoApple() {
  return imagenDelSello(size.width, "app");
}
