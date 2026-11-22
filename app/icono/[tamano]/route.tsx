import { imagenDelSello } from "@/lib/marca/sello";

/**
 * Íconos de la app instalada (D035) y de las notificaciones, generados al compilar con el sello
 * de la marca (`lib/marca/sello.tsx`). `96` es la insignia de Android.
 */

const TAMANOS = { "96": 96, "192": 192, "512": 512 } as const;
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
  return imagenDelSello(lado, tamano === "96" ? "insignia" : "app");
}
