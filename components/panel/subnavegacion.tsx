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
      <ul className="flex gap-6 overflow-x-auto border-b">
        {secciones.map(({ href, nombre }) => {
          const actual = ruta === href;
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={actual ? "page" : undefined}
                className={cn(
                  "-mb-px flex h-11 min-w-11 items-center justify-center border-b-2 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring rounded-t-md",
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
