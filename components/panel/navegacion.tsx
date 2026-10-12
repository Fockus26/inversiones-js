"use client";

import { FileTextIcon, SmartphoneIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FOCO } from "@/components/catalogo/formato";
import { cn } from "@/lib/utils";

const SECCIONES = [
  { href: "/productos", nombre: "Celulares", icono: SmartphoneIcon },
  { href: "/rcv", nombre: "Póliza RCV", icono: FileTextIcon },
] as const;

/** Pestañas entre las secciones del panel. En móvil reparten el ancho a partes iguales. */
export function Navegacion() {
  const ruta = usePathname();
  return (
    <nav aria-label="Secciones del panel" className="mb-6">
      <ul className="grid grid-cols-2 gap-1 rounded-xl border bg-muted p-1 sm:inline-grid sm:w-auto">
        {SECCIONES.map(({ href, nombre, icono: Icono }) => {
          const actual = ruta === href || ruta.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={actual ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring",
                  actual
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                  FOCO,
                )}
              >
                <Icono aria-hidden="true" className="size-4" />
                {nombre}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
