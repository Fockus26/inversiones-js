"use client";

import {
  FileTextIcon,
  InboxIcon,
  SmartphoneIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ACTIVO } from "./estilos";

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
  {
    href: "/solicitudes",
    nombre: "Solicitudes",
    corto: "Solicitudes",
    icono: InboxIcon,
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
      <ul className="relative grid grid-cols-4 gap-1 rounded-xl border bg-muted p-1 sm:inline-grid sm:w-auto">
        {/* Fondo de la pestaña activa: se desliza de una a otra (columnas iguales, gap de 0,25 rem). */}
        {indice >= 0 && (
          <li
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-1 left-1 rounded-lg border border-input bg-card shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{
              // Ancho: el de la barra menos el relleno (0,5 rem) y los huecos, entre las pestañas.
              width: `calc((100% - ${0.5 + (SECCIONES.length - 1) * 0.25}rem) / ${SECCIONES.length})`,
              transform: `translateX(calc(${indice} * (100% + 0.25rem)))`,
            }}
          />
        )}
        {SECCIONES.map(({ href, nombre, corto, icono: Icono }) => {
          const actual = ruta === href || ruta.startsWith(`${href}/`);
          return (
            // Contenedor solo en móvil: un @container no aporta ancho propio, y desde sm la
            // barra es inline-grid de ancho automático y se encogería con todo encimado.
            <li key={href} className="max-sm:@container">
              <Link
                href={href}
                aria-current={actual ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg px-1 text-center text-xs leading-tight font-medium hyphens-auto sm:text-sm outline-none transition-colors duration-300 focus-visible:ring-3 focus-visible:ring-ring sm:px-4",
                  actual
                    ? cn("text-card-foreground", ACTIVO)
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icono
                  aria-hidden="true"
                  // Sin sitio (pantalla estrecha o letra grande del teléfono) el texto manda.
                  className="size-4 shrink-0 @max-[6rem]:hidden"
                />
                {/* En móvil, «RCV» y letra más chica para que las cuatro quepan; el nombre completo sigue para lectores. */}
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
