"use client";

import { FlaskConicalIcon, XIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { FOCO } from "@/components/catalogo/formato";
import { Button } from "@/components/ui/button";
import { modoDemo, salirDeDemo } from "@/lib/financiamiento/demo";
import { cn } from "@/lib/utils";

const sinSuscripcion = () => () => {};

/** Franja del modo demo (D037): deja claro que lo de Clientes es de ejemplo y no se guarda. */
export function AvisoDemo() {
  const activo = useSyncExternalStore(sinSuscripcion, modoDemo, () => false);
  if (!activo) return null;
  return (
    <aside
      aria-label="Modo demostración"
      className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-dashed border-success bg-accent px-3 py-2 text-sm text-accent-foreground"
    >
      <FlaskConicalIcon aria-hidden="true" className="size-4 shrink-0" />
      <p className="min-w-0 flex-1">
        <strong>Modo demostración.</strong> En «Clientes» ves datos de ejemplo:
        puedes probar todo, pero nada se guarda y al recargar vuelve al ejemplo.
        Celulares y Póliza RCV muestran los datos reales.
      </p>
      <Button
        variant="outline"
        className={cn("h-11 px-3", FOCO)}
        onClick={salirDeDemo}
      >
        <XIcon aria-hidden="true" />
        Salir de la demo
      </Button>
    </aside>
  );
}
