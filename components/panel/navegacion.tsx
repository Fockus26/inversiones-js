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
  const indice = SECCIONES.findIndex(
    ({ href }) => ruta === href || ruta.startsWith(`${href}/`),
  );
  return (
    <nav aria-label="Secciones del panel" className="mb-6">
      <ul className="relative grid grid-cols-2 gap-1 rounded-xl border bg-muted p-1 sm:inline-grid sm:w-auto">
        {/* Fondo de la pestaña activa: se desliza de una a otra (columnas iguales, gap de 0,25 rem). */}
        {indice >= 0 && (
          <li
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.375rem)] rounded-lg bg-card shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{
              transform: `translateX(calc(${indice} * (100% + 0.25rem)))`,
            }}
          />
        )}
        {SECCIONES.map(({ href, nombre, icono: Icono }) => {
          const actual = ruta === href || ruta.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={actual ? "page" : undefined}
                className={cn(
                  "relative flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium outline-none transition-colors duration-300 focus-visible:ring-3 focus-visible:ring-ring",
                  actual
                    ? "text-card-foreground"
                    : "text-muted-foreground hover:text-foreground",
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
