"use client";

import { LogOutIcon } from "lucide-react";
import { useState } from "react";
import { SelectorTema } from "@/components/panel/tema";
import { BotonAvisos, BotonInstalar } from "@/components/pwa/boton-avisos";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Sobre la tinta el foco va en amarillo (≈11:1); el verde azulado no llega a 3:1 aquí.
const BOTON_SOBRE_TINTA =
  "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:bg-sidebar-accent focus-visible:border-sidebar-ring focus-visible:ring-sidebar-ring aria-expanded:bg-sidebar-accent aria-expanded:text-sidebar-accent-foreground";

function Marca() {
  return (
    <span className="flex shrink-0 items-center gap-2 text-base font-semibold tracking-tight">
      <span
        aria-hidden="true"
        className="h-6 w-1.5 rounded-full bg-sidebar-primary"
      />
      {/* En móvil solo el sello "JS"; el nombre completo sigue para lectores de pantalla. */}
      <span>
        <span className="max-sm:sr-only">Inversiones </span>
        <span className="rounded-md bg-sidebar-primary px-1.5 py-0.5 text-sidebar-primary-foreground">
          JS
        </span>
      </span>
    </span>
  );
}

/**
 * Cabecera del panel: marca, correo de quien entró, instalar app, avisos de citas (D035), tema
 * y "Cerrar sesión" (D013).
 * En móvil el correo baja a una segunda línea truncada para que nada desborde a 320 px.
 */
export function Cabecera({
  correo,
  onSalir,
}: {
  correo: string;
  onSalir: () => Promise<void>;
}) {
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    if (saliendo) return;
    setSaliendo(true);
    try {
      await onSalir();
    } catch {
      setSaliendo(false);
    }
  }

  return (
    <header className="bg-sidebar text-sidebar-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <a
        href="#contenido"
        className="sr-only rounded-md bg-sidebar-primary px-3 py-2 text-sidebar-primary-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        Saltar al contenido
      </a>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
        <Marca />
        <p
          className="order-3 min-w-0 basis-full truncate pb-1 text-xs text-sidebar-foreground/80 sm:order-2 sm:basis-auto sm:flex-1 sm:pb-0 sm:text-right sm:text-sm"
          title={correo}
        >
          <span className="sr-only">Sesión iniciada como </span>
          {correo}
        </p>
        <div className="order-2 ml-auto flex items-center gap-1 sm:order-3 sm:ml-0">
          <BotonInstalar className={BOTON_SOBRE_TINTA} />
          <BotonAvisos className={BOTON_SOBRE_TINTA} />
          <SelectorTema className={BOTON_SOBRE_TINTA} />
          <Button
            variant="ghost"
            className={`h-11 px-3 ${BOTON_SOBRE_TINTA}`}
            onClick={salir}
            disabled={saliendo}
          >
            <LogOutIcon aria-hidden="true" className="size-5" />
            {/* En pantallas muy estrechas queda solo el ícono; el nombre sigue para lectores. */}
            <span className="max-[400px]:sr-only">
              {saliendo ? "Saliendo…" : "Cerrar sesión"}
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}

/** Misma silueta que la cabecera mientras se comprueba la sesión. */
export function CabeceraEsqueleto() {
  return (
    <div aria-hidden="true" className="bg-sidebar text-sidebar-foreground">
      <div className="mx-auto flex h-15 w-full max-w-6xl items-center gap-3 px-4">
        <Marca />
        <Skeleton className="ml-auto h-8 w-32 bg-sidebar-accent" />
      </div>
    </div>
  );
}
