"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Plantilla de las pantallas de estado (404, 500) del HANDOFF §1: cabecera mínima en tinta,
 * etiqueta con ícono + texto (el estado nunca va solo por color), título, una línea y acciones.
 * En móvil el bloque va arriba y los botones ocupan el ancho; desde `md` se centra en la página.
 */

/** Botón de las pantallas de estado: 48 px de alto, anillo de foco a opacidad completa. */
export const BOTON_ESTADO =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-5 text-base font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:w-auto";
export const BOTON_ESTADO_PRINCIPAL = cn(
  BOTON_ESTADO,
  "bg-primary text-primary-foreground hover:bg-primary/85",
);
export const BOTON_ESTADO_SECUNDARIO = cn(
  BOTON_ESTADO,
  "border border-input bg-transparent text-foreground hover:bg-muted",
);

export function PantallaEstado({
  icono: Icono,
  etiqueta,
  titulo,
  linea,
  children,
  acciones,
  enfocarTitulo = false,
}: {
  icono: LucideIcon;
  etiqueta: string;
  titulo: string;
  linea: string;
  /** Bloque opcional entre la línea y las acciones (código de soporte, lista…). */
  children?: React.ReactNode;
  acciones: React.ReactNode;
  /** En un error el foco va al título, para que el lector de pantalla lo anuncie al llegar. */
  enfocarTitulo?: boolean;
}) {
  const tituloRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (enfocarTitulo) tituloRef.current?.focus();
  }, [enfocarTitulo]);
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background text-foreground">
      <header className="flex h-14 items-center bg-sidebar px-4 text-sidebar-foreground md:h-16 md:px-10">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2.5 rounded-md font-semibold outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring"
        >
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center gap-0.5 rounded-lg bg-sidebar-primary text-sm font-extrabold text-sidebar-primary-foreground selection:bg-sidebar-primary-foreground selection:text-sidebar-primary"
          >
            <span className="h-3 w-0.5 rounded-full bg-sidebar-primary-foreground" />
            JS
          </span>
          Inversiones JS
        </Link>
      </header>
      <main
        id="contenido"
        className="flex flex-1 items-start justify-center px-4 pt-12 pb-8 md:items-center md:px-10 md:py-16"
      >
        <div className="flex w-full max-w-xl flex-col gap-4">
          <p className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-muted px-3 py-1.5 text-sm font-semibold">
            <Icono aria-hidden="true" className="size-4" />
            {etiqueta}
          </p>
          <h1
            ref={tituloRef}
            tabIndex={enfocarTitulo ? -1 : undefined}
            className="mt-2 text-3xl outline-none wrap-anywhere hyphens-auto leading-tight font-extrabold tracking-tight md:text-5xl md:leading-tight"
          >
            {titulo}
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
            {linea}
          </p>
          {children}
          <div className="mt-2 flex flex-col gap-3 md:flex-row">{acciones}</div>
        </div>
      </main>
    </div>
  );
}
