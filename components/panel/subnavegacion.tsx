"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ACTIVO } from "./estilos";

/** Pestañas subrayadas dentro de una sección (/clientes, /solicitudes). */
export function Subnavegacion({
  etiqueta,
  secciones,
}: {
  etiqueta: string;
  secciones: readonly { href: string; nombre: string }[];
}) {
  const ruta = usePathname();
  return (
    <nav aria-label={etiqueta} className="min-w-0">
      {/* La raya de abajo es una sombra interior y no un borde con `-mb-px` en cada enlace: ese
          píxel de más desbordaba el `ul` (con overflow-x-auto, también scrollea en vertical) y,
          en Windows, la barra vertical le quitaba ancho y sacaba además la horizontal. Así el
          scroll lateral solo aparece si las pestañas de verdad no caben. Con colores forzados no
          hay sombras: ahí vuelve el borde. El anillo de foco va por dentro (`ring-inset`): por fuera
          lo recortaba el mismo overflow. */}
      <ul className="flex gap-2 overflow-x-auto shadow-[inset_0_-1px_0_var(--color-border)] forced-colors:border-b">
        {secciones.map(({ href, nombre }) => {
          const actual = ruta === href;
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={actual ? "page" : undefined}
                className={cn(
                  "flex h-11 min-w-11 items-center justify-center border-b-2 px-2 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring rounded-t-md",
                  actual
                    ? cn("border-success text-foreground", ACTIVO)
                    : "border-transparent text-muted-foreground hover:text-foreground forced-colors:border-transparent",
                )}
              >
                {nombre}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
