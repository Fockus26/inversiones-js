"use client";

import { CheckIcon, CopyIcon, TriangleAlertIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  BOTON_ESTADO_PRINCIPAL,
  BOTON_ESTADO_SECUNDARIO,
  PantallaEstado,
} from "@/components/estado/pantalla-estado";
import { cn } from "@/lib/utils";

/**
 * 500 del HANDOFF §1. Con `codigo` (el `digest` de Next) muestra el código para soporte y
 * "Copiar código"; sin él, la variante corta. "Ir al inicio" es un <a> normal: recarga entera,
 * por si el fallo dejó el estado del cliente roto.
 */
export function ErrorServidor({
  codigo,
  onReintentar,
}: {
  codigo?: string;
  onReintentar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  async function copiar() {
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el código sigue visible y se selecciona entero al tocarlo.
    }
  }

  return (
    <PantallaEstado
      icono={TriangleAlertIcon}
      etiqueta="Error 500"
      titulo="Algo falló de nuestro lado"
      linea={
        codigo
          ? "No es tu culpa. Vuelve a intentarlo; si se repite, envíale este código a soporte."
          : "No es tu culpa. Espera unos segundos y vuelve a intentarlo."
      }
      acciones={
        <>
          <button
            type="button"
            onClick={onReintentar}
            className={BOTON_ESTADO_PRINCIPAL}
          >
            Reintentar
          </button>
          <a href="/" className={BOTON_ESTADO_SECUNDARIO}>
            Ir al inicio
          </a>
        </>
      }
    >
      {codigo && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3.5">
          <div className="flex min-w-0 flex-col gap-0.5">
            {/* La etiqueta va justo antes en el orden de lectura: no hace falta ARIA. */}
            <span className="text-[13px] text-muted-foreground">
              Código para soporte
            </span>
            <code className="font-mono text-[17px] font-medium tracking-wide break-all select-all">
              {codigo}
            </code>
          </div>
          <button
            type="button"
            onClick={copiar}
            className={cn(
              BOTON_ESTADO_SECUNDARIO,
              "min-h-11 w-auto px-3.5 text-[15px] md:w-auto",
            )}
          >
            {copiado ? (
              <CheckIcon aria-hidden="true" className="size-4" />
            ) : (
              <CopyIcon aria-hidden="true" className="size-4" />
            )}
            <span aria-live="polite">
              {copiado ? "Copiado" : "Copiar código"}
            </span>
          </button>
        </div>
      )}
    </PantallaEstado>
  );
}
