"use client";

import { HistoryIcon } from "lucide-react";
import { useId, useRef, useState } from "react";
import { haceCuanto } from "@/components/catalogo/formato";
import { Button } from "@/components/ui/button";
import {
  type Borrador,
  borrarBorrador,
  claveBorrador,
  esSesionTerminada,
  guardarBorrador,
  leerBorrador,
  type TipoBorrador,
} from "@/lib/borrador";
import { cn } from "@/lib/utils";

/**
 * Borrador de un diálogo de edición (`lib/borrador.ts`). Los diálogos montan su formulario al
 * abrirse y solo en el cliente, así que se lee en el primer render sin riesgo de hidratación.
 */
export function useBorrador<T>(
  tipo: TipoBorrador,
  id: string | null,
  molde: T,
) {
  const clave = claveBorrador(tipo, id);
  const [pendiente, setPendiente] = useState<Borrador<T> | null>(() =>
    leerBorrador(clave, molde),
  );
  return {
    /** Lo que quedó sin guardar la última vez, si hay. */
    pendiente,
    /** Tras un fallo al guardar: si fue porque la sesión terminó, conserva lo escrito. */
    alFallar(error: unknown, valor: T) {
      if (esSesionTerminada(error)) guardarBorrador(clave, valor);
    },
    /** Se recuperó o se descartó, o se guardó bien: ya no hace falta. */
    olvidar() {
      borrarBorrador(clave);
      setPendiente(null);
    },
  };
}

/**
 * Franja al principio del formulario que ofrece lo escrito antes de que terminara la sesión.
 * No pisa nada sin que se pida: el formulario abre con lo que hay en la base.
 */
export function AvisoBorrador({
  guardadoEn,
  alRecuperar,
  alDescartar,
}: {
  guardadoEn: number;
  alRecuperar: () => void;
  alDescartar: () => void;
}) {
  const id = useId();
  const ref = useRef<HTMLElement>(null);
  // La franja desaparece al pulsar: el foco pasa antes al primer campo, porque si se quita el
  // botón con el foco dentro, el diálogo se lo queda (no se pierde, pero no sirve para seguir).
  const yLuegoAlPrimerCampo = (accion: () => void) => () => {
    const franja = ref.current;
    const campos = franja
      ?.closest("form")
      ?.querySelectorAll<HTMLElement>("input, textarea, select, button");
    // El primer control que se alcanza con Tab después de la franja (un select de Base UI lleva
    // un <input> oculto sin foco: por eso se filtra por tabIndex y no por tipo).
    const primero = [...(campos ?? [])].find(
      (c) =>
        !franja?.contains(c) &&
        c.tabIndex >= 0 &&
        !c.matches(":disabled, [type=hidden], [aria-hidden=true]") &&
        (franja?.compareDocumentPosition(c) ?? 0) &
          Node.DOCUMENT_POSITION_FOLLOWING,
    );
    primero?.focus();
    accion();
  };
  return (
    <section
      ref={ref}
      aria-labelledby={`${id}-titulo`}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-dashed border-success bg-accent px-3 py-2 text-sm text-accent-foreground"
    >
      <HistoryIcon aria-hidden="true" className="size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <h3 id={`${id}-titulo`} className="font-semibold">
          Tienes cambios sin guardar
        </h3>
        <p id={`${id}-texto`}>
          Los escribiste {haceCuanto(new Date(guardadoEn))}, antes de que
          terminara tu sesión. Recupéralos para revisarlos y guardarlos.
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          aria-describedby={`${id}-titulo ${id}-texto`}
          className={cn("h-11 px-3")}
          onClick={yLuegoAlPrimerCampo(alDescartar)}
        >
          Descartar
        </Button>
        {/* Ninguno en primario: una acción dentro de un aviso no usa ese color (DESIGN_RULES). */}
        <Button
          type="button"
          variant="outline"
          aria-describedby={`${id}-titulo ${id}-texto`}
          className={cn("h-11 px-3 font-semibold")}
          onClick={yLuegoAlPrimerCampo(alRecuperar)}
        >
          Recuperar
        </Button>
      </div>
    </section>
  );
}
