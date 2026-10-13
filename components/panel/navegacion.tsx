"use client";

import { FileTextIcon, SmartphoneIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FOCO } from "@/components/catalogo/formato";
import { cn } from "@/lib/utils";

const SECCIONES = [
  {
    href: "/productos",
    nombre: "Celulares",
    corto: "Celulares",
    icono: SmartphoneIcon,
  },
  { href: "/rcv", nombre: "Póliza RCV", corto: "RCV", icono: FileTextIcon },
  {
    href: "/clientes",
    nombre: "Clientes",
    corto: "Clientes",
    icono: UsersIcon,
  },
] as const;

/** Pestañas entre las secciones del panel. En móvil reparten el ancho a partes iguales. */
export function Navegacion() {
  const ruta = usePathname();
  const indice = SECCIONES.findIndex(
    ({ href }) => ruta === href || ruta.startsWith(`${href}/`),
  );
  return (
    <nav aria-label="Secciones del panel" className="mb-6">
      <ul className="relative grid grid-cols-3 gap-1 rounded-xl border bg-muted p-1 sm:inline-grid sm:w-auto">
        {/* Fondo de la pestaña activa: se desliza de una a otra (3 columnas iguales, gap de 0,25 rem). */}
        {indice >= 0 && (
          <li
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-1 left-1 w-[calc((100%-1rem)/3)] rounded-lg bg-card shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{
              transform: `translateX(calc(${indice} * (100% + 0.25rem)))`,
            }}
          />
        )}
        {SECCIONES.map(({ href, nombre, corto, icono: Icono }) => {
          const actual = ruta === href || ruta.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={actual ? "page" : undefined}
                className={cn(
                  "relative flex h-11 items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium outline-none transition-colors duration-300 focus-visible:ring-3 focus-visible:ring-ring sm:px-4",
                  actual
                    ? "text-card-foreground"
                    : "text-muted-foreground hover:text-foreground",
                  FOCO,
                )}
              >
                <Icono
                  aria-hidden="true"
                  className="size-4 shrink-0 max-[360px]:hidden"
                />
                {/* En móvil, «RCV» para que las tres quepan a 320 px; el nombre completo sigue para lectores. */}
                {corto === nombre ? (
                  nombre
                ) : (
                  <>
                    <span className="sm:hidden" aria-hidden="true">
                      {corto}
                    </span>
                    <span className="max-sm:sr-only">{nombre}</span>
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
